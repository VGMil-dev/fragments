import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  ReviewRequestSchema,
  ReviewResponseSchema,
  SubmissionResponseSchema,
  type ReviewRequest,
} from "@fragments/contracts";
import type { ReviewContext, ReviewRecord } from "./review.service.js";
import { reviewIdempotencyKey } from "./review.service.js";
import type { ReviewFailure, ReviewStage } from "./review-errors.js";

export type ReviewJobStatus = "queued" | "running" | "completed" | "failed";
export type ReviewJobView = {
  id: string;
  key: string;
  owner: string;
  repo: string;
  commitSha: string;
  status: ReviewJobStatus;
  progress: number;
  createdAt: string;
  updatedAt: string;
  message?: string;
  record?: ReviewRecord;
};
export type ClaimedReviewJob = ReviewJobView & { status: "running"; request: ReviewRequest; context: ReviewContext; attempts: number };

type ReviewPayload = { request: ReviewRequest; context: ReviewContext; record?: ReviewRecord; message?: string };
type JobRow = {
  id: string;
  type: string;
  payload_json: string;
  idempotency_key: string;
  status: string;
  attempts: number;
  lease_owner: string | null;
  lease_until: number | null;
  last_stage: string | null;
  last_error_code: string | null;
  retry_class: "transient" | "permanent" | "manual" | null;
  next_retry_at: number | null;
  created_at: number;
  updated_at: number;
};
type SubmissionRow = {
  id: string;
  kind: "mentor" | "review";
  source_id: string;
  score: number;
  snapshot_json: string;
  content_hash: string;
  verification_code: string;
  rubric_version: string;
  created_at: string;
};

const jobType = "review";
const safeFailure = "No se pudo completar la revisión en este momento.";
export const REVIEW_MAX_ATTEMPTS = 3;

function retryDelayMs(attempt: number): number {
  return Math.min(5 * 60_000, 30_000 * (2 ** Math.max(0, attempt - 1)));
}

function parsePayload(raw: string): ReviewPayload {
  const value = JSON.parse(raw) as ReviewPayload;
  return {
    request: ReviewRequestSchema.parse(value.request),
    context: parseContext(value.context),
    ...(value.record ? { record: value.record } : {}),
    ...(value.message ? { message: value.message } : {}),
  };
}

function parseContext(value: unknown): ReviewContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Contexto Review inválido en almacenamiento.");
  const context = value as Record<string, unknown>;
  for (const field of ["projectId", "rubricVersion", "evaluatorVersion"] as const) {
    if (typeof context[field] !== "string" || !context[field].trim()) throw new Error("Contexto Review inválido en almacenamiento.");
  }
  return {
    projectId: String(context.projectId),
    rubricVersion: String(context.rubricVersion),
    evaluatorVersion: String(context.evaluatorVersion),
    ...(typeof context.studentId === "string" ? { studentId: context.studentId } : {}),
  };
}

function parseSubmission(row: SubmissionRow) {
  return SubmissionResponseSchema.parse({
    id: row.id,
    kind: row.kind,
    sourceId: row.source_id,
    score: row.score,
    snapshotJson: JSON.parse(row.snapshot_json) as unknown,
    contentHash: row.content_hash,
    verificationCode: row.verification_code,
    rubricVersion: row.rubric_version,
    createdAt: row.created_at,
  });
}

