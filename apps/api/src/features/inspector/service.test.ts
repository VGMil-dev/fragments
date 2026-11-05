import { describe, expect, it } from "vitest";
import {
  InspectorChallengePublicSchema,
  InspectorChallengeSchema,
  type AiAnalysis,
  type RepositorySnapshot,
} from "@fragments/contracts";
import { digestSnapshot } from "../review/review.service.js";
import { createInMemoryInspectorStore, createInspectorService, type ReviewEvidence } from "./service.js";

const commitA = "a".repeat(40);
const commitB = "b".repeat(40);
const repositoryContent = {
  owner: "student",
  repo: "demo",
  commitSha: commitA,
  files: [{ path: "src/total.ts", content: "export const total = (values: number[]) => values.reduce((a, b) => a + b, 0);\n", sha: "d".repeat(40) }],
};
async function makeReview(commitSha = commitA): Promise<ReviewEvidence> {
  const snapshotContent = { ...repositoryContent, commitSha };
  const digest = await digestSnapshot(snapshotContent);
  const snapshot: RepositorySnapshot = { ...snapshotContent, digest };
  const analysis: AiAnalysis = {
    rubricVersion: "review-1",
    score: 80,
    findings: [{
      criterionId: "correctness",
      status: "verified",
      evidence: [{ source: "repository", path: "src/total.ts", lines: [1, 1], digest }],
      file: "src/total.ts",
      lines: [1, 1],
      reason: "El acumulador suma los elementos de la colección.",
      guidanceLevel: 1,
    }],
    limitations: [],
    modelId: "fake/review",
    inputDigest: "e".repeat(64),
  };
  return { id: "review-1", projectId: "project-1", commitSha, owner: snapshot.owner, repo: snapshot.repo, snapshot, analysis };
}

async function fixture(options: { commitSha?: string; review?: ReviewEvidence | null } = {}) {
  let currentCommit = options.commitSha ?? commitA;
  const review = options.review === undefined ? await makeReview() : options.review;
  let nextId = 0;
  let receivedEvidenceExcerpt = "";
  const provider = {
    async createChallenge(input: { evidenceExcerpt: string }) {
      receivedEvidenceExcerpt = input.evidenceExcerpt;
      return {
        precondition: "La función suma la lista recibida.",
        mutation: "Explica qué cambiarías para invertir temporalmente la condición del bucle.",
        demonstration: "Señala un ejemplo pequeño que muestre el cambio de comportamiento.",
        restoration: "Describe cómo dejarías intacto el commit revisado.",
        estimatedMinutes: 12,
        teacherHint: "Observa el acumulador sin mostrar esta nota al estudiante.",
      };
    },
  };
  const store = createInMemoryInspectorStore();
  const reviews = {
    async getById(id: string) { return id === "review-1" ? review : null; },
    async getLatestCommit(projectId: string) { return projectId === "project-1" ? currentCommit : null; },
  };
  const service = createInspectorService({
    provider,
    store,
    reviews,
    now: () => new Date("2026-11-04T12:00:00.000Z"),
    createId: () => `challenge-${++nextId}`,
  });
  return { service, changeCommit(sha: string) { currentCommit = sha; }, getEvidenceExcerpt() { return receivedEvidenceExcerpt; } };
}

