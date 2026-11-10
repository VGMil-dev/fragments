import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  AiAnalysisSchema,
  MentorControlConfigSchema,
  MentorPublishedConfigSchema,
  MentorCriterionBreakdownSchema,
  ApiResultSchema,
  CreateMentorSubmissionRequestSchema,
  CreateProposalRequestSchema,
  GalleryOptInRequestSchema,
  CreateReviewSubmissionRequestSchema,
  EvidenceReferenceSchema,
  GalleryEntrySchema,
  GalleryResponseSchema,
  FeedbackFindingSchema,
  InspectorChallengePublicSchema,
  InspectorChallengeSchema,
  InspectorChallengeRecordResponseSchema,
  InspectorDefenseRecordRequestSchema,
  InspectorStudentChallengeResponseSchema,
  MentorSubmissionResponseSchema,
  ProposalEvaluationResponseSchema,
  ProposalResponseSchema,
  UpdateProposalRequestSchema,
  TeacherLoginRequestSchema,
  TeacherSessionResponseSchema,
  ReviewRequestSchema,
  ReviewResponseSchema,
  ReviewQueuedResponseSchema,
  RepositorySnapshotSchema,
  SubmissionSnapshotSchema,
  VerifySubmissionResponseSchema,
} from "./index.js";

const digest = "a".repeat(64);
const now = "2026-11-04T12:00:00.000Z";

const proposal = {
  title: "Huerto escolar interactivo",
  problem: "El curso no cuenta con una forma sencilla de registrar el crecimiento de sus plantas.",
  solution: "Una aplicación local registra medidas y muestra cómo cambian con el tiempo.",
  goals: ["Registrar medidas semanales", "Comparar el crecimiento por planta"],
  skills: ["TypeScript", "SQLite"],
  scope: "Una pantalla de registro, una tabla local y un resumen visual.",
  constraints: ["Debe funcionar en el laboratorio sin conexión"],
};

const analysis = {
  rubricVersion: "1.0.0",
  score: 78,
  findings: [
    {
      criterionId: "scope",
      status: "verified" as const,
      evidence: [{ source: "proposal" as const, field: "scope", digest }],
      reason: "El alcance cabe en un prototipo formativo.",
      guidanceLevel: 1,
    },
  ],
  limitations: [],
  modelId: "fake/local",
  inputDigest: digest,
};