export function createSqliteReviewStore(database: DatabaseSync) {
  function rowById(id: string): JobRow | null {
    return (database.prepare("SELECT * FROM jobs WHERE id = ? AND type = ?").get(id, jobType) as JobRow | undefined) ?? null;
  }

  function rowByKey(key: string): JobRow | null {
    return (database.prepare("SELECT * FROM jobs WHERE idempotency_key = ? AND type = ?").get(key, jobType) as JobRow | undefined) ?? null;
  }

  function view(row: JobRow): ReviewJobView {
    const payload = parsePayload(row.payload_json);
    const status: ReviewJobStatus = row.status === "done" ? "completed" : row.status === "failed" ? "failed" : row.status === "leased" ? "running" : "queued";
    const result = ReviewResponseSchema.parse(status === "completed" && payload.record ? {
      id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
      status, analysis: payload.record.analysis, progress: 100, updatedAt: new Date(row.updated_at).toISOString(),
    } : status === "failed" ? {
      id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
      status, message: payload.message ?? safeFailure, updatedAt: new Date(row.updated_at).toISOString(),
    } : status === "running" ? {
      id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
      status, progress: 25, updatedAt: new Date(row.updated_at).toISOString(),
    } : {
      id: row.id, owner: payload.request.owner, repo: payload.request.repo, commitSha: payload.request.commitSha,
      status: "queued", createdAt: new Date(row.created_at).toISOString(), progress: 0, updatedAt: new Date(row.updated_at).toISOString(),
    });
    return {
      id: row.id,
      key: row.idempotency_key,
      owner: payload.request.owner,
      repo: payload.request.repo,
      commitSha: payload.request.commitSha,
      status: result.status,
      progress: result.status === "completed" ? 100 : result.status === "running" ? result.progress : 0,
      createdAt: new Date(row.created_at).toISOString(),
      updatedAt: new Date(row.updated_at).toISOString(),
      ...(result.status === "failed" ? { message: result.message } : {}),
      ...(result.status === "completed" && payload.record ? { record: payload.record } : {}),
    };
  }

  function closeAttempt(row: JobRow, now: number, input: { finalStatus: "completed" | "failed"; stage: string; errorCode: string | null; retryClass: string | null; durationMs?: number }): void {
    const attempt = database.prepare("SELECT attempt, started_at FROM review_attempts WHERE job_id=? AND final_status='running' ORDER BY attempt DESC LIMIT 1").get(row.id) as { attempt: number; started_at: number } | undefined;
    if (!attempt) return;
    const durationMs = input.durationMs ?? Math.max(0, now - attempt.started_at);
    database.prepare(`UPDATE review_attempts SET finished_at=?, duration_ms=?, stage=?, error_code=?, retry_class=?, final_status=?
      WHERE job_id=? AND attempt=? AND final_status='running'`)
      .run(now, durationMs, input.stage, input.errorCode, input.retryClass, input.finalStatus, row.id, attempt.attempt);
  }

  async function saveSubmission(submission: ReturnType<typeof SubmissionResponseSchema.parse>): Promise<void> {
    const parsed = SubmissionResponseSchema.parse(submission);
    database.prepare(`INSERT INTO submissions
      (id, kind, source_id, score, snapshot_json, content_hash, verification_code, rubric_version, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(parsed.id, parsed.kind, parsed.sourceId, parsed.score, JSON.stringify(parsed.snapshotJson), parsed.contentHash,
        parsed.verificationCode, parsed.rubricVersion, parsed.createdAt);
  }

  async function getByVerificationCode(code: string): Promise<unknown | null> {
    const row = database.prepare("SELECT * FROM submissions WHERE verification_code = ? AND kind = 'review'").get(code) as SubmissionRow | undefined;
    return row ? parseSubmission(row) : null;
  }

  function getReviewSubmission(id: string) {
    const row = database.prepare("SELECT * FROM submissions WHERE id = ? AND kind = 'review'").get(id) as SubmissionRow | undefined;
    return row ? parseSubmission(row) : null;
  }

  const store = {
    async enqueue(input: { request: ReviewRequest; context: ReviewContext }): Promise<ReviewJobView> {
      const request = ReviewRequestSchema.parse(input.request);
      const context = parseContext(input.context);
      const key = await reviewIdempotencyKey(request, context);
      const now = Date.now();
      database.prepare(`INSERT INTO jobs(id,type,payload_json,idempotency_key,created_at,updated_at)
        VALUES(?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING`)
        .run(randomUUID(), jobType, JSON.stringify({ request, context } satisfies ReviewPayload), key, now, now);
      const row = rowByKey(key);
      if (!row || row.type !== jobType) throw new Error("No se pudo crear el trabajo Review.");
      return view(row);
    },

    /** Explicit student retry; no scheduler retries jobs automatically. */
    retryFailed(id: string, now = Date.now()):
      | { kind: "queued"; job: ReviewJobView }
      | { kind: "already_queued"; job: ReviewJobView }
      | { kind: "completed"; job: ReviewJobView }
      | { kind: "missing" }
      | { kind: "not_retryable" }
      | { kind: "too_early" }
      | { kind: "exhausted" } {
      database.exec("BEGIN IMMEDIATE");
      try {
        let row = rowById(id);
        if (!row) { database.exec("COMMIT"); return { kind: "missing" }; }
        if (row.status === "done") {
          const job = view(row);
          database.exec("COMMIT");
          return { kind: "completed", job };
        }
        if (row.status === "pending" || row.status === "leased") {
          const job = view(row);
          database.exec("COMMIT");
          return { kind: "already_queued", job };
        }

        const payload = parsePayload(row.payload_json);
        if (payload.record) {
          database.prepare("UPDATE jobs SET status='done', lease_owner=NULL, lease_until=NULL, last_stage=NULL, last_error_code=NULL, retry_class=NULL, next_retry_at=NULL, updated_at=? WHERE id=? AND type=? AND status='failed'")
            .run(now, id, jobType);
          row = rowById(id);
          if (!row) throw new Error("Review row disappeared during idempotent recovery.");
          database.prepare(`UPDATE review_attempts SET finished_at=?, duration_ms=MAX(0, ? - started_at), stage='result_persistence', error_code=NULL, retry_class=NULL, final_status='completed'
            WHERE job_id=? AND attempt=?`)
            .run(now, now, row.id, row.attempts);
          const job = view(row);
          database.exec("COMMIT");
          return { kind: "completed", job };
        }
        if (row.attempts >= REVIEW_MAX_ATTEMPTS) { database.exec("COMMIT"); return { kind: "exhausted" }; }
        if (row.retry_class !== "transient") { database.exec("COMMIT"); return { kind: "not_retryable" }; }
        if (row.next_retry_at === null || now < row.next_retry_at) { database.exec("COMMIT"); return { kind: "too_early" }; }

        const changed = database.prepare(`UPDATE jobs SET status='pending', lease_owner=NULL, lease_until=NULL,
          last_stage=NULL, last_error_code=NULL, retry_class=NULL, next_retry_at=NULL, updated_at=?
          WHERE id=? AND type=? AND status='failed' AND retry_class='transient' AND attempts<? AND next_retry_at<=?`)
          .run(now, id, jobType, REVIEW_MAX_ATTEMPTS, now).changes;
        row = rowById(id);
        database.exec("COMMIT");
        if (changed !== 1 || !row) return row ? { kind: "already_queued", job: view(row) } : { kind: "missing" };
        return { kind: "queued", job: view(row) };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    setStage(id: string, workerId: string, stage: ReviewStage, now = Date.now()): boolean {
      database.exec("BEGIN IMMEDIATE");
      try {
        const changed = database.prepare("UPDATE jobs SET last_stage=?, updated_at=? WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?")
          .run(stage, now, id, jobType, workerId, now).changes;
        if (changed === 1) {
          database.prepare("UPDATE review_attempts SET stage=? WHERE job_id=? AND attempt=? AND final_status='running'")
            .run(stage, id, Number(rowById(id)?.attempts ?? 0));
        }
        database.exec("COMMIT");
        return changed === 1;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    reconcileExpiredLeases(now = Date.now()): Array<{ id: string; attempt: number; stage: ReviewStage; errorCode: string | null; finalStatus: "completed" | "failed"; durationMs: number }> {
      database.exec("BEGIN IMMEDIATE");
      try {
        const staleRows = database.prepare("SELECT * FROM jobs WHERE type=? AND status='leased' AND lease_until<=? ORDER BY created_at")
          .all(jobType, now) as unknown as JobRow[];
        const results = [] as Array<{ id: string; attempt: number; stage: ReviewStage; errorCode: string | null; finalStatus: "completed" | "failed"; durationMs: number }>;
        for (const stale of staleRows) {
          const payload = parsePayload(stale.payload_json);
          const attempt = database.prepare("SELECT started_at FROM review_attempts WHERE job_id=? AND attempt=? AND final_status='running'")
            .get(stale.id, stale.attempts) as { started_at: number } | undefined;
          const durationMs = Math.max(0, now - (attempt?.started_at ?? stale.created_at));
          if (payload.record) {
            database.prepare("UPDATE jobs SET status='done', lease_owner=NULL, lease_until=NULL, last_stage=NULL, last_error_code=NULL, retry_class=NULL, next_retry_at=NULL, updated_at=? WHERE id=? AND type=? AND status='leased' AND lease_until<=?")
              .run(now, stale.id, jobType, now);
            closeAttempt(stale, now, { finalStatus: "completed", stage: "result_persistence", errorCode: null, retryClass: null, durationMs });
            results.push({ id: stale.id, attempt: stale.attempts, stage: "result_persistence", errorCode: null, finalStatus: "completed", durationMs });
            continue;
          }
          const lastStage = stale.last_stage as ReviewStage | null;
          const beforeAi = lastStage === "repository" || lastStage === "snapshot_validation" || lastStage === "packing";
          const stage: ReviewStage = lastStage ?? "queue_claim";
          const errorCode = beforeAi ? "REVIEW_LEASE_EXPIRED" : "AI_OUTCOME_UNCERTAIN";
          const retryClass = beforeAi ? "transient" : "manual";
          const retryAt = beforeAi && stale.attempts < REVIEW_MAX_ATTEMPTS ? now + retryDelayMs(stale.attempts) : null;
          database.prepare(`UPDATE jobs SET status='failed', lease_owner=NULL, lease_until=NULL, last_stage=?, last_error_code=?, retry_class=?, next_retry_at=?,
            payload_json=?, updated_at=? WHERE id=? AND type=? AND status='leased' AND lease_until<=?`)
            .run(stage, errorCode, retryClass, retryAt, JSON.stringify({ ...payload, message: safeFailure }), now, stale.id, jobType, now);
          closeAttempt(stale, now, { finalStatus: "failed", stage, errorCode, retryClass, durationMs });
          results.push({ id: stale.id, attempt: stale.attempts, stage, errorCode, finalStatus: "failed", durationMs });
        }
        database.exec("COMMIT");
        return results;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    getAttemptHistory(id: string) {
      return database.prepare(`SELECT attempt, started_at AS startedAt, finished_at AS finishedAt, duration_ms AS durationMs,
        stage, error_code AS errorCode, retry_class AS retryClass, final_status AS finalStatus
        FROM review_attempts WHERE job_id=? ORDER BY attempt`).all(id) as Array<Record<string, unknown>>;
    },

    getJob(id: string): ReviewJobView | null {
      const row = rowById(id);
      return row ? view(row) : null;
    },

    getStudentIdForJob(id: string): string | null {
      const row = database.prepare("SELECT payload_json FROM jobs WHERE id = ? AND type = ?").get(id, jobType) as { payload_json: string } | undefined;
      if (!row) return null;
      try {
        const context = (JSON.parse(row.payload_json) as ReviewPayload).context;
        return typeof context?.studentId === "string" ? context.studentId : null;
      } catch { return null; }
    },

    listCompleted() {
      const rows = database.prepare("SELECT * FROM jobs WHERE type = ? AND status = 'done' ORDER BY updated_at DESC LIMIT 100")
        .all(jobType) as unknown as JobRow[];
      return rows.map(view).filter((job) => job.record).map((job) => ({
        id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha, updatedAt: job.updatedAt,
      }));
    },

    listCompletedForStudent(studentId: string) {
      const rows = database.prepare(`SELECT * FROM jobs WHERE type = ? AND status = 'done'
        AND json_extract(payload_json, '$.context.studentId') = ? ORDER BY updated_at DESC LIMIT 100`)
        .all(jobType, studentId) as unknown as JobRow[];
      return rows.map(view).filter((job) => job.record).map((job) => ({
        id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha, updatedAt: job.updatedAt,
      }));
    },

    async getLatestCommit(projectId: string): Promise<string | null> {
      const rows = database.prepare("SELECT * FROM jobs WHERE type = ? AND status = 'done' ORDER BY updated_at DESC, created_at DESC")
        .all(jobType) as unknown as JobRow[];
      for (const row of rows) {
        const payload = parsePayload(row.payload_json);
        if (payload.context.projectId === projectId && payload.record) return payload.request.commitSha;
      }
      return null;
    },

    claim(workerId: string, now = Date.now(), leaseDurationMs = 30_000): ClaimedReviewJob | null {
      database.exec("BEGIN IMMEDIATE");
      try {
        const row = database.prepare("SELECT * FROM jobs WHERE type = ? AND status='pending' ORDER BY created_at LIMIT 1").get(jobType) as JobRow | undefined;
        if (!row) { database.exec("COMMIT"); return null; }
        database.prepare(`UPDATE jobs SET status='leased', attempts=attempts+1, lease_owner=?, lease_until=?, heartbeat_at=?, updated_at=? WHERE id=? AND type=?`)
          .run(workerId, now + leaseDurationMs, now, now, row.id, jobType);
        const claimed = rowById(row.id);
        database.prepare("INSERT INTO review_attempts(job_id,attempt,started_at,final_status) VALUES(?,?,?,'running')")
          .run(row.id, Number(row.attempts) + 1, now);
        database.exec("COMMIT");
        if (!claimed) return null;
        const payload = parsePayload(claimed.payload_json);
        return {
          ...view(claimed), status: "running", request: payload.request, context: payload.context,
          attempts: claimed.attempts,
        };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    heartbeat(id: string, workerId: string, now = Date.now(), leaseDurationMs = 30_000): boolean {
      return database.prepare(`UPDATE jobs SET lease_until=?, heartbeat_at=?, updated_at=? WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?`)
        .run(now + leaseDurationMs, now, now, id, jobType, workerId, now).changes === 1;
    },

    async getByKey(key: string): Promise<ReviewRecord | null> {
      const row = rowByKey(key);
      if (!row) return null;
      return parsePayload(row.payload_json).record ?? null;
    },

    async getById(id: string): Promise<ReviewRecord | null> {
      const row = rowById(id);
      if (!row) return null;
      return parsePayload(row.payload_json).record ?? null;
    },

    async save(record: ReviewRecord, lease?: { owner: string }): Promise<ReviewRecord> {
      const row = rowByKey(record.key);
      if (!row) throw new Error("No se encontró el trabajo Review para guardar su resultado.");
      const payload = parsePayload(row.payload_json);
      const serialized = JSON.stringify({ ...payload, record });
      const result = lease
        ? database.prepare("UPDATE jobs SET payload_json=?, updated_at=? WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?")
          .run(serialized, Date.now(), row.id, jobType, lease.owner, Date.now())
        : database.prepare("UPDATE jobs SET payload_json=?, updated_at=? WHERE id=? AND type=?")
          .run(serialized, Date.now(), row.id, jobType);
      if (result.changes !== 1) throw new Error("La reserva del trabajo Review ya no pertenece a este worker.");
      return record;
    },

    complete(id: string, workerId: string, now = Date.now()): boolean {
      database.exec("BEGIN IMMEDIATE");
      try {
        const row = rowById(id);
        const changed = database.prepare(`UPDATE jobs SET status='done', lease_owner=NULL, lease_until=NULL, last_stage=NULL, last_error_code=NULL, retry_class=NULL, next_retry_at=NULL, updated_at=?
          WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?`)
          .run(now, id, jobType, workerId, now).changes;
        if (changed === 1 && row) closeAttempt(row, now, { finalStatus: "completed", stage: "result_persistence", errorCode: null, retryClass: null });
        database.exec("COMMIT");
        return changed === 1;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    fail(id: string, workerId: string, failure: ReviewFailure, now = Date.now()): boolean {
      const row = rowById(id);
      if (!row) return false;
      const payload = parsePayload(row.payload_json);
      database.exec("BEGIN IMMEDIATE");
      try {
        const retryClass = payload.record ? "manual" : failure.retryClass;
        const retryAt = retryClass === "transient" && row.attempts < REVIEW_MAX_ATTEMPTS ? now + retryDelayMs(row.attempts) : null;
        const changed = database.prepare(`UPDATE jobs SET status='failed', payload_json=?, lease_owner=NULL, lease_until=NULL,
          last_stage=?, last_error_code=?, retry_class=?, next_retry_at=?, updated_at=?
          WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?`)
          .run(JSON.stringify({ ...payload, message: safeFailure }), failure.stage, failure.errorCode, retryClass, retryAt, now, id, jobType, workerId, now).changes;
        if (changed === 1) closeAttempt(row, now, { finalStatus: "failed", stage: failure.stage, errorCode: failure.errorCode, retryClass, durationMs: failure.durationMs });
        database.exec("COMMIT");
        return changed === 1;
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    saveSubmission,
    getByVerificationCode,
    getReviewSubmission,
  };
  return {
    ...store,
    evaluations: { getByKey: store.getByKey, getById: store.getById, save: store.save },
    submissions: { save: saveSubmission, getByVerificationCode },
  };

}
