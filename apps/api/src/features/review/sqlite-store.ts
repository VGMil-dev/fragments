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

    getJob(id: string): ReviewJobView | null {
      const row = rowById(id);
      return row ? view(row) : null;
    },

    listCompleted() {
      const rows = database.prepare("SELECT * FROM jobs WHERE type = ? AND status = 'done' ORDER BY updated_at DESC LIMIT 100")
        .all(jobType) as unknown as JobRow[];
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
        const row = database.prepare(`SELECT * FROM jobs WHERE type = ? AND (status = 'pending' OR (status = 'leased' AND lease_until <= ?))
          ORDER BY created_at LIMIT 1`).get(jobType, now) as JobRow | undefined;
        if (!row) { database.exec("COMMIT"); return null; }
        database.prepare(`UPDATE jobs SET status='leased', attempts=attempts+1, lease_owner=?, lease_until=?, heartbeat_at=?, updated_at=? WHERE id=? AND type=?`)
          .run(workerId, now + leaseDurationMs, now, now, row.id, jobType);
        const claimed = rowById(row.id);
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
      if (!row || row.status !== "done") return null;
      return parsePayload(row.payload_json).record ?? null;
    },

    async getById(id: string): Promise<ReviewRecord | null> {
      const row = rowById(id);
      if (!row || row.status !== "done") return null;
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
      return database.prepare(`UPDATE jobs SET status='done', lease_owner=NULL, lease_until=NULL, updated_at=? WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?`)
        .run(now, id, jobType, workerId, now).changes === 1;
    },

    fail(id: string, workerId: string, _message = safeFailure, now = Date.now()): boolean {
      const row = rowById(id);
      if (!row) return false;
      const payload = parsePayload(row.payload_json);
      database.exec("BEGIN IMMEDIATE");
      try {
        const changed = database.prepare(`UPDATE jobs SET status='failed', payload_json=?, lease_owner=NULL, lease_until=NULL, updated_at=?
          WHERE id=? AND type=? AND status='leased' AND lease_owner=? AND lease_until>?`)
          .run(JSON.stringify({ request: payload.request, context: payload.context, message: safeFailure }), now, id, jobType, workerId, now).changes === 1;
        database.exec("COMMIT");
        return changed;
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
