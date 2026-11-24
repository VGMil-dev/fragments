import { describe, expect, it, vi } from "vitest";
import { createReviewAcademicLinkResolver } from "./academic-link.js";

const deliverables = [
  { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: ["Definir alcance"], criterionIds: ["criterion-1"] },
  { id: "delivery-2", order: 2, title: "Avance", type: "progress", requirements: ["Mostrar navegación"], criterionIds: ["criterion-1"] },
] as const;

describe("Review academic link resolver", () => {
  it("resolves only the student's published mission proposal in an active enrollment", async () => {
    const database = {
      proposal: { findFirst: vi.fn(async () => ({ id: "proposal-1", version: 2, proposalJson: { title: "App móvil" }, assignmentVersionId: "mission-version-1" })) },
      classroomAssignmentVersion: { findUnique: vi.fn(async () => ({ id: "mission-version-1", version: 1, mentorContextVersion: 4,
        snapshotJson: { title: "Navegación con Expo", requiredSkills: [{ id: "skill-1", name: "Navegación", description: "Rutas de la app." }, { id: "skill-2", name: "Componentes", description: null }] },
        assignment: { status: "published", classroomId: "class-1", classroom: { id: "class-1", title: "3ro B", status: "active" } } })) },
      classEnrollment: { findFirst: vi.fn(async () => ({ id: "enrollment-1" })) },
    };
    const resolve = createReviewAcademicLinkResolver(database as never);

    await expect(resolve("student-1", "proposal-1")).resolves.toEqual({
      proposalId: "proposal-1", proposalVersion: 2, proposalTitle: "App móvil",
      assignmentVersionId: "mission-version-1", missionTitle: "Navegación con Expo", missionVersion: 1,
      mentorContextVersion: 4, classroomId: "class-1", classroomTitle: "3ro B", requiredSkills: ["Navegación", "Componentes"],
    });
    expect(database.proposal.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      id: "proposal-1", ownerUserId: "student-1", assignmentVersionId: { not: null },
    } }));
    expect(database.classEnrollment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: {
      classroomId: "class-1", studentId: "student-1", status: "active", classroom: { status: "active" },
    } }));
  });

  it("refuses proposals without a published version or active classroom enrollment", async () => {
    const database = {
      proposal: { findFirst: vi.fn(async () => ({ id: "proposal-1", version: 1, proposalJson: {}, assignmentVersionId: "mission-version-1" })) },
      classroomAssignmentVersion: { findUnique: vi.fn(async () => ({ id: "mission-version-1", version: 1, mentorContextVersion: 4,
        snapshotJson: { title: "Navegación" }, assignment: { status: "published", classroomId: "class-1", classroom: { id: "class-1", title: "3ro B", status: "active" } } })) },
      classEnrollment: { findFirst: vi.fn(async () => null) },
    };
    const resolve = createReviewAcademicLinkResolver(database as never);
    await expect(resolve("student-1", "proposal-1")).resolves.toBeNull();
    expect(database.classEnrollment.findFirst).toHaveBeenCalledOnce();
  });

  it("only resolves the current deliverable from the pinned mission snapshot", async () => {
    const database = {
      proposal: { findFirst: vi.fn(async () => ({ id: "proposal-1", version: 1, proposalJson: {}, assignmentVersionId: "mission-version-1" })) },
      classroomAssignmentVersion: { findUnique: vi.fn(async () => ({ id: "mission-version-1", version: 1, mentorContextVersion: 1,
        snapshotJson: { title: "Navegación", deliverables, requiredSkills: [] }, assignment: { status: "published", classroomId: "class-1", classroom: { id: "class-1", title: "3ro B", status: "active" } } })) },
      classEnrollment: { findFirst: vi.fn(async () => ({ id: "enrollment-1" })) },
      job: { findMany: vi.fn(async () => []) },
    };
    const resolve = createReviewAcademicLinkResolver(database as never);
    await expect(resolve("student-1", "proposal-1", "delivery-2")).resolves.toBeNull();
    await expect(resolve("student-1", "proposal-1", "delivery-1")).resolves.toMatchObject({ deliverable: deliverables[0] });
    database.job.findMany.mockResolvedValue([{ status: "done", payloadJson: { record: {}, request: { owner: "student-1", repo: "app", commitSha: "a".repeat(40) }, context: {
      studentId: "student-1", academicLink: { proposalId: "proposal-1", assignmentVersionId: "mission-version-1", deliverable: deliverables[0] },
    } } }] as never);
    await expect(resolve("student-1", "proposal-1", "delivery-2", "a".repeat(40))).resolves.toBeNull();
    await expect(resolve("student-1", "proposal-1", "delivery-2", "b".repeat(40))).resolves.toMatchObject({ deliverable: deliverables[1] });
  });
});
