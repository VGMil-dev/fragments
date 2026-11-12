import { DatabaseSync } from "node:sqlite";
import { APICallError } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { SqliteAiBudgetLedger } from "./budget-ledger.js";
import { createGatewayMentorEvaluator } from "./gateway-mentor-evaluator.js";
import { MentorEvaluationFailure } from "../../features/mentor/service.js";

const databases: DatabaseSync[] = [];
function makeLedger(limit = 1_000_000) {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  migrate(database);
  return new SqliteAiBudgetLedger(database, limit);
}
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

const proposal = {
  title: "Huerto de aula",
  problem: "El curso no puede registrar el crecimiento de sus plantas en un sitio común.",
  solution: "Una aplicación permite registrar medidas y consultar el progreso semanal.",
  goals: ["Registrar medidas"],
  skills: ["TypeScript"],
  scope: "Una pantalla registra y consulta las medidas del cultivo.",
  constraints: ["No recopila datos personales"],
};
const generated = {
  findings: [{ criterionId: "scope", status: "verified" as const, evidence: [{ field: "scope" }], reason: "El alcance describe dos acciones observables.", guidanceLevel: 1 }],
  limitations: ["La evaluación es orientativa."],
  guidance: ["¿Qué mostrarás en la primera demostración?"] ,
};
const evaluationInput = {
  proposal,
  proposalDigest: "a".repeat(64),
  config: { subject: "Materia", theme: "Huerto", assignment: "Diseña", requirements: [], expectedLevel: "Inicial", rubricTitle: "Rúbrica", criteria: [{ id: "scope", title: "Alcance", description: "Observable", weight: 100 }] },
  contextVersion: 2,
};

describe("Gateway Mentor evaluator (labelled offline generation)", () => {
  it("validates structured feedback, adds local evidence digest, and settles the cost receipt", async () => {
    const generate = vi.fn(async ({ modelId }: { modelId: string }) => ({ value: generated, costUsd: 0.0004 }));
    const ledger = makeLedger();
    const evaluator = createGatewayMentorEvaluator({
      modelId: "fixture/model",
      gatewayKeyConfigured: true,
      rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      ledger,
      generate,
    });

    const result = await evaluator.evaluate(evaluationInput);

    expect(generate).toHaveBeenCalledOnce();
    expect(generate.mock.calls[0]?.[0].modelId).toBe("fixture/model");
    expect(result).toMatchObject({
      modelId: "fixture/model",
      inputDigest: "a".repeat(64),
      findings: [{ evidence: [{ source: "proposal", field: "scope", digest: "a".repeat(64) }] }],
      guidance: ["¿Qué mostrarás en la primera demostración?"],
    });
    expect(ledger.summary()).toMatchObject({ settledMicroUsd: 400, blocked: false });
  });

  it("blocks provider dispatch when a previous dispatch has uncertain cost", async () => {
    const generate = vi.fn(async () => ({ value: generated, costUsd: 0.0004 }));
    const ledger = makeLedger(1_000);
    const database = databases.at(-1)!;
    database.prepare(`INSERT INTO ai_budget_reservations
      (id, request_kind, reserved_microusd, actual_microusd, status, created_at, updated_at)
      VALUES (?, ?, ?, NULL, 'uncertain', ?, ?)`)
      .run("uncertain-mentor", "mentor", 200, Date.now(), Date.now());
    const evaluator = createGatewayMentorEvaluator({
      modelId: "fixture/model",
      gatewayKeyConfigured: true,
      rates: { inputUsdPerMillion: 0.03, outputUsdPerMillion: 0.13 },
      ledger,
      generate,
    });

    let failure: unknown;
    try { await evaluator.evaluate(evaluationInput); } catch (error) { failure = error; }

    expect(failure).toBeInstanceOf(MentorEvaluationFailure);
    expect(failure).toMatchObject({ stage: "budget_reservation", errorType: "AiBudgetUnavailableError", providerHttpStatus: null });
    expect(generate).not.toHaveBeenCalled();
    expect(ledger.summary()).toMatchObject({ reservedMicroUsd: 200, blocked: true });
  });

  it("captures safe provider status and Retry-After, then refuses a duplicate dispatch after an uncertain result", async () => {
    const providerError = new APICallError({
      message: "private request context",
      url: "https://gateway.invalid/v1",
      requestBodyValues: { prompt: "private prompt" },
      statusCode: 429,
      responseHeaders: { "Retry-After": "2" },
      responseBody: JSON.stringify({ error: { code: "rate_limited", message: "private provider detail" } }),
      isRetryable: true,
    });
    const generate = vi.fn(async () => { throw providerError; });
    const ledger = makeLedger();
    const evaluator = createGatewayMentorEvaluator({
      modelId: "fixture/model",
      gatewayKeyConfigured: true,
      rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      ledger,
      generate,
    });

    let firstFailure: unknown;
    try { await evaluator.evaluate(evaluationInput); } catch (error) { firstFailure = error; }
    let retryFailure: unknown;
    try { await evaluator.evaluate(evaluationInput); } catch (error) { retryFailure = error; }

    expect(firstFailure).toMatchObject({ stage: "provider_request", providerHttpStatus: 429, providerCode: "rate_limited", retryAfterMs: 2_000 });
    expect(retryFailure).toMatchObject({ stage: "budget_reservation", errorType: "AiBudgetUnavailableError" });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary().blocked).toBe(true);
    expect(JSON.stringify(firstFailure)).not.toContain("private request context");
    expect(JSON.stringify(firstFailure)).not.toContain("private prompt");
    expect(JSON.stringify(firstFailure)).not.toContain("private provider detail");
  });

  it("uses the minimum ledger reservation when model pricing is unavailable", async () => {
    const generate = vi.fn(async () => ({ value: generated, costUsd: 0 }));
    const ledger = makeLedger();
    const evaluator = createGatewayMentorEvaluator({ modelId: "fixture/model", gatewayKeyConfigured: true, ledger, generate });
    await expect(evaluator.evaluate({ proposal, proposalDigest: "b".repeat(64), config: { subject: "Materia", theme: "Huerto", assignment: "Diseña", requirements: [], expectedLevel: "Inicial", rubricTitle: "Rúbrica", criteria: [{ id: "scope", title: "Alcance", description: "Observable", weight: 100 }] }, contextVersion: 1 })).resolves.toMatchObject({ modelId: "fixture/model" });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ settledMicroUsd: 0, reservedMicroUsd: 0, blocked: false });
  });
});
