import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createPrismaMentorRepository } from "./prisma-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para Mentor repository PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID();
const studentId = `mentor-repository-${namespace}`;
const reviewJobIds = [`mentor-history-${namespace}-old`, `mentor-history-${namespace}-new`, `mentor-history-${namespace}-other`];
const reviewSubmissionIds = [`mentor-history-submission-${namespace}-old`, `mentor-history-submission-${namespace}-new`, `mentor-history-submission-${namespace}-other`, `mentor-history-submission-${namespace}-mentor`, `mentor-history-submission-${namespace}-invalid-sha`];
let database: PrismaClient;
let safeTestDatabase = false;

describePostgres("Mentor Prisma repository ownership and revisions", () => {
  beforeAll(async () => {
    database = openDatabase(databaseUrl!);
    await database.$connect();
    const [{ currentDatabase }] = await database.$queryRaw<Array<{ currentDatabase: string }>>`SELECT current_database() AS "currentDatabase"`;
    if (currentDatabase !== "fragments_test") throw new Error("Mentor repository integration tests require fragments_test.");
    safeTestDatabase = true;
    await database.user.create({ data: { id: studentId, email: `${studentId}@example.test`, name: "Fixture student", emailVerified: true } });
  });
  afterAll(async () => {
    if (!database) return;
    if (!safeTestDatabase) { await database.$disconnect(); return; }
    await database.submission.deleteMany({ where: { id: { in: reviewSubmissionIds } } });
    await database.job.deleteMany({ where: { id: { in: reviewJobIds } } });
    await database.proposal.deleteMany({ where: { ownerHash: { startsWith: namespace } } });
    await database.proposal.deleteMany({ where: { ownerUserId: studentId } });
    await database.user.delete({ where: { id: studentId } });
    await database.$disconnect();
  });

  it("stores drafts, enforces ownership, and versions edits", async () => {
    const repo = createPrismaMentorRepository(database);
    const draft = { title: "Mi idea", problem: "", description: "", purpose: "", goals: [], skills: [], tags: [], scope: "", constraints: [] };
    const created = await repo.createProposalDraftByUser(draft, studentId);
    expect(created).toMatchObject({ version: 1, proposal: draft });
    expect(await repo.getOwnedProposalDraftByUser(created.id, studentId)).toEqual(created);
    expect(await repo.getOwnedProposalDraftByUser(created.id, `${studentId}-other`)).toBeNull();

    const saved = await repo.updateProposalDraftByUser(created.id, studentId, 1, { ...draft, problem: "Una situación concreta." });
    expect(saved).toMatchObject({ status: "updated", proposal: { version: 2, proposal: { problem: "Una situación concreta." } } });
    expect((await repo.updateProposalDraftByUser(created.id, studentId, 1, draft)).status).toBe("conflict");
    expect((await repo.updateProposalDraftByUser(created.id, `${studentId}-other`, 2, draft)).status).toBe("not_found");
    expect((await repo.getProposalHistoryByUser(created.id, studentId))?.map((entry) => entry.version)).toEqual([1, 2]);
  });

  it("merges partial draft updates and keeps omitted fields recoverable", async () => {
    const repo = createPrismaMentorRepository(database);
    const created = await repo.createProposalDraftByUser({ title: "Huerto", problem: "Registrar riegos", goals: ["Observar"], technologies: ["TypeScript"], expectedOutcome: "Un registro navegable" }, studentId);
    const updated = await repo.updateProposalDraftByUser(created.id, studentId, 1, { purpose: "Aprender con el jardín" });
    expect(updated.status).toBe("updated");
    if (updated.status === "updated") expect(updated.proposal.proposal).toMatchObject({ title: "Huerto", problem: "Registrar riegos", goals: ["Observar"], technologies: ["TypeScript"], expectedOutcome: "Un registro navegable", purpose: "Aprender con el jardín" });
  });

  it("keeps owner hashes isolated and returns immutable revision history", async () => {
    const repo = createPrismaMentorRepository(database);
    const proposal = { title: "Huerto", problem: "Registrar plantas", solution: "Seguimiento del riego", goals: ["Medir crecimiento"], skills: ["TypeScript"], scope: "Una pantalla", constraints: [] };
    const ownerHash = `${namespace}-owner`;
    const created = await repo.createProposal(proposal, ownerHash);
    expect(await repo.getOwnedProposal(created.id, `${namespace}-other`)).toBeNull();
    expect(await repo.updateProposal(created.id, ownerHash, 1, { ...proposal, title: "Huerto escolar", expectedVersion: 1 })).toMatchObject({ status: "updated", proposal: { version: 2 } });
    expect((await repo.updateProposal(created.id, ownerHash, 1, { ...proposal, expectedVersion: 1 })).status).toBe("conflict");
    expect((await repo.getProposalHistory(created.id, ownerHash))?.map((entry) => entry.version)).toEqual([1, 2]);
  });

  it("lists owned Review deliveries with exact commit SHAs, rubric versions, and chronology", async () => {
    const repo = createPrismaMentorRepository(database);
    const oldSha = "a".repeat(40);
    const newSha = "b".repeat(40);
    const otherSha = "c".repeat(40);
    const oldTime = new Date("2026-11-24T10:00:00.000Z");
    const mentorTime = new Date("2026-11-24T11:00:00.000Z");
    const newTime = new Date("2026-11-24T12:00:00.000Z");
    const proposal = await repo.createProposalDraftByUser({ title: "Misión de navegación", problem: "Mejorar la ruta", goals: ["Conservar commits"] }, studentId);

    for (const [index, record] of [
      { id: reviewJobIds[0]!, sha: oldSha, time: oldTime, ownerId: studentId },
      { id: reviewJobIds[1]!, sha: newSha, time: newTime, ownerId: studentId },
      { id: reviewJobIds[2]!, sha: otherSha, time: newTime, ownerId: `${studentId}-other` },
    ].entries()) {
      await database.job.create({ data: {
        id: record.id, type: "review", payloadJson: { request: { owner: "qa-student", repo: "demo", commitSha: record.sha }, context: { studentId: record.ownerId } },
        idempotencyKey: `${namespace}-history-${index}`, status: "done", attempts: 1, createdAt: record.time, updatedAt: record.time,
      } });
    }
    await database.submission.createMany({ data: [
      { id: reviewSubmissionIds[0]!, kind: "review", sourceId: reviewJobIds[0]!, score: 71, snapshotJson: { commitSha: oldSha }, contentHash: "old-hash", verificationCode: `${namespace}-verify-old`, rubricVersion: "mission-v1-rubric", createdAt: oldTime },
      { id: reviewSubmissionIds[1]!, kind: "review", sourceId: reviewJobIds[1]!, score: 82, snapshotJson: { commitSha: newSha }, contentHash: "new-hash", verificationCode: `${namespace}-verify-new`, rubricVersion: "mission-v2-rubric", createdAt: newTime },
      { id: reviewSubmissionIds[2]!, kind: "review", sourceId: reviewJobIds[2]!, score: 99, snapshotJson: { commitSha: otherSha }, contentHash: "other-hash", verificationCode: `${namespace}-verify-other`, rubricVersion: "private-rubric", createdAt: newTime },
      { id: reviewSubmissionIds[3]!, kind: "mentor", sourceId: proposal.id, score: 75, snapshotJson: { proposal: { title: "Misión de navegación" } }, contentHash: "mentor-hash", verificationCode: `${namespace}-verify-mentor`, rubricVersion: "mentor-rubric-v1", createdAt: mentorTime },
    ] });

    await database.submission.create({ data: {
      id: reviewSubmissionIds[4]!, kind: "review", sourceId: reviewJobIds[0]!, score: 30,
      snapshotJson: { commitSha: "not-a-commit" }, contentHash: "invalid-sha-hash", verificationCode: `${namespace}-verify-invalid-sha`,
      rubricVersion: "legacy-rubric", createdAt: new Date("2026-11-24T09:00:00.000Z"),
    } });

    const history = await repo.listStudentSubmissions(studentId);
    expect(history).toHaveLength(4);
    expect(history.map((item) => item.id)).toEqual([reviewSubmissionIds[1], reviewSubmissionIds[3], reviewSubmissionIds[0], reviewSubmissionIds[4]]);
    expect(history[0]).toMatchObject({ commitSha: newSha, rubricVersion: "mission-v2-rubric", createdAt: newTime.toISOString() });
    expect(history[1]).toMatchObject({ kind: "mentor", rubricVersion: "mentor-rubric-v1", createdAt: mentorTime.toISOString() });
    expect(history[1]).not.toHaveProperty("commitSha");
    expect(history[2]).toMatchObject({ commitSha: oldSha, rubricVersion: "mission-v1-rubric", createdAt: oldTime.toISOString() });
    expect(history[3]).toMatchObject({ rubricVersion: "legacy-rubric" });
    expect(history[3]).not.toHaveProperty("commitSha");
  });
});
