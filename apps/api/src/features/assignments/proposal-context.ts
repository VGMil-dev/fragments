import type { PrismaClient } from "../../generated/prisma/client.js";
import { MentorEvaluationContextSchema } from "@fragments/contracts";
import { assignmentSkillNames, buildAssignmentMentorConfig } from "./mentor-context.js";

export async function loadProposalAssignmentContext(database: PrismaClient, assignmentVersionId: string | null | undefined) {
  if (!assignmentVersionId) return null;
  const version = await database.classroomAssignmentVersion.findUnique({ where: { id: assignmentVersionId }, include: { assignment: { include: { classroom: { select: { subject: true } } } } } });
  if (!version) return null;
  const control = await database.mentorControlVersion.findUnique({ where: { version: version.mentorContextVersion } });
  if (!control) return null;
  return {
    assignmentVersionId: version.id,
    requiredSkills: assignmentSkillNames(version.snapshotJson, "requiredSkills"),
    mentorContext: MentorEvaluationContextSchema.parse({ version: control.version, publishedAt: control.publishedAt.toISOString(),
      config: buildAssignmentMentorConfig(control.configJson, version.snapshotJson, version.assignment.classroom.subject) }),
  };
}
