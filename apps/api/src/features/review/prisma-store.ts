import { randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  AssignmentDeliverableSchema, MissionDeliveryHistorySchema, ReviewAcademicLinkSchema, ReviewRequestSchema, ReviewResponseSchema, SubmissionResponseSchema, TeacherClassroomReviewsResponseSchema,
  type MissionDeliveryHistory,
  type ReviewRequest,
} from "@fragments/contracts";
import type { ReviewContext, ReviewRecord } from "./review.service.js";
import { reviewIdempotencyKey } from "./review.service.js";
import type { ReviewFailure, ReviewStage } from "./review-errors.js";
import { trainerAcademicContextFromPayload } from "../trainer/academic-context.js";

export type ReviewJobStatus = "queued" | "running" | "completed" | "failed";
export type ReviewJobView = {
  id: string; key: string; owner: string; repo: string; commitSha: string; status: ReviewJobStatus;
  progress: number; createdAt: string; updatedAt: string; message?: string; record?: ReviewRecord;
  linkedProposalId?: string; academicLink?: ReviewContext["academicLink"];
};
export type ClaimedReviewJob = ReviewJobView & { status: "running"; request: ReviewRequest; context: ReviewContext; attempts: number };
type ReviewPayload = { request: ReviewRequest; context: ReviewContext; record?: ReviewRecord; message?: string };
type JobRow = {
  id: string; type: string; payloadJson: unknown; idempotencyKey: string; status: string; attempts: number;
  leaseOwner: string | null; leaseUntil: Date | null; lastStage: string | null; lastErrorCode: string | null;
  retryClass: "transient" | "permanent" | "manual" | null; nextRetryAt: Date | null; createdAt: Date; updatedAt: Date;
};
type SubmissionRow = {
  id: string; kind: string; sourceId: string; score: number; snapshotJson: unknown; contentHash: string;
  verificationCode: string; rubricVersion: string; createdAt: Date;
};
const jobType = "review";
const safeFailure = "No se pudo completar la revisión en este momento.";
export const REVIEW_MAX_ATTEMPTS = 3;

function retryDelayMs(attempt: number): number { return Math.min(5 * 60_000, 30_000 * (2 ** Math.max(0, attempt - 1))); }
function parseContext(value: unknown): ReviewContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Contexto Review inválido en almacenamiento.");
  const context = value as Record<string, unknown>;
  for (const field of ["projectId", "rubricVersion", "evaluatorVersion"] as const) {
    if (typeof context[field] !== "string" || !context[field].trim()) throw new Error("Contexto Review inválido en almacenamiento.");
  }
  const academicLink = context.academicLink === undefined ? undefined : ReviewAcademicLinkSchema.parse(context.academicLink);
  return { projectId: String(context.projectId), rubricVersion: String(context.rubricVersion), evaluatorVersion: String(context.evaluatorVersion),
    ...(typeof context.studentId === "string" ? { studentId: context.studentId } : {}),
    ...(typeof context.githubLogin === "string" ? { githubLogin: context.githubLogin } : {}), ...(academicLink ? { academicLink } : {}) };
}
function parsePayload(raw: unknown): ReviewPayload {
  const value = typeof raw === "string" ? JSON.parse(raw) as ReviewPayload : raw as ReviewPayload;
  return { request: ReviewRequestSchema.parse(value.request), context: parseContext(value.context),
    ...(value.record ? { record: value.record } : {}), ...(value.message ? { message: value.message } : {}) };
}
function toSubmission(row: SubmissionRow) {
  return SubmissionResponseSchema.parse({ id: row.id, kind: row.kind, sourceId: row.sourceId, score: row.score,
    snapshotJson: row.snapshotJson, contentHash: row.contentHash, verificationCode: row.verificationCode,
    rubricVersion: row.rubricVersion, createdAt: row.createdAt.toISOString() });
}
function view(row: JobRow): ReviewJobView {
  const payload = parsePayload(row.payloadJson);
  const status: ReviewJobStatus = row.status === "done" ? "completed" : row.status === "failed" ? "failed" : row.status === "leased" ? "running" : "queued";
  const createdAt = row.createdAt.toISOString(); const updatedAt = row.updatedAt.toISOString();
  const result = ReviewResponseSchema.parse(status === "completed" && payload.record ? {
    id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
    status, analysis: payload.record.analysis, progress: 100, updatedAt,
  } : status === "failed" ? {
    id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
    status, message: payload.message ?? safeFailure, updatedAt,
  } : status === "running" ? {
    id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
    status, progress: 25, updatedAt,
  } : {
    id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
    status: "queued", createdAt, progress: 0, updatedAt,
  });
  return { id: row.id, key: row.idempotencyKey, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
    status: result.status, progress: result.status === "completed" ? 100 : result.status === "running" ? result.progress : 0,
    createdAt, updatedAt, ...(result.status === "failed" ? { message: result.message } : {}),
    ...(result.status === "completed" && payload.record ? { record: payload.record } : {}),
    ...(payload.request.linkedProposalId ? { linkedProposalId: payload.request.linkedProposalId } : {}), ...(payload.context.academicLink ? { academicLink: payload.context.academicLink } : {}) };
}