describe("Inspector service", () => {
  it("creates a challenge from evidence on the exact reviewed commit and hides the teacher hint from students", async () => {
    const { service, getEvidenceExcerpt } = await fixture();
    const created = await service.createChallenge("review-1");

    expect(created.commitSha).toBe(commitA);
    expect(InspectorChallengeSchema.safeParse(created.challenge).success).toBe(true);
    expect(created.challenge.sourceEvidence).toHaveLength(1);
    expect(created.challenge.teacherHint).toContain("Observa el acumulador");
    expect(getEvidenceExcerpt()).toBe("src/total.ts\n1: export const total = (values: number[]) => values.reduce((a, b) => a + b, 0);");

    await service.assignChallenge(created.id, "teacher-1");
    const student = await service.getStudentChallenge(created.id);
    expect(student.challenge.teacherHint).toBeUndefined();
    expect(InspectorChallengePublicSchema.safeParse(student.challenge).success).toBe(true);
    expect(InspectorChallengePublicSchema.safeParse(created.challenge).success).toBe(false);
  });

  it("rejects missing reviews, unrelated latest commits, and reviews without verified repository evidence", async () => {
    const missing = await fixture({ review: null });
    await expect(missing.service.createChallenge("review-1")).rejects.toMatchObject({ code: "REVIEW_NOT_FOUND" });

    const stale = await fixture({ commitSha: commitB });
    await expect(stale.service.createChallenge("review-1")).rejects.toMatchObject({ code: "REVIEW_STALE" });

    const validReview = await makeReview();
    const validFinding = validReview.analysis.findings[0]!;
    const noEvidence = await fixture({ review: { ...validReview, analysis: { ...validReview.analysis, findings: [{
      ...validFinding,
      status: "not_verified",
    }] } } });
    await expect(noEvidence.service.createChallenge("review-1")).rejects.toMatchObject({ code: "NO_VERIFIED_EVIDENCE" });

    const inventedPath = await fixture({ review: { ...validReview, analysis: { ...validReview.analysis, findings: [{
      ...validFinding,
      evidence: [{ ...validFinding.evidence[0]!, path: "src/missing.ts" }],
    }] } } });
    await expect(inventedPath.service.createChallenge("review-1")).rejects.toMatchObject({ code: "INVALID_REVIEW_EVIDENCE" });

    const outOfRange = await fixture({ review: { ...validReview, analysis: { ...validReview.analysis, findings: [{
      ...validFinding,
      evidence: [{ ...validFinding.evidence[0]!, lines: [1, 2] }],
    }] } } });
    await expect(outOfRange.service.createChallenge("review-1")).rejects.toMatchObject({ code: "INVALID_REVIEW_EVIDENCE" });

    const badEvidenceDigest = await fixture({ review: { ...validReview, analysis: { ...validReview.analysis, findings: [{
      ...validFinding,
      evidence: [{ ...validFinding.evidence[0]!, digest: "f".repeat(64) }],
    }] } } });
    await expect(badEvidenceDigest.service.createChallenge("review-1")).rejects.toMatchObject({ code: "INVALID_REVIEW_EVIDENCE" });
  });

  it("marks pending challenges obsolete, freezes assigned challenges, and preserves recorded defenses after a new commit", async () => {
    const { service, changeCommit } = await fixture();
    const pending = await service.createChallenge("review-1");
    const assigned = await service.createChallenge("review-1");
    await service.assignChallenge(assigned.id, "teacher-1");
    const completed = await service.createChallenge("review-1");
    await service.assignChallenge(completed.id, "teacher-1");
    await service.recordDefense(completed.id, "teacher-1", {
      mutationObserved: true,
      restorationConfirmed: true,
      notes: "La persona explicó y restauró el comportamiento.",
    });

    changeCommit(commitB);
    const result = await service.reconcileCommit("review-1");

    expect(result.find((item) => item.id === pending.id)?.status).toBe("obsolete");
    expect(result.find((item) => item.id === assigned.id)?.status).toBe("assigned");
    expect(result.find((item) => item.id === assigned.id)?.supersededByCommitSha).toBe(commitB);
    expect(result.find((item) => item.id === completed.id)?.status).toBe("completed");
    expect(result.find((item) => item.id === completed.id)?.defense).toBeTruthy();
  });

  it("requires teacher assignment before recording, binds the teacher, and rejects unsafe record fields", async () => {
    const { service } = await fixture();
    const created = await service.createChallenge("review-1");
    await expect(service.recordDefense(created.id, "teacher-1", {
      mutationObserved: true,
      restorationConfirmed: true,
      notes: "Correcto.",
    })).rejects.toMatchObject({ code: "CHALLENGE_NOT_ASSIGNED" });

    await service.assignChallenge(created.id, "teacher-1");
    await expect(service.recordDefense(created.id, "teacher-2", {
      mutationObserved: true,
      restorationConfirmed: true,
      notes: "Correcto.",
    })).rejects.toMatchObject({ code: "TEACHER_MISMATCH" });
    await expect(service.recordDefense(created.id, "teacher-1", {
      mutationObserved: true,
      restorationConfirmed: true,
      notes: "Incluye datos privados",
      password: "must-not-pass",
    })).rejects.toMatchObject({ code: "INVALID_DEFENSE_RECORD" });
  });
});
