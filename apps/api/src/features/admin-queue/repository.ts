import type { PrismaClient } from "../../generated/prisma/client.js";

export type AdminQueueSummary = {
  sampledAt: string;
  counts: { pending: number; leased: number; expiredLeases: number; failed: number; done: number; other: number };
};
export type AdminQueueSummaryStore = { read(): Promise<AdminQueueSummary> };
const knownStatuses = ["pending", "leased", "failed", "done"] as const;

export function createAdminQueueSummaryRepository(database: PrismaClient, clock: () => Date = () => new Date()): AdminQueueSummaryStore {
  return {
    async read(): Promise<AdminQueueSummary> {
      const sampledAt = clock();
      const [pending, leased, expiredLeases, failed, done, other] = await Promise.all([
        database.job.count({ where: { status: "pending" } }),
        database.job.count({ where: { status: "leased", leaseUntil: { gt: sampledAt } } }),
        database.job.count({ where: { status: "leased", OR: [{ leaseUntil: { lte: sampledAt } }, { leaseUntil: null }] } }),
        database.job.count({ where: { status: "failed" } }),
        database.job.count({ where: { status: "done" } }),
        database.job.count({ where: { status: { notIn: [...knownStatuses] } } }),
      ]);
      return { sampledAt: sampledAt.toISOString(), counts: { pending, leased, expiredLeases, failed, done, other } };
    },
  };
}
