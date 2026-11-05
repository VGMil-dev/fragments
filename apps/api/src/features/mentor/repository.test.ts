import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { createMentorRepository } from "./repository.js";

const dbs: DatabaseSync[] = [];

function repository() {
  const db = new DatabaseSync(":memory:");
  dbs.push(db);
  db.exec(`
    CREATE TABLE proposals (id TEXT PRIMARY KEY, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, updated_at TEXT NOT NULL, owner_hash TEXT NOT NULL);
    CREATE TABLE proposal_revisions (proposal_id TEXT NOT NULL, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(proposal_id, version));
    CREATE TABLE mentor_gallery_optins (proposal_id TEXT PRIMARY KEY, proposal_version INTEGER NOT NULL, opted_in INTEGER NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE mentor_evaluations (id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL, proposal_version INTEGER NOT NULL, evaluation_json TEXT NOT NULL, evaluated_at TEXT NOT NULL);
    CREATE TABLE submissions (id TEXT PRIMARY KEY, kind TEXT NOT NULL, source_id TEXT NOT NULL, score REAL NOT NULL, snapshot_json TEXT NOT NULL, content_hash TEXT NOT NULL, verification_code TEXT NOT NULL, rubric_version TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
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

  it("publishes only an explicitly opted-in current version and removes it after edits", () => {
    const repo = repository();
    const first = repo.createProposal(proposal, "a".repeat(64));
    expect(repo.listGallery()).toEqual([]);
    expect(repo.setGalleryOptIn(first.id, "a".repeat(64), true).status).toBe("updated");
    expect(repo.listGallery()).toHaveLength(1);
    repo.updateProposal(first.id, "a".repeat(64), 1, { ...proposal, title: "Nuevo huerto" });
    expect(repo.listGallery()).toEqual([]);
    repo.setGalleryOptIn(first.id, "a".repeat(64), true);
    expect(repo.listGallery()[0]?.title).toBe("Nuevo huerto");
  });
});
