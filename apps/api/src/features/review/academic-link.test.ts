import { describe, expect, it, vi } from "vitest";
import { createReviewAcademicLinkResolver } from "./academic-link.js";

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
});
