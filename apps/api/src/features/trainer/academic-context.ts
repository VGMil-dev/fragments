import { ReviewAcademicLinkSchema } from "@fragments/contracts";
import { TrainerAcademicContextSchema, type TrainerAcademicContext } from "./schemas.js";

function record(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

export function trainerAcademicContextFromPayload(payload: unknown, studentId: string): TrainerAcademicContext | null {
  let decoded = payload;
  if (typeof decoded === "string") {
    try { decoded = JSON.parse(decoded) as unknown; } catch { return null; }
  }
  const root = record(decoded);
  const request = record(root?.request);
  const context = record(root?.context);
  if (!context || context.studentId !== studentId || typeof request?.linkedProposalId !== "string") return null;
  const parsed = ReviewAcademicLinkSchema.safeParse(context.academicLink);
  if (!parsed.success || parsed.data.proposalId !== request.linkedProposalId) return null;
  const link = parsed.data;
  return TrainerAcademicContextSchema.parse({
    missionTitle: link.missionTitle,
    missionVersion: link.missionVersion,
    mentorContextVersion: link.mentorContextVersion,
    classroomTitle: link.classroomTitle,
    ...(link.requiredSkills === undefined ? {} : { requiredSkills: link.requiredSkills }),
  });
}