export function createPrismaReviewStore(database: PrismaClient) {
  async function rowById(id: string): Promise<JobRow | null> {
    return database.job.findFirst({ where: { id, type: jobType } }) as Promise<JobRow | null>;
  }
  async function rowByKey(key: string): Promise<JobRow | null> {
    return database.job.findFirst({ where: { idempotencyKey: key, type: jobType } }) as Promise<JobRow | null>;
  }
  async function closeAttempt(tx: Prisma.TransactionClient, job: JobRow, now: Date, input: { finalStatus: "completed" | "failed"; stage: string; errorCode: string | null; retryClass: string | null; durationMs?: number }) {
    const attempt = await tx.reviewAttempt.findFirst({ where: { jobId: job.id, finalStatus: "running" }, orderBy: { attempt: "desc" }, select: { attempt: true, startedAt: true } });
    if (!attempt) return;
    const duration = input.durationMs ?? Math.max(0, now.getTime() - (attempt.startedAt?.getTime() ?? job.createdAt.getTime()));
    await tx.reviewAttempt.update({ where: { jobId_attempt: { jobId: job.id, attempt: attempt.attempt } }, data: {
      finishedAt: now, durationMs: BigInt(duration), stage: input.stage, errorCode: input.errorCode, retryClass: input.retryClass, finalStatus: input.finalStatus,
    } });
  }
  async function saveSubmission(submission: ReturnType<typeof SubmissionResponseSchema.parse>): Promise<void> {
    const parsed = SubmissionResponseSchema.parse(submission);
    await database.submission.create({ data: { id: parsed.id, kind: parsed.kind, sourceId: parsed.sourceId, score: parsed.score,
      snapshotJson: parsed.snapshotJson as Prisma.InputJsonValue, contentHash: parsed.contentHash, verificationCode: parsed.verificationCode,
      rubricVersion: parsed.rubricVersion, createdAt: new Date(parsed.createdAt) } });
  }
  async function getByVerificationCode(code: string): Promise<unknown | null> {
    const row = await database.submission.findFirst({ where: { verificationCode: code, kind: "review" } });
    return row ? toSubmission(row) : null;
  }
  async function getReviewSubmission(id: string) {
    const row = await database.submission.findFirst({ where: { id, kind: "review" } });
    return row ? toSubmission(row) : null;
  }

  const store = {
    async listMissionDeliveryHistory(studentId: string, proposalId: string): Promise<MissionDeliveryHistory | null> {
      const proposal = await database.proposal.findFirst({ where: { id: proposalId, ownerUserId: studentId, assignmentVersionId: { not: null } },
        select: { id: true, assignmentVersionId: true } });
      if (!proposal?.assignmentVersionId) return null;
      const version = await database.classroomAssignmentVersion.findUnique({ where: { id: proposal.assignmentVersionId },
        include: { assignment: { include: { classroom: true } } } });
      if (!version || version.assignment.status !== "published" || version.assignment.classroom.status !== "active") return null;
      const enrollment = await database.classEnrollment.findFirst({ where: { classroomId: version.assignment.classroomId, studentId,
        status: "active", classroom: { status: "active" } }, select: { id: true } });
      if (!enrollment) return null;
      const snapshot = version.snapshotJson && typeof version.snapshotJson === "object" && !Array.isArray(version.snapshotJson)
        ? version.snapshotJson as Record<string, unknown> : {};
      const rawDeliverables = Array.isArray(snapshot.deliverables) ? snapshot.deliverables : [];
      const deliverables = rawDeliverables.map((item) => AssignmentDeliverableSchema.parse(item));
      const rows = await database.job.findMany({ where: { type: jobType,
        payloadJson: { path: ["context", "academicLink", "proposalId"], equals: proposal.id } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] }) as JobRow[];
      const attemptsByDeliverable = new Map<string, Array<{ reviewId: string; commitSha: string; status: "queued" | "running" | "failed" | "completed"; createdAt: string; updatedAt: string }>>();
      for (const row of rows) {
        const payload = parsePayload(row.payloadJson);
        const link = payload.context.academicLink;
        if (payload.context.studentId !== studentId || !link || link.proposalId !== proposal.id || link.assignmentVersionId !== version.id || !link.deliverable) continue;
        if (!deliverables.some((item) => item.id === link.deliverable!.id)) continue;
        const status: "queued" | "running" | "failed" | "completed" = row.status === "done" ? payload.record ? "completed" : "failed" : row.status === "failed" ? "failed" : row.status === "leased" ? "running" : "queued";
        const attempts = attemptsByDeliverable.get(link.deliverable.id) ?? [];
        attempts.push({ reviewId: row.id, commitSha: payload.request.commitSha, status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
        attemptsByDeliverable.set(link.deliverable.id, attempts);
      }
      const deliveries = deliverables.map((deliverable) => {
        const attempts = attemptsByDeliverable.get(deliverable.id) ?? [];
        const latest = attempts.at(-1);
        const status = attempts.some((attempt) => attempt.status === "completed") ? "completed" : latest?.status ?? "not_started";
        return { deliverable, status, attempts };
      });
      const nextDeliverableId = deliveries.find((item) => item.status !== "completed")?.deliverable.id ?? null;
      return MissionDeliveryHistorySchema.parse({ proposalId: proposal.id, assignmentVersionId: version.id, nextDeliverableId, deliveries });
    },
    async enqueue(input: { request: ReviewRequest; context: ReviewContext }): Promise<ReviewJobView> {
      const request = ReviewRequestSchema.parse(input.request); const context = parseContext(input.context);
      const key = await reviewIdempotencyKey(request, context); const now = new Date();
      await database.job.upsert({ where: { idempotencyKey: key }, create: {
        id: randomUUID(), type: jobType, payloadJson: { request, context } satisfies Prisma.InputJsonValue,
        idempotencyKey: key, status: "pending", attempts: 0, createdAt: now, updatedAt: now,
      }, update: {} });
      const row = await rowByKey(key);
      if (!row || row.type !== jobType) throw new Error("No se pudo crear el trabajo Review.");
      return view(row);
    },
    async retryFailed(id: string, nowMs = Date.now()) {
      const now = new Date(nowMs);
      return database.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT id FROM jobs WHERE id = ${id} AND type = ${jobType} FOR UPDATE`);
        let row = await tx.job.findFirst({ where: { id, type: jobType } }) as JobRow | null;
        if (!row) return { kind: "missing" } as const;
        if (row.status === "done") return { kind: "completed", job: view(row) } as const;
        if (row.status === "pending" || row.status === "leased") return { kind: "already_queued", job: view(row) } as const;
        const payload = parsePayload(row.payloadJson);
        if (payload.record) {
          await tx.job.update({ where: { id }, data: { status: "done", leaseOwner: null, leaseUntil: null, lastStage: null,
            lastErrorCode: null, retryClass: null, nextRetryAt: null, updatedAt: now } });
          row = await tx.job.findUnique({ where: { id } }) as JobRow | null;
          if (!row) throw new Error("Review row disappeared during idempotent recovery.");
          await tx.reviewAttempt.updateMany({ where: { jobId: id, attempt: row.attempts }, data: { finishedAt: now,
            durationMs: BigInt(Math.max(0, nowMs - (row.createdAt?.getTime() ?? nowMs))), stage: "result_persistence", errorCode: null, retryClass: null, finalStatus: "completed" } });
          return { kind: "completed", job: view(row) } as const;
        }
        if (row.attempts >= REVIEW_MAX_ATTEMPTS) return { kind: "exhausted" } as const;
        if (row.retryClass !== "transient") return { kind: "not_retryable" } as const;
        if (!row.nextRetryAt || now < row.nextRetryAt) return { kind: "too_early" } as const;
        const changed = await tx.job.updateMany({ where: { id, type: jobType, status: "failed", retryClass: "transient", attempts: { lt: REVIEW_MAX_ATTEMPTS }, nextRetryAt: { lte: now } },
          data: { status: "pending", leaseOwner: null, leaseUntil: null, lastStage: null, lastErrorCode: null, retryClass: null, nextRetryAt: null, updatedAt: now } });
        row = await tx.job.findFirst({ where: { id, type: jobType } }) as JobRow | null;
        if (changed.count !== 1 || !row) return row ? { kind: "already_queued", job: view(row) } as const : { kind: "missing" } as const;
        return { kind: "queued", job: view(row) } as const;
      });
    },
    async setStage(id: string, workerId: string, stage: ReviewStage, nowMs = Date.now()): Promise<boolean> {
      const now = new Date(nowMs);
      return database.$transaction(async (tx) => {
        const changed = await tx.job.updateMany({ where: { id, type: jobType, status: "leased", leaseOwner: workerId, leaseUntil: { gt: now } }, data: { lastStage: stage, updatedAt: now } });
        if (changed.count === 1) {
          const row = await tx.job.findUnique({ where: { id }, select: { attempts: true } });
          if (row) await tx.reviewAttempt.updateMany({ where: { jobId: id, attempt: row.attempts, finalStatus: "running" }, data: { stage } });
        }
        return changed.count === 1;
      });
    },
    async reconcileExpiredLeases(nowMs = Date.now()): Promise<Array<{ id: string; attempt: number; stage: ReviewStage; errorCode: string | null; finalStatus: "completed" | "failed"; durationMs: number }>> {
      const now = new Date(nowMs);
      return database.$transaction(async (tx) => {
        const staleRows = await tx.job.findMany({ where: { type: jobType, status: "leased", leaseUntil: { lte: now } }, orderBy: { createdAt: "asc" } }) as JobRow[];
        const results: Array<{ id: string; attempt: number; stage: ReviewStage; errorCode: string | null; finalStatus: "completed" | "failed"; durationMs: number }> = [];
        for (const stale of staleRows) {
          const payload = parsePayload(stale.payloadJson);
          const attempt = await tx.reviewAttempt.findUnique({ where: { jobId_attempt: { jobId: stale.id, attempt: stale.attempts } }, select: { startedAt: true } });
          const durationMs = Math.max(0, nowMs - (attempt?.startedAt?.getTime() ?? stale.createdAt.getTime()));
          if (payload.record) {
            const updated = await tx.job.updateMany({ where: { id: stale.id, type: jobType, status: "leased", leaseUntil: { lte: now } }, data: {
              status: "done", leaseOwner: null, leaseUntil: null, lastStage: null, lastErrorCode: null, retryClass: null, nextRetryAt: null, updatedAt: now,
            } });
            if (updated.count === 1) {
              await closeAttempt(tx, stale, now, { finalStatus: "completed", stage: "result_persistence", errorCode: null, retryClass: null, durationMs });
              results.push({ id: stale.id, attempt: stale.attempts, stage: "result_persistence", errorCode: null, finalStatus: "completed", durationMs });
            }
            continue;
          }
          const lastStage = stale.lastStage as ReviewStage | null;
          const beforeAi = lastStage === "repository" || lastStage === "snapshot_validation" || lastStage === "packing";
          const stage: ReviewStage = lastStage ?? "queue_claim"; const errorCode = beforeAi ? "REVIEW_LEASE_EXPIRED" : "AI_OUTCOME_UNCERTAIN";
          const retryClass = beforeAi ? "transient" : "manual";
          const retryAt = beforeAi && stale.attempts < REVIEW_MAX_ATTEMPTS ? new Date(nowMs + retryDelayMs(stale.attempts)) : null;
          const updated = await tx.job.updateMany({ where: { id: stale.id, type: jobType, status: "leased", leaseUntil: { lte: now } }, data: {
            status: "failed", leaseOwner: null, leaseUntil: null, lastStage: stage, lastErrorCode: errorCode, retryClass, nextRetryAt: retryAt,
            payloadJson: { ...payload, message: safeFailure } satisfies Prisma.InputJsonValue, updatedAt: now,
          } });
          if (updated.count === 1) {
            await closeAttempt(tx, stale, now, { finalStatus: "failed", stage, errorCode, retryClass, durationMs });
            results.push({ id: stale.id, attempt: stale.attempts, stage, errorCode, finalStatus: "failed", durationMs });
          }
        }
        return results;
      });
    },
    async getAttemptHistory(id: string) {
      const rows = await database.reviewAttempt.findMany({ where: { jobId: id }, orderBy: { attempt: "asc" } });
      return rows.map((row) => ({ attempt: row.attempt, startedAt: row.startedAt?.getTime() ?? null, finishedAt: row.finishedAt?.getTime() ?? null,
        durationMs: row.durationMs === null ? null : Number(row.durationMs), stage: row.stage, errorCode: row.errorCode, retryClass: row.retryClass, finalStatus: row.finalStatus }));
    },
    async getJob(id: string): Promise<ReviewJobView | null> { const row = await rowById(id); return row ? view(row) : null; },
    async getStudentIdForJob(id: string): Promise<string | null> {
      const row = await rowById(id); if (!row) return null;
      try { const value = parsePayload(row.payloadJson).context.studentId; return typeof value === "string" ? value : null; } catch { return null; }
    },
    async listCompleted() {
      const rows = await database.job.findMany({ where: { type: jobType, status: "done" }, orderBy: { updatedAt: "desc" }, take: 100 }) as JobRow[];
      return rows.map(view).filter((job) => job.record).map(({ id, owner, repo, commitSha, updatedAt }) => ({ id, owner, repo, commitSha, updatedAt }));
    },
    async listCompletedForStudent(studentId: string) {
      const rows = await database.job.findMany({ where: { type: jobType, status: "done" }, orderBy: { updatedAt: "desc" }, take: 100 }) as JobRow[];
      return rows.flatMap((row) => {
        const job = view(row);
        if (!job.record) return [];
        const academicContext = trainerAcademicContextFromPayload(row.payloadJson, studentId);
        const payload = parsePayload(row.payloadJson);
        if (payload.context.studentId !== studentId) return [];
        return [{ id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha, updatedAt: job.updatedAt,
          ...(academicContext ? { academicContext } : {}) }];
      });
    },
    async listForTeacherClassroom(teacherId: string, classroomId: string) {
      const classroom = await database.classroom.findFirst({ where: { id: classroomId, teacherId, status: "active" }, select: { id: true } });
      if (!classroom) return null;
      const enrollments = await database.classEnrollment.findMany({ where: { classroomId, status: "active", classroom: { status: "active" } },
        select: { studentId: true, student: { select: { githubLogin: true } } } });
      if (!enrollments.length) return [];
      const studentLabels = new Map(enrollments.map((row) => [row.studentId, row.student.githubLogin?.trim() || "Estudiante"]));
      const rows = await database.$queryRaw<Array<Pick<JobRow, "id" | "payloadJson" | "status" | "updatedAt" | "createdAt">>>`
        SELECT j.id, j.payload_json AS "payloadJson", j.status, j.updated_at AS "updatedAt", j.created_at AS "createdAt"
        FROM jobs AS j
        INNER JOIN class_enrollments AS e
          ON e.student_id = j.payload_json #>> '{context,studentId}'
         AND e.classroom_id = ${classroomId}
         AND e.status = 'active'
        WHERE j.type = ${jobType}
          AND j.status IN ('pending', 'leased', 'done', 'failed')
          AND j.payload_json #>> '{context,academicLink,classroomId}' = ${classroomId}
        ORDER BY j.updated_at DESC, j.created_at DESC
        LIMIT 100
      `;
      const items = rows.flatMap((row) => {
        const payload = parsePayload(row.payloadJson);
        const link = payload.context.academicLink;
        const studentId = payload.context.studentId;
        if (!link || link.classroomId !== classroomId || !studentId || !studentLabels.has(studentId)) return [];
        const status: "queued" | "running" | "completed" | "failed" = row.status === "done" ? "completed" : row.status === "failed" ? "failed" : row.status === "leased" ? "running" : "queued";
        const score = status === "completed" && payload.record ? payload.record.analysis.score : undefined;
        return [{ reviewId: row.id, studentLabel: studentLabels.get(studentId)!, proposalTitle: link.proposalTitle,
          proposalVersion: link.proposalVersion, missionTitle: link.missionTitle, missionVersion: link.missionVersion,
          mentorContextVersion: link.mentorContextVersion, repositoryOwner: payload.request.owner, repositoryName: payload.request.repo,
          commitSha: payload.request.commitSha, status, ...(typeof score === "number" ? { score } : {}), updatedAt: row.updatedAt.toISOString() }];
      });
      return TeacherClassroomReviewsResponseSchema.parse(items);
    },
    async getLatestCommit(projectId: string): Promise<string | null> {
      const rows = await database.job.findMany({ where: { type: jobType, status: "done" }, orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }] }) as JobRow[];
      for (const row of rows) { const payload = parsePayload(row.payloadJson); if (payload.context.projectId === projectId && payload.record) return payload.request.commitSha; }
      return null;
    },
    async claim(workerId: string, nowMs = Date.now(), leaseDurationMs = 30_000): Promise<ClaimedReviewJob | null> {
      const now = new Date(nowMs); const until = new Date(nowMs + leaseDurationMs);
      return database.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          UPDATE jobs SET status = 'leased', attempts = attempts + 1, lease_owner = ${workerId}, lease_until = ${until},
            heartbeat_at = ${now}, updated_at = ${now}
          WHERE id = (SELECT id FROM jobs WHERE type = ${jobType} AND status = 'pending' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
          RETURNING id
        `);
        const id = rows[0]?.id; if (!id) return null;
        const claimed = await tx.job.findUnique({ where: { id } }) as JobRow | null;
        if (!claimed) return null;
        await tx.reviewAttempt.create({ data: { jobId: id, attempt: claimed.attempts, startedAt: now, finalStatus: "running" } });
        const payload = parsePayload(claimed.payloadJson);
        return { ...view(claimed), status: "running", request: payload.request, context: payload.context, attempts: claimed.attempts };
      });
    },
    async heartbeat(id: string, workerId: string, nowMs = Date.now(), leaseDurationMs = 30_000): Promise<boolean> {
      const now = new Date(nowMs); const result = await database.job.updateMany({ where: { id, type: jobType, status: "leased", leaseOwner: workerId, leaseUntil: { gt: now } },
        data: { leaseUntil: new Date(nowMs + leaseDurationMs), heartbeatAt: now, updatedAt: now } });
      return result.count === 1;
    },
    async getByKey(key: string): Promise<ReviewRecord | null> { const row = await rowByKey(key); return row ? parsePayload(row.payloadJson).record ?? null : null; },
    async getById(id: string): Promise<ReviewRecord | null> { const row = await rowById(id); return row ? parsePayload(row.payloadJson).record ?? null : null; },
    async teacherCanAccessReview(id: string, teacherId: string): Promise<boolean> {
      const row = await database.job.findFirst({ where: { id, type: jobType, status: "done" }, select: { payloadJson: true } });
      if (!row) return false;
      let payload: ReviewPayload;
      try { payload = parsePayload(row.payloadJson); } catch { return false; }
      const studentId = payload.context.studentId;
      const classroomId = payload.context.academicLink?.classroomId;
      if (!studentId || !classroomId) return false;
      const classroom = await database.classroom.findFirst({
        where: { id: classroomId, teacherId, status: "active", enrollments: { some: { studentId, status: "active" } } },
        select: { id: true },
      });
      return classroom !== null;
    },
    async save(record: ReviewRecord, lease?: { owner: string }): Promise<ReviewRecord> {
      const row = await rowByKey(record.key); if (!row) throw new Error("No se encontró el trabajo Review para guardar su resultado.");
      const payload = parsePayload(row.payloadJson); const now = new Date();
      const result = await database.job.updateMany({ where: { id: row.id, type: jobType, ...(lease ? { status: "leased", leaseOwner: lease.owner, leaseUntil: { gt: now } } : {}) },
        data: { payloadJson: { ...payload, record } satisfies Prisma.InputJsonValue, updatedAt: now } });
      if (result.count !== 1) throw new Error("La reserva del trabajo Review ya no pertenece a este worker.");
      return record;
    },
    async complete(id: string, workerId: string, nowMs = Date.now()): Promise<boolean> {
      const now = new Date(nowMs);
      return database.$transaction(async (tx) => {
        const row = await tx.job.findUnique({ where: { id } }) as JobRow | null;
        const changed = await tx.job.updateMany({ where: { id, type: jobType, status: "leased", leaseOwner: workerId, leaseUntil: { gt: now } },
          data: { status: "done", leaseOwner: null, leaseUntil: null, lastStage: null, lastErrorCode: null, retryClass: null, nextRetryAt: null, updatedAt: now } });
        if (changed.count === 1 && row) await closeAttempt(tx, row, now, { finalStatus: "completed", stage: "result_persistence", errorCode: null, retryClass: null });
        return changed.count === 1;
      });
    },
    async fail(id: string, workerId: string, failure: ReviewFailure, nowMs = Date.now()): Promise<boolean> {
      const now = new Date(nowMs);
      return database.$transaction(async (tx) => {
        const row = await tx.job.findUnique({ where: { id } }) as JobRow | null; if (!row) return false;
        const payload = parsePayload(row.payloadJson); const retryClass = payload.record ? "manual" : failure.retryClass;
        const retryAt = retryClass === "transient" && row.attempts < REVIEW_MAX_ATTEMPTS ? new Date(nowMs + retryDelayMs(row.attempts)) : null;
        const changed = await tx.job.updateMany({ where: { id, type: jobType, status: "leased", leaseOwner: workerId, leaseUntil: { gt: now } }, data: {
          status: "failed", payloadJson: { ...payload, message: safeFailure } satisfies Prisma.InputJsonValue, leaseOwner: null, leaseUntil: null,
          lastStage: failure.stage, lastErrorCode: failure.errorCode, retryClass, nextRetryAt: retryAt, updatedAt: now,
        } });
        if (changed.count === 1) await closeAttempt(tx, row, now, { finalStatus: "failed", stage: failure.stage, errorCode: failure.errorCode, retryClass, durationMs: failure.durationMs });
        return changed.count === 1;
      });
    },
    saveSubmission, getByVerificationCode, getReviewSubmission,
  };
  return { ...store, evaluations: { getByKey: store.getByKey, getById: store.getById, save: store.save }, submissions: { save: saveSubmission, getByVerificationCode } };
}
