import { AssignmentRequiredSkillSchema, ReviewAcademicLinkSchema, type ReviewAcademicLink } from "@fragments/contracts";
import type { PrismaClient } from "../../generated/prisma/client.js";

function textField(value: unknown, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field.trim() : "";
}

function requiredSkillNames(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > 20) return undefined;
  const names = value.flatMap((item) => {
    const parsed = AssignmentRequiredSkillSchema.safeParse(item);
    return parsed.success ? [parsed.data.name] : [];
  });
  return names.length === value.length ? names : undefined;
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

    const snapshot = version.snapshotJson;
    const skills = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? requiredSkillNames(snapshot.requiredSkills) : undefined;
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
      ...(skills === undefined ? {} : { requiredSkills: skills }),
    });
  };
}
