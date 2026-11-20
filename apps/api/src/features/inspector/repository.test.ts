import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createInspectorRepository } from "./repository.js";
import type { InspectorRecord } from "./service.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Inspector Prisma.");
const describePostgres = databaseUrl ? describe : describe.skip;
const id = `inspector-${randomUUID()}`;
let database: PrismaClient | undefined;
let secondDatabase: PrismaClient | undefined;

const record: InspectorRecord = {
  id,
  aiOperationKey: `op-${randomUUID()}`,
  reviewId: `review-${randomUUID()}`,
  projectId: "fixture/demo",
  commitSha: "b".repeat(40),
  challenge: {
    evaluationId: "review-fixture",
    sourceEvidence: [{ source: "repository", path: "src/math.ts", lines: [2, 4], digest: "a".repeat(64) }],
    precondition: "Existe un acumulador.", mutation: "Invierte la condición.", demonstration: "Compara el resultado.",
    restoration: "Restaura la condición.", estimatedMinutes: 15, teacherHint: "Revisa el acumulador.",
  },
  status: "pending",
  createdAt: "2026-11-20T12:00:00.000Z",
};

describePostgres("Inspector Prisma repository (fragments_test)", () => {
  beforeAll(async () => {
    database = openDatabase(databaseUrl!); secondDatabase = openDatabase(databaseUrl!);
    await Promise.all([database.$connect(), secondDatabase.$connect()]);
  });
  afterEach(async () => { if (database) await database.inspectorChallenge.deleteMany({ where: { id } }); });
  afterAll(async () => { await Promise.all([database?.$disconnect(), secondDatabase?.$disconnect()]); });

  it("persists private challenges, assignment and defense through separate Prisma clients", async () => {
    const repository = createInspectorRepository(database!);
    await repository.create(record);
    const assigned = { ...record, status: "assigned" as const, assignedTo: "teacher-fixture", assignedAt: "2026-11-20T12:01:00.000Z" };
    await repository.update(assigned);
    const completed = {
      ...assigned,
      status: "completed" as const,
      defense: { mutationObserved: true, restorationConfirmed: true, notes: "Hecho.", recordedAt: "2026-11-20T12:02:00.000Z" },
    };
    await repository.update(completed);

    const reopened = createInspectorRepository(secondDatabase!);
    expect(await reopened.get(record.id)).toEqual(completed);
    expect(await reopened.listByReview(record.reviewId)).toEqual([completed]);
    const stored = await secondDatabase!.inspectorChallenge.findUniqueOrThrow({ where: { id } });
    expect(stored.challengeJson).toMatchObject({ teacherHint: "Revisa el acumulador." });
  });
});