describe("shared API contracts", () => {
  it("validates teacher login and session responses without exposing session tokens", () => {
    expect(TeacherLoginRequestSchema.safeParse({ email: "teacher@example.test", password: "fake-password" }).success).toBe(true);
    expect(TeacherLoginRequestSchema.safeParse({ email: "invalid", password: "x" }).success).toBe(false);
    expect(TeacherSessionResponseSchema.safeParse({ authenticated: false }).success).toBe(true);
    expect(TeacherSessionResponseSchema.safeParse({ authenticated: true, teacherId: "teacher-1", expiresAt: 10_000 }).success).toBe(true);
    expect(TeacherSessionResponseSchema.safeParse({ authenticated: true, teacherId: "teacher-1", expiresAt: 10_000, token: "secret" }).success).toBe(false);
  });
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

  it("accepts opt-in gallery cards without student or repository identity fields", () => {
    const entry = {
      id: "gallery-1",
      title: "Huerto escolar interactivo",
      summary: "Registra el crecimiento de plantas con una aplicación local.",
      skills: ["TypeScript", "SQLite"],
      tags: ["ciencia", "web"],
      estimatedMinutes: 90,
    };

    expect(GalleryEntrySchema.safeParse(entry).success).toBe(true);
    expect(GalleryResponseSchema.safeParse([entry]).success).toBe(true);
    expect(GalleryEntrySchema.safeParse({ ...entry, studentId: "student-1" }).success).toBe(false);
  });

  it("validates proposal requests and versioned proposal responses", () => {
    expect(CreateProposalRequestSchema.safeParse(proposal).success).toBe(true);
    expect(CreateProposalRequestSchema.safeParse({ ...proposal, goals: [] }).success).toBe(false);
    expect(UpdateProposalRequestSchema.safeParse({ ...proposal, expectedVersion: 2 }).success).toBe(true);
    expect(UpdateProposalRequestSchema.safeParse({ ...proposal, expectedVersion: 0 }).success).toBe(false);
    expect(UpdateProposalRequestSchema.safeParse({ ...proposal, expectedVersion: 2, ownerId: "student-1" }).success).toBe(false);
    expect(GalleryOptInRequestSchema.safeParse({ optIn: true }).success).toBe(true);
    expect(GalleryOptInRequestSchema.safeParse({ optIn: true, studentId: "student-1" }).success).toBe(false);
    expect(
      ProposalResponseSchema.safeParse({ id: "proposal-1", version: 2, proposal, updatedAt: now }).success,
    ).toBe(true);
  });

  it("validates evidence-backed Mentor evaluation and similarity matches", () => {
    const result = ProposalEvaluationResponseSchema.safeParse({
      evaluationId: "evaluation-1",
      proposalId: "proposal-1",
      proposalVersion: 2,
      viability: "feasible",
      analysis,
      guidance: ["¿Qué parte puedes validar primero?"],
      similarityMatches: [
        { galleryId: "gallery-1", title: "Huerto comunitario", reason: "Comparte el seguimiento de plantas." },
      ],
      evaluatedAt: now,
    });

    expect(result.success).toBe(true);
  });

  it("accepts a GitHub owner/repo/commit request and rejects arbitrary repository URLs", () => {
    const request = { owner: "student", repo: "course-project", commitSha: "b".repeat(40) };
    expect(ReviewRequestSchema.safeParse(request).success).toBe(true);
    expect(ReviewRequestSchema.safeParse({ ...request, repositoryUrl: "http://127.0.0.1/secret" }).success).toBe(false);
  });

  it("validates queued and completed Review responses without unsafe exception fields", () => {
    const queued = ReviewQueuedResponseSchema.safeParse({
      id: "review-1",
      owner: "student",
      repo: "course-project",
      commitSha: "b".repeat(40),
      status: "queued",
      createdAt: now,
    });
    const completed = ReviewResponseSchema.safeParse({
      id: "review-1",
      owner: "student",
      repo: "course-project",
      commitSha: "b".repeat(40),
      status: "completed",
      analysis,
      progress: 100,
      updatedAt: now,
    });
    const unsafe = ReviewResponseSchema.safeParse({
      id: "review-1",
      owner: "student",
      repo: "course-project",
      commitSha: "b".repeat(40),
      status: "failed",
      errorStack: "secret-bearing stack trace",
      updatedAt: now,
    });

    expect(queued.success).toBe(true);
    expect(completed.success).toBe(true);
    expect(unsafe.success).toBe(false);
  });

  it("validates submission requests and their shared snapshot response", () => {
    expect(
      CreateMentorSubmissionRequestSchema.safeParse({
        proposalId: "proposal-1",
        proposalVersion: 2,
        evaluationId: "evaluation-1",
      }).success,
    ).toBe(true);
    expect(CreateReviewSubmissionRequestSchema.safeParse({ reviewId: "review-1" }).success).toBe(true);
    const snapshot = {
      id: "submission-1",
      kind: "review",
      sourceId: "review-1",
      score: 78,
      snapshotJson: { commitSha: "b".repeat(40), analysis },
      contentHash: digest,
      verificationCode: "verify_123456789012345678901234",
      rubricVersion: "1.0.0",
      createdAt: now,
    };
    expect(MentorSubmissionResponseSchema.safeParse(snapshot).success).toBe(true);
  });

  it("returns only a minimal integrity verification summary", () => {
    expect(
      VerifySubmissionResponseSchema.safeParse({
        kind: "mentor",
        score: 78,
        rubricVersion: "1.0.0",
        createdAt: now,
        integrityValid: true,
      }).success,
    ).toBe(true);
    expect(
      VerifySubmissionResponseSchema.safeParse({
        kind: "mentor",
        score: 78,
        rubricVersion: "1.0.0",
        createdAt: now,
        integrityValid: true,
        studentName: "Private",
      }).success,
    ).toBe(false);
  });

  it("validates Inspector defense requests and keeps teacher hints out of student responses", () => {
    const record = {
      id: "challenge-1",
      reviewId: "review-1",
      projectId: "project-1",
      commitSha: "b".repeat(40),
      challenge: {
        evaluationId: "review-1",
        sourceEvidence: [{ source: "repository", path: "src/math.ts", lines: [2, 4], digest }],
        precondition: "Existe un acumulador.",
        mutation: "Invierte la condición.",
        demonstration: "Comprueba el resultado anterior.",
        restoration: "Devuelve la condición a su forma original.",
        estimatedMinutes: 15,
        teacherHint: "Revisa el acumulador.",
      },
      status: "pending",
      createdAt: now,
    };
    const assigned = { ...record, status: "assigned" as const, assignedTo: "teacher-1", assignedAt: now };
    const completed = {
      ...assigned,
      status: "completed" as const,
      defense: { mutationObserved: true, restorationConfirmed: true, notes: "Registrado.", recordedAt: now },
    };

    expect(InspectorDefenseRecordRequestSchema.safeParse({ mutationObserved: true, restorationConfirmed: true, notes: " Bien " }).data)
      .toEqual({ mutationObserved: true, restorationConfirmed: true, notes: "Bien" });
    expect(InspectorDefenseRecordRequestSchema.safeParse({ mutationObserved: true, restorationConfirmed: true, notes: "x".repeat(2001) }).success).toBe(false);
    expect(InspectorDefenseRecordRequestSchema.safeParse({ mutationObserved: true, restorationConfirmed: true, notes: "", teacherHint: "private" }).success).toBe(false);
    expect(InspectorChallengeRecordResponseSchema.safeParse(record).success).toBe(true);
    expect(InspectorChallengeRecordResponseSchema.safeParse(assigned).success).toBe(true);
    expect(InspectorChallengeRecordResponseSchema.safeParse(completed).success).toBe(true);
    expect(InspectorStudentChallengeResponseSchema.safeParse({
      id: "challenge-1", status: "assigned", challenge: Object.fromEntries(Object.entries(record.challenge).filter(([key]) => key !== "teacherHint")),
    }).success).toBe(true);
    expect(InspectorStudentChallengeResponseSchema.safeParse({
      id: "challenge-1", status: "assigned", challenge: record.challenge,
    }).success).toBe(false);
  });

  it("validates Mentor themes, weighted rubrics and criterion score breakdowns", () => {
    const config = {
      subject: "Proyectos de aula", theme: "Huerto escolar", assignment: "Propón un MVP para el curso.",
      requirements: ["Funciona sin conexión"], expectedLevel: "Primer proyecto",
      rubricTitle: "Rúbrica inicial", criteria: [{ id: "scope", title: "Alcance", description: "Cabe en el curso.", weight: 100 }],
    };
    expect(MentorControlConfigSchema.safeParse(config).success).toBe(true);
    expect(MentorControlConfigSchema.safeParse({ ...config, criteria: [config.criteria[0], config.criteria[0]] }).success).toBe(false);
    expect(MentorControlConfigSchema.safeParse({ ...config, criteria: [{ ...config.criteria[0], weight: 0 }] }).success).toBe(false);
    expect(MentorPublishedConfigSchema.safeParse({ version: 1, config, publishedAt: now }).success).toBe(true);
    expect(MentorCriterionBreakdownSchema.safeParse({ criterionId: "scope", title: "Alcance", weight: 100, status: "not_verified", points: 50, reason: "Agrega evidencia observable.", guidanceLevel: 1 }).success).toBe(true);
    expect(MentorCriterionBreakdownSchema.safeParse({ criterionId: "scope", title: "Alcance", weight: 100, status: "failed", points: 101, reason: "No corresponde al criterio.", guidanceLevel: 2 }).success).toBe(false);
  });
});
