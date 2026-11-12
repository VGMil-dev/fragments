import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createMentorRepository } from "./repository.js";
import { migrate } from "../../db/migrate.js";

const dbs: DatabaseSync[] = [];

function repository() {
  const db = new DatabaseSync(":memory:");
  dbs.push(db);
  migrate(db);
  db.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT, name TEXT, image TEXT, role TEXT, isTeacher INTEGER DEFAULT 0, githubLogin TEXT, createdAt TEXT);
    CREATE TABLE account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL);`);
  db.prepare("INSERT INTO user(id, email, name, image, role, isTeacher, githubLogin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
    .run("student-1", "student@example.test", "Student Fixture", "https://avatars.githubusercontent.com/u/123?v=4", "user", 0, "student-fixture", "2026-11-01T00:00:00.000Z");
  db.prepare("INSERT INTO account(id, accountId, providerId, userId) VALUES (?, ?, ?, ?)").run("account-1", "github-stable-id-1", "github", "student-1");
  return createMentorRepository(db);
}

afterEach(() => { for (const db of dbs.splice(0)) db.close(); });

const proposal = { title: "Huerto", problem: "Registrar plantas", solution: "Seguimiento del riego", goals: ["Medir crecimiento"], skills: ["TypeScript"], scope: "Una pantalla", constraints: [] };

describe("Mentor repository ownership and revisions", () => {
  it("keeps immutable versions, rejects stale writes, and checks owner hashes", () => {
    const repo = repository();
    const first = repo.createProposal(proposal, "a".repeat(64));
    expect(repo.getOwnedProposal(first.id, "b".repeat(64))).toBeNull();
    expect(repo.updateProposal(first.id, "a".repeat(64), 1, { ...proposal, title: "Huerto escolar" })).toMatchObject({ status: "updated", proposal: { version: 2 } });
    expect(repo.updateProposal(first.id, "a".repeat(64), 1, proposal).status).toBe("conflict");
    expect(repo.getProposalHistory(first.id, "a".repeat(64))?.map((entry) => entry.version)).toEqual([1, 2]);
  });

  it("publishes an evaluated GitHub proposal once and keeps its published revision after an edit", () => {
    const repo = repository();
    const first = repo.createProposal(proposal, null, "student-1");
    expect(repo.listGallery()).toEqual([]);
    repo.saveEvaluation("eval-1", first.id, 1, {} as never, "a".repeat(64), 1, new Date("2026-11-01T12:00:00.000Z"));
    expect(repo.listGallery()).toHaveLength(1);
    expect(repo.listGallery()[0]?.title).toBe("Huerto");
    repo.updateProposalByUser(first.id, "student-1", 1, { ...proposal, title: "Nuevo huerto", expectedVersion: 1 });
    expect(repo.listGallery()[0]?.title).toBe("Huerto");
    repo.saveEvaluation("eval-2", first.id, 2, {} as never, "b".repeat(64), 1, new Date("2026-11-02T12:00:00.000Z"));
    expect(repo.listGallery()[0]?.title).toBe("Nuevo huerto");
    expect(repo.listGallery()).toHaveLength(1);
  });
});
