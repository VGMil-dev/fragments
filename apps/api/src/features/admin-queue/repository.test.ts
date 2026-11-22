import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createAdminQueueSummaryRepository } from "./repository.js";

describe("admin queue summary repository with fake Prisma delegate", () => {
  it("counts known states and lease expiry at one sampled time without reading job content", async () => {
    const sampledAt = new Date("2026-11-22T15:00:00.000Z");
    const counts = [2, 1, 3, 4, 20, 1];
    const count = vi.fn(async () => counts[count.mock.calls.length - 1]!);
    const prisma = { job: { count } } as unknown as PrismaClient;

    const summary = await createAdminQueueSummaryRepository(prisma, () => sampledAt).read();

    expect(count).toHaveBeenCalledTimes(6);
    expect(count.mock.calls.map(([arg]) => arg)).toEqual([
      { where: { status: "pending" } },
      { where: { status: "leased", leaseUntil: { gt: sampledAt } } },
      { where: { status: "leased", OR: [{ leaseUntil: { lte: sampledAt } }, { leaseUntil: null }] } },
      { where: { status: "failed" } },
      { where: { status: "done" } },
      { where: { status: { notIn: ["pending", "leased", "failed", "done"] } } },
    ]);
    expect(summary).toEqual({ sampledAt: sampledAt.toISOString(), counts: { pending: 2, leased: 1, expiredLeases: 3, failed: 4, done: 20, other: 1 } });
    expect(JSON.stringify(summary)).not.toMatch(/payload|jobId|leaseOwner|error|secret/i);
  });
});
