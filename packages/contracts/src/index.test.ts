import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AiAnalysisSchema,
  ApiResultSchema,
  EvidenceReferenceSchema,
  FeedbackFindingSchema,
  InspectorChallengePublicSchema,
  InspectorChallengeSchema,
  RepositorySnapshotSchema,
  SubmissionSnapshotSchema,
} from "./index.js";

const digest = "a".repeat(64);

describe("shared API contracts", () => {
  it("accepts both standard API result variants", () => {
    const resultSchema = ApiResultSchema(z.object({ id: z.string() }));
    const success = resultSchema.safeParse({
      ok: true,
      data: { id: "p-1" },
    });
    const failure = resultSchema.safeParse({
      ok: false,
      error: { code: "NOT_FOUND", message: "No existe." },
    });

    expect(success.success).toBe(true);
    expect(failure.success).toBe(true);
  });

  it("rejects malformed API errors", () => {
    const result = ApiResultSchema(z.object({ id: z.string() })).safeParse({
      ok: false,
      error: { code: "", message: "No existe." },
    });

    expect(result.success).toBe(false);
  });

  it("validates evidence paths and line ranges in feedback findings", () => {
    expect(
      FeedbackFindingSchema.safeParse({
        criterionId: "correctness",
        status: "verified",
        evidence: [{ source: "repository", path: "src/index.ts", lines: [4, 8], digest }],
        file: "src/index.ts",
        lines: [4, 8],
        reason: "La ruta valida la entrada antes de usarla.",
        guidanceLevel: 1,
      }).success,
    ).toBe(true);

    expect(
      FeedbackFindingSchema.safeParse({
        criterionId: "correctness",
        status: "verified",
        evidence: [{ source: "repository", path: "src/index.ts", lines: [8, 4], digest }],
        file: "../secrets.txt",
        lines: [8, 4],
        reason: "Sin evidencia válida.",
        guidanceLevel: 1,
      }).success,
    ).toBe(false);
  });

  it("requires a source reference for each evidence record", () => {
    expect(
      EvidenceReferenceSchema.safeParse({
        source: "proposal",
        field: "goals",
        digest,
      }).success,
    ).toBe(true);
    expect(
      EvidenceReferenceSchema.safeParse({ source: "proposal", field: "goals" }).success,
    ).toBe(false);
  });

  it("accepts a repository snapshot tied to an exact commit and content digest", () => {
    const result = RepositorySnapshotSchema.safeParse({
      owner: "student",
      repo: "demo",
      commitSha: "b".repeat(40),
      files: [{ path: "src/index.ts", content: "export {};", sha: "c".repeat(40) }],
      digest,
    });

    expect(result.success).toBe(true);
  });

  it("rejects unsafe paths and incomplete commit identifiers", () => {
    const result = RepositorySnapshotSchema.safeParse({
      owner: "student",
      repo: "demo",
      commitSha: "main",
      files: [{ path: "../../.env", content: "x", sha: "short" }],
      digest,
    });

    expect(result.success).toBe(false);
  });

  it("requires evidence-backed analysis findings", () => {
    const valid = AiAnalysisSchema.safeParse({
      rubricVersion: "1.0.0",
      score: 75,
      findings: [
        {
          criterionId: "correctness",
          status: "verified",
          evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 2], digest }],
          file: "src/index.ts",
          lines: [1, 2],
          reason: "La función devuelve el resultado esperado.",
          guidanceLevel: 1,
        },
      ],
      limitations: [],
      modelId: "provider/model",
      inputDigest: digest,
    });
    const ungrounded = AiAnalysisSchema.safeParse({
      rubricVersion: "1.0.0",
      score: 75,
      findings: [
        {
          criterionId: "correctness",
          status: "verified",
          reason: "Sin referencia.",
          guidanceLevel: 1,
        },
      ],
      limitations: [],
      modelId: "provider/model",
      inputDigest: "not-a-digest",
    });

    expect(valid.success).toBe(true);
    expect(ungrounded.success).toBe(false);
  });

  it("keeps the teacher hint out of the student challenge contract", () => {
    const challenge = {
      evaluationId: "review-1",
      sourceEvidence: [
        { source: "repository", path: "src/index.ts", lines: [1, 2], digest },
      ],
      precondition: "El cálculo devuelve el resultado documentado.",
      mutation: "Cambia temporalmente el operador de comparación.",
      demonstration: "Muestra la regresión con la prueba existente.",
      restoration: "Restaura el operador original y ejecuta la prueba.",
      estimatedMinutes: 10,
      teacherHint: "Guía privada del docente.",
    };

    expect(InspectorChallengeSchema.safeParse(challenge).success).toBe(true);
    expect(InspectorChallengePublicSchema.safeParse(challenge).success).toBe(false);
  });

  it("validates immutable submission snapshots and verification tokens", () => {
    const result = SubmissionSnapshotSchema.safeParse({
      kind: "mentor",
      sourceId: "project-1",
      score: 82,
      snapshotJson: { title: "Un proyecto", note: "Orientación formativa" },
      contentHash: digest,
      verificationCode: "verify_123456789012345678901234",
      rubricVersion: "1.0.0",
      createdAt: "2026-11-04T12:00:00.000Z",
    });

    expect(result.success).toBe(true);
  });
});
