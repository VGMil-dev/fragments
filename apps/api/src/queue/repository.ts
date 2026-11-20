import { randomUUID } from "node:crypto";
import { Prisma } from "../generated/prisma/client.js";
import type { PrismaClient } from "../generated/prisma/client.js";

export interface NewJob { type: string; payload: unknown; idempotencyKey: string }
export interface Job { id: string; type: string; payload: unknown; status: string; attempts: number; leaseOwner: string | null; leaseUntil: number | null }

export class QueueRepository {
  constructor(private readonly database: PrismaClient) {}

  async enqueue(input: NewJob): Promise<Job> {
    await this.database.job.upsert({
      where: { idempotencyKey: input.idempotencyKey },
      create: {
        id: randomUUID(), type: input.type, payloadJson: input.payload as Prisma.InputJsonValue,
        idempotencyKey: input.idempotencyKey, status: "pending", attempts: 0, createdAt: new Date(), updatedAt: new Date(),
      },
      update: {},
    });
    const row = await this.database.job.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (!row) throw new Error("No se pudo guardar el trabajo.");
    return this.map(row);
  }

  async claim(workerId: string, now = Date.now(), leaseDurationMs = 30_000): Promise<Job | null> {
    const nowDate = new Date(now);
    const expiresAt = new Date(now + leaseDurationMs);
    const rows = await this.database.$queryRaw<Array<{
      id: string; type: string; payload_json: unknown; status: string; attempts: number;
      lease_owner: string | null; lease_until: Date | null;
    }>>(Prisma.sql`
      UPDATE jobs SET status = 'leased', attempts = attempts + 1, lease_owner = ${workerId},
        lease_until = ${expiresAt}, heartbeat_at = ${nowDate}, updated_at = ${nowDate}
      WHERE id = (
        SELECT id FROM jobs
        WHERE status = 'pending' OR (status = 'leased' AND lease_until <= ${nowDate})
        ORDER BY created_at
        FOR UPDATE SKIP LOCKED
        LIMIT 1
      )
      RETURNING id, type, payload_json, status, attempts, lease_owner, lease_until
    `);
    return rows[0] ? this.mapRaw(rows[0]) : null;
  }

  async heartbeat(jobId: string, workerId: string, now = Date.now(), leaseDurationMs = 30_000): Promise<boolean> {
    const result = await this.database.job.updateMany({
      where: { id: jobId, status: "leased", leaseOwner: workerId, leaseUntil: { gt: new Date(now) } },
      data: { leaseUntil: new Date(now + leaseDurationMs), heartbeatAt: new Date(now), updatedAt: new Date(now) },
    });
    return result.count === 1;
  }

  async complete(jobId: string, workerId: string, now = Date.now()): Promise<boolean> {
    const result = await this.database.job.updateMany({
      where: { id: jobId, status: "leased", leaseOwner: workerId, leaseUntil: { gt: new Date(now) } },
      data: { status: "done", leaseOwner: null, leaseUntil: null, heartbeatAt: null, updatedAt: new Date(now) },
    });
    return result.count === 1;
  }

  async fail(jobId: string, workerId: string, options: { retry: boolean; maxAttempts: number; now?: number }): Promise<"retry" | "failed" | "stale"> {
    if (!Number.isInteger(options.maxAttempts) || options.maxAttempts < 1) throw new Error("maxAttempts debe ser un entero positivo.");
    const now = options.now ?? Date.now();
    return this.database.$transaction(async (tx) => {
      const row = await tx.job.findFirst({
        where: { id: jobId, status: "leased", leaseOwner: workerId, leaseUntil: { gt: new Date(now) } },
        select: { attempts: true },
      });
      if (!row) return "stale";
      const canRetry = options.retry && row.attempts < options.maxAttempts;
      const result = await tx.job.updateMany({
        where: { id: jobId, status: "leased", leaseOwner: workerId, leaseUntil: { gt: new Date(now) } },
        data: { status: canRetry ? "pending" : "failed", leaseOwner: null, leaseUntil: null, heartbeatAt: null, updatedAt: new Date(now) },
      });
      if (result.count !== 1) return "stale";
      return canRetry ? "retry" : "failed";
    });
  }

  private map(row: { id: string; type: string; payloadJson: unknown; status: string; attempts: number; leaseOwner: string | null; leaseUntil: Date | null }): Job {
    return { id: row.id, type: row.type, payload: row.payloadJson, status: row.status, attempts: row.attempts, leaseOwner: row.leaseOwner, leaseUntil: row.leaseUntil?.getTime() ?? null };
  }

  private mapRaw(row: { id: string; type: string; payload_json: unknown; status: string; attempts: number; lease_owner: string | null; lease_until: Date | null }): Job {
    return { id: row.id, type: row.type, payload: row.payload_json, status: row.status, attempts: row.attempts, leaseOwner: row.lease_owner, leaseUntil: row.lease_until?.getTime() ?? null };
  }
}
