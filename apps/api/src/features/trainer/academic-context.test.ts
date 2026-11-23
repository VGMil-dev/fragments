import { describe, expect, it } from "vitest";
import { trainerAcademicContextFromPayload } from "./academic-context.js";
import { TrainerReviewSchema } from "./schemas.js";
import { createPrismaReviewStore } from "../review/prisma-store.js";

const link = {
  proposalId: "proposal-1", proposalVersion: 3, proposalTitle: "Mi app",
  assignmentVersionId: "mission-version-1", missionTitle: "Programación Móvil", missionVersion: 2,
  mentorContextVersion: 4, classroomId: "class-1", classroomTitle: "Terceros de bachillerato",
  requiredSkills: ["Navegación", "Componentes"],
};

describe("Trainer academic context", () => {
  it("returns only the verified mission labels for the owning student's linked Review", () => {
    const payload = JSON.stringify({ request: { linkedProposalId: "proposal-1" }, context: { studentId: "student-1", academicLink: link } });
    expect(trainerAcademicContextFromPayload(payload, "student-1")).toEqual({
      missionTitle: "Programación Móvil", missionVersion: 2, mentorContextVersion: 4,
      classroomTitle: "Terceros de bachillerato", requiredSkills: ["Navegación", "Componentes"],
    });
  });

  it("omits links that are absent, belong to another student, or disagree with the selected proposal", () => {
    expect(trainerAcademicContextFromPayload({ request: {}, context: { studentId: "student-1" } }, "student-1")).toBeNull();
    expect(trainerAcademicContextFromPayload({ request: { linkedProposalId: "proposal-1" }, context: { studentId: "student-2", academicLink: link } }, "student-1")).toBeNull();
    expect(trainerAcademicContextFromPayload({ request: { linkedProposalId: "proposal-2" }, context: { studentId: "student-1", academicLink: link } }, "student-1")).toBeNull();
  });

  it("does not expose internal identities or accept malformed skill snapshots", () => {
    const payload = { request: { linkedProposalId: "proposal-1" }, context: { studentId: "student-1", academicLink: { ...link, requiredSkills: ["Navegación", 7] } } };
    expect(trainerAcademicContextFromPayload(payload, "student-1")).toBeNull();
    expect(JSON.stringify(trainerAcademicContextFromPayload({ request: { linkedProposalId: "proposal-1" }, context: { studentId: "student-1", academicLink: link } }, "student-1")))
      .not.toMatch(/proposalId|assignmentVersionId|classroomId|studentId/);
  });

  it("accepts the bounded student Trainer DTO and rejects internal identity fields", () => {
    const review = { id: "review-1", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00.000Z",
      academicContext: trainerAcademicContextFromPayload({ request: { linkedProposalId: "proposal-1" }, context: { studentId: "student-1", academicLink: link } }, "student-1") };
    expect(TrainerReviewSchema.safeParse(review).success).toBe(true);
    expect(TrainerReviewSchema.safeParse({ ...review, academicContext: { ...review.academicContext, studentId: "student-1" } }).success).toBe(false);
  });

  it("lists a persisted academic link only for the owning student's completed Review", async () => {
    const now = new Date("2026-11-01T00:00:00.000Z");
    const row = (id: string, ownerId: string) => ({ id, type: "review", idempotencyKey: `${id}-key`, status: "done", attempts: 1,
      leaseOwner: null, leaseUntil: null, lastStage: null, lastErrorCode: null, retryClass: null, nextRetryAt: null, createdAt: now, updatedAt: now,
      payloadJson: { request: { owner: "student", repo: "demo", commitSha: "a".repeat(40), linkedProposalId: "proposal-1" },
        context: { projectId: "student/demo", rubricVersion: "r1", evaluatorVersion: "e1", studentId: ownerId, academicLink: link },
        record: { id, key: `${id}-key`, projectId: "student/demo", owner: "student", repo: "demo", commitSha: "a".repeat(40),
          rubricVersion: "r1", evaluatorVersion: "e1", updatedAt: now.toISOString(), packedDigest: "a".repeat(64),
          analysis: { rubricVersion: "r1", score: 80, findings: [{ criterionId: "criteria", status: "verified", evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 1], digest: "c".repeat(64) }],
            reason: "La evidencia está vinculada al commit.", guidanceLevel: 1 }], limitations: [], modelId: "fake/local", inputDigest: "b".repeat(64) } } } });
    const database = { job: { findMany: async () => [row("review-owned", "student-1"), row("review-foreign", "student-2")] } } as never;
    const result = await createPrismaReviewStore(database).listCompletedForStudent("student-1");
    expect(result).toEqual([{ id: "review-owned", owner: "student", repo: "demo", commitSha: "a".repeat(40), updatedAt: now.toISOString(),
      academicContext: { missionTitle: "Programación Móvil", missionVersion: 2, mentorContextVersion: 4,
        classroomTitle: "Terceros de bachillerato", requiredSkills: ["Navegación", "Componentes"] } }]);
    expect(JSON.stringify(result)).not.toMatch(/review-foreign|studentId|proposalId|assignmentVersionId|classroomId/);
  });
});
