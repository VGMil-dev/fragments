import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client.js";

export type TrainerStatus = "pending" | "in_progress" | "completed" | "need_more";
export type TrainerChallenge = {
  id: string;
  reviewId: string;
  projectId: string;
  commitSha: string;
  feature: string;
  task: string;
  expectedObservation: string;
  restoration: string;
  estimatedMinutes: number;
  sourcePath: string;
  sourceLines: [number, number];
  hints: [string, string, string];
  createdAt: string;
};
export type TrainerAttempt = {
  id: string;
  reviewId: string;
  challengeId: string;
  feature: string;
  status: TrainerStatus;
  hintsUsed: number;
  attemptedAt: string;
};

export function createTrainerRepository(database: PrismaClient) {
  return {
    async ensureSession(sessionHash: string, now: Date): Promise<boolean> {
      const expiresAt = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
      const existing = await database.trainerSession.findUnique({ where: { sessionHash }, select: { expiresAt: true } });
      if (existing && existing.expiresAt > now) {
        await database.trainerSession.update({ where: { sessionHash }, data: { expiresAt } });
        return true;
      }
      await database.trainerSession.upsert({
        where: { sessionHash },
        create: { sessionHash, createdAt: now, expiresAt },
        update: { createdAt: now, expiresAt },
      });
      return false;
    },

    async getBank(reviewId: string, commitSha: string): Promise<TrainerChallenge[] | null> {
      const row = await database.trainerBank.findUnique({ where: { reviewId_commitSha: { reviewId, commitSha } }, select: { challengesJson: true } });
      return row ? row.challengesJson as TrainerChallenge[] : null;
    },

    async isBankReady(reviewId: string, commitSha: string): Promise<boolean> {
      const row = await database.trainerBank.findUnique({ where: { reviewId_commitSha: { reviewId, commitSha } }, select: { bankReady: true } });
      return row?.bankReady === true;
    },

    async claimBankGeneration(reviewId: string, commitSha: string, owner: string, now: number, leaseMs: number): Promise<boolean> {
      const timestamp = new Date(now);
      const timestampMs = BigInt(now);
      await database.trainerBank.upsert({
        where: { reviewId_commitSha: { reviewId, commitSha } },
        create: { reviewId, commitSha, challengesJson: [], createdAt: timestamp, bankReady: false },
        update: {},
      });
      const result = await database.trainerBank.updateMany({
        where: { reviewId, commitSha, bankReady: false, OR: [{ generationOwner: null }, { generationLeaseUntil: { lte: timestampMs } }] },
        data: { generationOwner: owner, generationLeaseUntil: BigInt(now + leaseMs) },
      });
      return result.count === 1;
    },

    async releaseBankGeneration(reviewId: string, commitSha: string, owner: string): Promise<void> {
      await database.trainerBank.updateMany({
        where: { reviewId, commitSha, generationOwner: owner, bankReady: false },
        data: { generationOwner: null, generationLeaseUntil: null },
      });
    },

    async saveBank(reviewId: string, commitSha: string, challenges: TrainerChallenge[], createdAt: string, ready = true, generationOwner?: string): Promise<TrainerChallenge[]> {
      return database.$transaction(async (tx) => {
        const key = { reviewId_commitSha: { reviewId, commitSha } };
        const currentRow = await tx.trainerBank.findUnique({ where: key, select: { challengesJson: true } });
        const current = currentRow ? currentRow.challengesJson as TrainerChallenge[] : [];
        const byFeature = new Map(current.map((challenge) => [challenge.feature, challenge]));
        for (const challenge of challenges) if (!byFeature.has(challenge.feature)) byFeature.set(challenge.feature, challenge);
        const merged = [...byFeature.values()];
        if (generationOwner) {
          const result = await tx.trainerBank.updateMany({
            where: { reviewId, commitSha, generationOwner, bankReady: false },
            data: { challengesJson: merged, bankReady: ready, generationOwner: null, generationLeaseUntil: null },
          });
          if (result.count !== 1) throw new Error("Se perdió la reserva de generación del banco Trainer.");
        } else {
          await tx.trainerBank.upsert({
            where: key,
            create: { reviewId, commitSha, challengesJson: merged, createdAt: new Date(createdAt), bankReady: ready },
            update: { challengesJson: merged, bankReady: ready },
          });
        }
        return merged;
      });
    },

    async history(sessionHash: string, reviewId?: string): Promise<TrainerAttempt[]> {
      const rows = await database.trainerAttempt.findMany({
        where: { sessionHash, ...(reviewId ? { reviewId } : {}) },
        orderBy: { attemptedAt: "desc" }, take: 200,
        select: { id: true, reviewId: true, challengeId: true, feature: true, status: true, hintsUsed: true, attemptedAt: true },
      });
      return rows.map((row) => ({ ...row, status: row.status as TrainerStatus, attemptedAt: row.attemptedAt.toISOString() }));
    },

    async practicedFeatures(reviewId: string): Promise<string[]> {
      const rows = await database.trainerAttempt.groupBy({ by: ["feature"], where: { reviewId }, _max: { attemptedAt: true }, orderBy: { _max: { attemptedAt: "desc" } }, take: 20 });
      return rows.map((row) => row.feature);
    },

    async recordAttempt(input: Omit<TrainerAttempt, "id"> & { sessionHash: string }): Promise<TrainerAttempt> {
      const id = randomUUID();
      const attemptedAt = new Date(input.attemptedAt);
      await database.trainerAttempt.create({
        data: { id, sessionHash: input.sessionHash, reviewId: input.reviewId, challengeId: input.challengeId, feature: input.feature, status: input.status, hintsUsed: input.hintsUsed, attemptedAt },
      });
      return { id, reviewId: input.reviewId, challengeId: input.challengeId, feature: input.feature, status: input.status, hintsUsed: input.hintsUsed, attemptedAt: attemptedAt.toISOString() };
    },
  };
}
