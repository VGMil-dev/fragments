import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { QueueRepository } from "./repository.js";

const prefix = `queue-test-${randomUUID()}`;
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar la integración de cola PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
let firstDb: PrismaClient;
let secondDb: PrismaClient;
let first: QueueRepository;
let second: QueueRepository;

describePostgres("QueueRepository PostgreSQL", () => {
  beforeAll(async () => {
    firstDb = openDatabase(databaseUrl!);
    secondDb = openDatabase(databaseUrl!);
    await Promise.all([firstDb.$connect(), secondDb.$connect()]);
    first = new QueueRepository(firstDb);
    second = new QueueRepository(secondDb);
  });
  afterAll(async () => {
    if (!firstDb) return;
    await firstDb.job.deleteMany({ where: { idempotencyKey: { startsWith: prefix } } });
    await Promise.all([firstDb.$disconnect(), secondDb.$disconnect()]);
  });
  it("returns one idempotent job and grants only one active lease", async () => {
    const key = `${prefix}-same-key`;
    const job = await first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: key });
    expect((await second.enqueue({ type: "fixture.echo", payload: {}, idempotencyKey: key })).id).toBe(job.id);

    const lease = await first.claim("worker-a", 1000, 10);
    expect(lease?.id).toBe(job.id);
    expect(await second.claim("worker-b", 1000, 10)).toBeNull();
    expect(await first.complete(job.id, "worker-a", 1001)).toBe(true);
  });

  it("reclaims an expired lease with the same job identity", async () => {
    const job = await first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: `${prefix}-retry-key` });
    expect((await first.claim("worker-a", 1000, 10))?.id).toBe(job.id);
    expect((await second.claim("worker-b", 1011, 10))?.id).toBe(job.id);
    expect(await second.complete(job.id, "worker-b", 1022)).toBe(true);
  });

  it("uses PostgreSQL row locks to grant a concurrent claim to one worker", async () => {
    const job = await first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: `${prefix}-parallel-key` });
    const claims = await Promise.all([first.claim("worker-a", 3000, 1000), second.claim("worker-b", 3000, 1000)]);
    const granted = claims.filter((claim) => claim?.id === job.id);
    expect(granted).toHaveLength(1);
    const lease = granted[0]!;
    expect(await (lease.leaseOwner === "worker-a" ? first : second).complete(job.id, lease.leaseOwner!, 3001)).toBe(true);
  });

  it("completes a leased job only for its current worker", async () => {
    const job = await first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: `${prefix}-done-key` });
    await first.claim("worker-a", 1000, 10);

    expect(await first.complete(job.id, "worker-b", 1001)).toBe(false);
    expect(await first.complete(job.id, "worker-a", 1001)).toBe(true);
    expect(await second.claim("worker-b", 2000, 10)).toBeNull();
  });

  it("requeues a transient failure and terminally fails an exhausted job", async () => {
    const job = await first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: `${prefix}-failure-key` });
    await first.claim("worker-a", 1000, 10);
    expect(await first.fail(job.id, "worker-a", { retry: true, maxAttempts: 2, now: 1001 })).toBe("retry");
    expect((await second.claim("worker-b", 1002, 10))?.attempts).toBe(2);
    expect(await second.fail(job.id, "worker-b", { retry: true, maxAttempts: 2, now: 1003 })).toBe("failed");
    expect(await first.claim("worker-c", 2000, 10)).toBeNull();
  });
});
