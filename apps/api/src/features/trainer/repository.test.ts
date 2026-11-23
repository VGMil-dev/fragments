import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createTrainerRepository, type TrainerChallenge } from "./repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Trainer Prisma.");
const describePostgres = databaseUrl ? describe : describe.skip;
const prefix = `trainer-test-${randomUUID().replaceAll("-", "")}`;
let database: PrismaClient | undefined;
let secondDatabase: PrismaClient | undefined;
let store: ReturnType<typeof createTrainerRepository>;
let secondStore: ReturnType<typeof createTrainerRepository>;
const commitSha = "a".repeat(40);
const reviewId = `${prefix}-review`;
const sessionHash = `${prefix}-session`;
const challenge: TrainerChallenge = {
  id: `${prefix}-challenge`, reviewId, projectId: "fixture/demo", commitSha,
  feature: "Búsqueda", task: "Modifica la búsqueda temporalmente.", expectedObservation: "Compara los resultados.",
  restoration: "Restaura el código.", estimatedMinutes: 15, sourcePath: "src/search.ts", sourceLines: [1, 2],
  hints: ["Observa el comportamiento.", "Busca la función.", "Cambia y restaura."], createdAt: "2026-11-20T12:00:00.000Z",
};

describePostgres("Trainer Prisma repository (fragments_test)", () => {
  beforeAll(async () => {
    database = openDatabase(databaseUrl!); secondDatabase = openDatabase(databaseUrl!);
    await Promise.all([database.$connect(), secondDatabase.$connect()]);
    store = createTrainerRepository(database); secondStore = createTrainerRepository(secondDatabase);
  });
  afterEach(async () => {
    if (!database) return;
    await database.trainerAttempt.deleteMany({ where: { sessionHash: { startsWith: prefix } } });
    await database.trainerSession.deleteMany({ where: { sessionHash: { startsWith: prefix } } });
    await database.trainerBank.deleteMany({ where: { reviewId: { startsWith: prefix } } });
  });
  afterAll(async () => { await Promise.all([database?.$disconnect(), secondDatabase?.$disconnect()]); });

  it("grants a bank generation lease to one concurrent worker and releases it", async () => {
    const claims = await Promise.all([
      store.claimBankGeneration(reviewId, commitSha, `${prefix}-owner-a`, Date.now(), 1_000),
      secondStore.claimBankGeneration(reviewId, commitSha, `${prefix}-owner-b`, Date.now(), 1_000),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    const owner = claims[0] ? `${prefix}-owner-a` : `${prefix}-owner-b`;
    await (claims[0] ? store : secondStore).releaseBankGeneration(reviewId, commitSha, owner);
    expect(await store.claimBankGeneration(reviewId, commitSha, `${prefix}-owner-c`, Date.now(), 1_000)).toBe(true);
  });

  it("persists the challenge bank and scoped session history across Prisma clients", async () => {
    const now = new Date("2026-11-20T12:00:00.000Z");
    await store.ensureSession(sessionHash, now);
    await store.saveBank(reviewId, commitSha, [challenge], now.toISOString());
    const input = { sessionHash, reviewId, challengeId: challenge.id, feature: challenge.feature, status: "completed" as const, hintsUsed: 2, attemptedAt: now.toISOString(), idempotencyKey: randomUUID() };
    const [first, same] = await Promise.all([store.recordAttempt(input), secondStore.recordAttempt(input)]);
    expect(same).toEqual(first);
    expect(same).toEqual(first);

    const reopened = createTrainerRepository(secondDatabase!);
    expect(await reopened.getBank(reviewId, commitSha)).toEqual([challenge]);
    expect(await reopened.history(sessionHash, reviewId)).toMatchObject([{ status: "completed", hintsUsed: 2, feature: "Búsqueda" }]);
    expect(await reopened.history(sessionHash, reviewId)).toHaveLength(1);
    expect(await reopened.practicedFeatures(reviewId)).toEqual(["Búsqueda"]);
    expect(await reopened.ensureSession(sessionHash, now)).toBe(true);
    await expect(reopened.recordAttempt({ ...input, status: "need_more" })).rejects.toThrow("El identificador de intento ya se usó con otros datos.");
  });
});
