import { ReviewAcademicLinkSchema, type ReviewAcademicLink } from "@fragments/contracts";
import type { PrismaClient } from "../../generated/prisma/client.js";

function textField(value: unknown, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field.trim() : "";
}

export function createReviewAcademicLinkResolver(database: PrismaClient) {
  return async function resolveReviewAcademicLink(studentId: string, proposalId: string): Promise<ReviewAcademicLink | null> {
    const proposal = await database.proposal.findFirst({
      where: { id: proposalId, ownerUserId: studentId, assignmentVersionId: { not: null } },
      select: { id: true, version: true, proposalJson: true, assignmentVersionId: true },
    });
    if (!proposal?.assignmentVersionId) return null;

    const version = await database.classroomAssignmentVersion.findUnique({
      where: { id: proposal.assignmentVersionId },
      include: { assignment: { include: { classroom: true } } },
    });
    if (!version || version.assignment.status !== "published" || version.assignment.classroom.status !== "active") return null;

    const enrollment = await database.classEnrollment.findFirst({
      where: { classroomId: version.assignment.classroomId, studentId, status: "active", classroom: { status: "active" } },
      select: { id: true },
    });
    if (!enrollment) return null;

    return ReviewAcademicLinkSchema.parse({
      proposalId: proposal.id,
      proposalVersion: proposal.version,
      proposalTitle: textField(proposal.proposalJson, "title"),
      assignmentVersionId: version.id,
      missionTitle: textField(version.snapshotJson, "title"),
      missionVersion: version.version,
      mentorContextVersion: version.mentorContextVersion,
      classroomId: version.assignment.classroomId,
      classroomTitle: version.assignment.classroom.title,
    });
  };
}
