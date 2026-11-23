import { describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createMentorHttp } from "./http.js";
import { safeOperationalEvent } from "./operational-events.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createMentorService, MentorEvaluationFailure, type MentorEvaluator } from "./service.js";

const proposal = {
  title: "Huerto de aula", problem: "El curso necesita registrar el crecimiento de las plantas.",
  solution: "Una bitácora permite anotar riegos y comparar el crecimiento de cada planta.",
  description: "Una bitácora para registrar y consultar el crecimiento de cada planta.",
  purpose: "Ayudar al curso a observar cambios en su huerto.", goals: ["Registrar riegos"], skills: [],
  mentorSkills: { classroomId: null, selectedSkillIds: [] }, scope: "Una pantalla registra plantas y medidas.", constraints: ["Funciona sin conexión"],
};

const mentorConfig = {
  subject: "Proyectos estudiantiles", theme: "Idea de proyecto", assignment: "Describe un problema, una solución inicial y un alcance que puedas demostrar.",
  requirements: ["Propón una primera versión pequeña y comprobable."], expectedLevel: "Estudiante que inicia su proyecto", rubricTitle: "Propuesta inicial",
  criteria: [
    { id: "problem", title: "Problema claro", description: "Explica a quién le ocurre y qué necesita resolver.", weight: 25 },
    { id: "solution", title: "Solución relacionada", description: "La idea responde al problema descrito.", weight: 20 },
    { id: "scope", title: "Alcance de MVP", description: "La primera versión cabe en el tiempo y nivel indicados.", weight: 25 },
    { id: "goals", title: "Objetivos comprobables", description: "Se puede observar o comprobar si cada objetivo se logró.", weight: 15 },
    { id: "feasibility", title: "Viabilidad inicial", description: "Las herramientas y condiciones descritas permiten empezar.", weight: 15 },
  ],
};

async function sendEvaluation(evaluator: MentorEvaluator, logEvent: (event: unknown) => void) {
  let savedEvaluation: Record<string, unknown> | null = null;
  const evaluationModel = {
    async findFirst() { return savedEvaluation; },
    async createMany({ data }: { data: Array<Record<string, unknown>> }) { savedEvaluation = data[0]!; },
  };
  const database = {
    proposal: { async findFirst() { return { id: "proposal-secret", version: 1, proposalJson: proposal, assignmentVersionId: null, updatedAt: new Date("2026-11-22T00:00:00.000Z") }; } },
    mentorControlVersion: { async findFirst() { return { version: 1, configJson: mentorConfig, publishedAt: new Date("2026-11-21T00:00:00.000Z") }; }, async findUnique() { return null; } },
    mentorAcademicPublication: { async findMany() { return []; } },
    mentorEvaluation: evaluationModel,
    $transaction: async (fn: (tx: Record<string, unknown>) => unknown) => fn({
      mentorEvaluation: evaluationModel,
      proposal: { async findFirst() { return null; } },
      proposalRevision: { async findUnique() { return null; } },
      mentorControlVersion: { async findUnique() { return null; } },
    }),
  } as unknown as PrismaClient;
  const service = createMentorService({ evaluator, pdf: createMinimalPdfRenderer() });
  const auth = { async student() { return { id: "student-secret" }; } } as unknown as FragmentsAuthService;
  const server: Server = createServer(createMentorHttp(database, service, { auth, logEvent }));
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/proposals/proposal-secret/review`, { method: "POST" });
    return { response, body: await response.json() as Record<string, unknown> };
  } finally {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

describe("Mentor operational event allowlist", () => {
  it("emits success and failure events through the HTTP handler with a fake Mentor evaluator", async () => {
    const events: unknown[] = [];
    const local = createLocalMentorEvaluator();
    const success = await sendEvaluation({ async evaluate(input) { return local.evaluate(input); } }, (event) => events.push(event));
    expect(success.response.status).toBe(200);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none" });

    const failure = await sendEvaluation({ async evaluate() { throw new MentorEvaluationFailure({ stage: "budget_reservation", errorType: "StudentSecretError" }); } }, (event) => events.push(event));
    expect(failure.response.status).toBe(503);
    expect(events).toHaveLength(2);
    expect(events[1]).toMatchObject({ event: "mentor_evaluation_failed", stage: "budget_reservation", result: "failure", error_code: "budget_unavailable" });
    expect(JSON.stringify(events)).not.toMatch(/StudentSecretError|proposal-secret|student-secret|provider|prompt|score/);
  });

  it("keeps the route result when the event writer throws", async () => {
    const local = createLocalMentorEvaluator();
    const result = await sendEvaluation({ async evaluate(input) { return local.evaluate(input); } }, () => { throw new Error("private sink failure"); });
    expect(result.response.status).toBe(200);
  });

  it("keeps the default failure diagnostic redacted and preserves safe failure stages", async () => {
    const errorOutput: unknown[][] = [];
    const errorSpy = vi.spyOn(console, "error").mockImplementation((...args) => { errorOutput.push(args); });
    const events: unknown[] = [];
    try {
      const result = await sendEvaluation({ async evaluate() {
        throw new MentorEvaluationFailure({ stage: "response_validation", errorType: "SecretProviderError", providerCode: "private-provider-code", gatewayGenerationId: "private-generation-id" });
      } }, (event) => events.push(event));
      expect(result.response.status).toBe(503);
      expect(events[0]).toMatchObject({ stage: "response_validation", error_code: "response_validation_failed" });
      expect(errorOutput).toHaveLength(1);
      const fallback = JSON.parse(String(errorOutput[0]![0])) as Record<string, unknown>;
      expect(fallback).toMatchObject({ event: "mentor_evaluation_failed", stage: "response_validation", result: "failure", error_code: "response_validation_failed" });
      expect(Object.keys(fallback).sort()).toEqual(["duration_ms", "error_code", "event", "occurred_at", "result", "stage"]);
      expect(JSON.stringify(fallback)).not.toMatch(/SecretProviderError|private-provider-code|private-generation-id/);
    } finally {
      errorSpy.mockRestore();
    }
  });

  it("drops unexpected fields and clamps duration while producing a canonical timestamp", () => {
    const event = safeOperationalEvent({
      event: "mentor_evaluation_completed",
      stage: "provider_request",
      result: "success",
      error_code: "none",
      duration_ms: 900_000,
      proposalId: "student-secret",
      score: 99,
      prompt: "private prompt",
      provider: "private-provider",
    } as Parameters<typeof safeOperationalEvent>[0]);

    expect(event).toEqual({
      event: "mentor_evaluation_completed",
      stage: "provider_request",
      result: "success",
      error_code: "none",
      duration_ms: 300_000,
      occurred_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/),
    });
    expect(JSON.stringify(event)).not.toMatch(/student-secret|prompt|private-provider|score/);
  });

  it("bounds negative and non-finite durations and rejects unrecognized stage and code values", () => {
    const negative = safeOperationalEvent({ event: "mentor_evaluation_failed", stage: "arbitrary", result: "failure", error_code: "arbitrary", duration_ms: -10 } as Parameters<typeof safeOperationalEvent>[0]);
    const infinite = safeOperationalEvent({ event: "mentor_evaluation_failed", stage: "evaluation", result: "failure", error_code: "evaluation_failed", duration_ms: Infinity });
    expect(negative).toMatchObject({ stage: "evaluation", error_code: "evaluation_failed", duration_ms: 0 });
    expect(infinite.duration_ms).toBe(300_000);
  });
});
