import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

export interface NewJob { type: string; payload: unknown; idempotencyKey: string }
export interface Job { id: string; type: string; payload: unknown; status: string; attempts: number; leaseOwner: string | null; leaseUntil: number | null }

export class QueueRepository {
  constructor(private readonly database: DatabaseSync) {}

  enqueue(input: NewJob): Job {
    const now = Date.now();
    this.database.prepare(`INSERT INTO jobs(id,type,payload_json,idempotency_key,created_at,updated_at)
      VALUES(?,?,?,?,?,?) ON CONFLICT(idempotency_key) DO NOTHING`)
      .run(randomUUID(), input.type, JSON.stringify(input.payload), input.idempotencyKey, now, now);
    const row = this.database.prepare("SELECT * FROM jobs WHERE idempotency_key = ?").get(input.idempotencyKey);
    if (!row) throw new Error("No se pudo guardar el trabajo.");
    return this.map(row);
  }

  claim(workerId: string, now = Date.now(), leaseDurationMs = 30_000): Job | null {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = this.database.prepare(`SELECT * FROM jobs WHERE status = 'pending' OR (status = 'leased' AND lease_until <= ?)
        ORDER BY created_at LIMIT 1`).get(now);
      if (!row) { this.database.exec("COMMIT"); return null; }
      const jobId = String(row.id);
      this.database.prepare(`UPDATE jobs SET status='leased', attempts=attempts+1, lease_owner=?, lease_until=?, heartbeat_at=?, updated_at=? WHERE id=?`)
        .run(workerId, now + leaseDurationMs, now, now, jobId);
      const updated = this.database.prepare("SELECT * FROM jobs WHERE id=?").get(jobId);
      this.database.exec("COMMIT");
      return updated ? this.map(updated) : null;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  heartbeat(jobId: string, workerId: string, now = Date.now(), leaseDurationMs = 30_000): boolean {
    return this.database.prepare(`UPDATE jobs SET lease_until=?, heartbeat_at=?, updated_at=? WHERE id=? AND status='leased' AND lease_owner=? AND lease_until>?`)
      .run(now + leaseDurationMs, now, now, jobId, workerId, now).changes === 1;
  }

  complete(jobId: string, workerId: string, now = Date.now()): boolean {
    return this.database.prepare(`UPDATE jobs SET status='done', lease_owner=NULL, lease_until=NULL, heartbeat_at=NULL, updated_at=?
      WHERE id=? AND status='leased' AND lease_owner=? AND lease_until>?`)
      .run(now, jobId, workerId, now).changes === 1;
  }

  fail(jobId: string, workerId: string, options: { retry: boolean; maxAttempts: number; now?: number }): "retry" | "failed" | "stale" {
    if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) throw new Error("maxAttempts debe ser un entero positivo.");
    const now = options.now ?? Date.now();
    const row = this.database.prepare("SELECT attempts FROM jobs WHERE id=? AND status='leased' AND lease_owner=? AND lease_until>?")
      .get(jobId, workerId, now);
    if (!row) return "stale";
    const canRetry = options.retry && Number(row.attempts) < options.maxAttempts;
    this.database.prepare(`UPDATE jobs SET status=?, lease_owner=NULL, lease_until=NULL, heartbeat_at=NULL, updated_at=?
      WHERE id=? AND status='leased' AND lease_owner=? AND lease_until>?`)
      .run(canRetry ? "pending" : "failed", now, jobId, workerId, now);
    return canRetry ? "retry" : "failed";
  }

  private map(row: Record<string, unknown>): Job {
    return { id: String(row.id), type: String(row.type), payload: JSON.parse(String(row.payload_json)), status: String(row.status), attempts: Number(row.attempts), leaseOwner: row.lease_owner ? String(row.lease_owner) : null, leaseUntil: row.lease_until === null ? null : Number(row.lease_until) };
  }
}
