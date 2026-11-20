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
let database: PrismaClient;

describePostgres("Mentor Prisma repository ownership and revisions", () => {
  beforeAll(async () => {
    database = openDatabase(databaseUrl!);
    await database.$connect();
    await database.user.create({ data: { id: studentId, email: `${studentId}@example.test`, name: "Fixture student", emailVerified: true } });
  });
  afterAll(async () => {
    if (!database) return;
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
});
