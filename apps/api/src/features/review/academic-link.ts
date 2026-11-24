import { AssignmentDeliverableSchema, AssignmentSkillSnapshotSchema, ReviewAcademicLinkSchema, type ReviewAcademicLink } from "@fragments/contracts";
import type { PrismaClient } from "../../generated/prisma/client.js";

function textField(value: unknown, key: string): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "";
  const field = (value as Record<string, unknown>)[key];
  return typeof field === "string" ? field.trim() : "";
}

function requiredSkillNames(value: unknown): string[] | undefined {
  if (!Array.isArray(value) || value.length > 20) return undefined;
  const names = value.flatMap((item) => {
    const parsed = AssignmentSkillSnapshotSchema.safeParse(item);
    return parsed.success ? [parsed.data.name] : [];
  });
  return names.length === value.length ? names : undefined;
}

export function createReviewAcademicLinkResolver(database: PrismaClient) {
  return async function resolveReviewAcademicLink(studentId: string, proposalId: string, deliverableId?: string, commitSha?: string): Promise<ReviewAcademicLink | null> {
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
    const record = snapshot && typeof snapshot === "object" && !Array.isArray(snapshot) ? snapshot as Record<string, unknown> : {};
    const deliverables = Array.isArray(record.deliverables) ? record.deliverables.flatMap((item) => {
      const parsed = AssignmentDeliverableSchema.safeParse(item);
      return parsed.success ? [parsed.data] : [];
    }) : [];
    const requestedDeliverable = deliverableId ? deliverables.find((item) => item.id === deliverableId) : undefined;
    let deliverable = requestedDeliverable;
    if (deliverableId && (!deliverable || deliverables.length !== (Array.isArray(record.deliverables) ? record.deliverables.length : 0))) return null;
    if (deliverable && requestedDeliverable) {
      const jobs = await database.job.findMany({
        where: { type: "review", payloadJson: { path: ["context", "academicLink", "proposalId"], equals: proposalId } },
        select: { status: true, payloadJson: true },
      }) as Array<{ status: string; payloadJson: unknown }>;
      const validJobs = jobs.flatMap((job) => {
        if (!job.payloadJson || typeof job.payloadJson !== "object" || Array.isArray(job.payloadJson)) return [];
        const payload = job.payloadJson as Record<string, unknown>;
        const context = payload.context;
        if (!context || typeof context !== "object" || Array.isArray(context)) return [];
        const contextRecord = context as Record<string, unknown>;
        const link = contextRecord.academicLink;
        if (contextRecord.studentId !== studentId || !link || typeof link !== "object" || Array.isArray(link)) return [];
        const linkRecord = link as Record<string, unknown>;
        if (linkRecord.proposalId !== proposalId || linkRecord.assignmentVersionId !== version.id || typeof linkRecord.deliverable !== "object" || linkRecord.deliverable === null || Array.isArray(linkRecord.deliverable)) return [];
        const savedDeliverableId = (linkRecord.deliverable as Record<string, unknown>).id;
        const savedDeliverable = typeof savedDeliverableId === "string" ? deliverables.find((item) => item.id === savedDeliverableId) : undefined;
        const savedCommitSha = (payload.request as Record<string, unknown> | undefined)?.commitSha;
        return savedDeliverable && typeof savedCommitSha === "string" ? [{ id: savedDeliverable.id, order: savedDeliverable.order, commitSha: savedCommitSha.toLowerCase(), completed: job.status === "done" && Boolean(payload.record) }] : [];
      });
      const completedIds = new Set(validJobs.filter((job) => job.completed).map((job) => job.id));
      if (commitSha && validJobs.some((job) => job.order < requestedDeliverable.order && job.commitSha === commitSha.toLowerCase())) return null;
      const currentDelivery = deliverables.find((item) => !completedIds.has(item.id));
      const idempotentAttempt = commitSha && validJobs.some((job) => job.id === requestedDeliverable.id && job.commitSha === commitSha.toLowerCase());
      if (!idempotentAttempt && currentDelivery?.id !== deliverableId) return null;
    }
    const skills = requiredSkillNames(record.requiredSkills);
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
      ...(deliverable ? { deliverable } : {}),
    });
  };
}
