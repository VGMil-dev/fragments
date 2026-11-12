import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../../db/migrate.js";
import { createMentorRepository } from "./repository.js";
import { createAcademicRepository } from "./academic-repository.js";

const databases: DatabaseSync[] = [];
function fixture() {
  const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
  db.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT, name TEXT, image TEXT, role TEXT DEFAULT 'user', isTeacher INTEGER DEFAULT 0, githubLogin TEXT, createdAt TEXT);
    CREATE TABLE account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL);`);
  for (const [id, login, teacher] of [["student-1", "student-fixture", 0], ["student-2", "another-fixture", 0], ["teacher-1", "teacher-fixture", 1]] as const) {
    db.prepare("INSERT INTO user(id, email, name, image, role, isTeacher, githubLogin, createdAt) VALUES (?, ?, ?, ?, 'user', ?, ?, ?)")
      .run(id, `${login}@example.test`, login, "https://avatars.githubusercontent.com/u/123?v=4", teacher, login, "2026-11-01T00:00:00.000Z");
    if (!teacher) db.prepare("INSERT INTO account(id, accountId, providerId, userId) VALUES (?, ?, 'github', ?)").run(`account-${id}`, `stable-${id}`, id);
  }
  return { db, mentor: createMentorRepository(db), academic: createAcademicRepository(db) };
}
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

const draft = { title: "Bitácora de huerto", problem: "El curso no registra riegos.", solution: "Una bitácora permite comparar el crecimiento.", goals: ["Registrar riegos"], skills: ["TypeScript"], scope: "Una pantalla para registrar medidas.", constraints: ["Sin conexión"] };
const ownerHash = (token: string) => createHash("sha256").update(token).digest("hex");

describe("F15 academic publication and historical ownership", () => {
  it("publishes only the evaluated revision and preserves historic context", () => {
    const { mentor, academic } = fixture();
    const created = mentor.createProposal(draft, null, "student-1", new Date("2026-11-01T01:00:00.000Z"));
    expect(academic.listGallery().items).toEqual([]);

    mentor.saveEvaluation("evaluation-1", created.id, 1, {} as never, "a".repeat(64), 1, new Date("2026-11-02T01:00:00.000Z"));
    const page = academic.listGallery();
    expect(page.nextOffset).toBeNull();
    expect(page.items).toHaveLength(1);
    expect(page.items[0]).toMatchObject({ id: created.id, proposalVersion: 1, rubricVersion: 1, subject: "Proyectos estudiantiles", rubricTitle: "Propuesta inicial", author: { login: "student-fixture" } });

    mentor.updateProposalByUser(created.id, "student-1", 1, { ...draft, title: "Bitácora nueva", expectedVersion: 1 });
    expect(academic.getGalleryDetail(created.id)?.project.proposalVersion).toBe(1);
    mentor.saveEvaluation("evaluation-2", created.id, 2, {} as never, "b".repeat(64), 1, new Date("2026-11-03T01:00:00.000Z"));
    expect(academic.listGallery().items).toHaveLength(1);
    expect(academic.getGalleryDetail(created.id)?.history.map((revision) => revision.proposalVersion)).toEqual([2, 1]);
  });

  it("leaves old cookie-owned proposals unclaimed and makes claim one-time", () => {
    const { mentor, academic, db } = fixture();
    const token = "legacy-owner-cookie-token-that-is-long-enough-0123456789";
    const legacy = mentor.createProposal(draft, ownerHash(token));
    expect(academic.listHistoricalProjects()).toHaveLength(1);
    expect(academic.claimHistoricalProject(legacy.id, ownerHash("wrong-owner-cookie"), "student-1")).toBe("not_found");
    expect(academic.claimHistoricalProject(legacy.id, ownerHash(token), "student-1")).toBe("claimed");
    expect(academic.claimHistoricalProject(legacy.id, ownerHash(token), "student-1")).toBe("conflict");
    expect(academic.claimHistoricalProject(legacy.id, ownerHash(token), "student-2")).toBe("conflict");
    expect(db.prepare("SELECT owner_user_id FROM proposals WHERE id = ?").get(legacy.id)).toEqual({ owner_user_id: "student-1" });
    expect(academic.listGallery().items).toEqual([]);
  });

  it("records a teacher withdrawal without deleting the project history", () => {
    const { mentor, academic, db } = fixture();
    const created = mentor.createProposal(draft, null, "student-1");
    mentor.saveEvaluation("evaluation-1", created.id, 1, {} as never, "a".repeat(64), 1);
    expect(academic.withdrawProject(created.id, "teacher-1", "Contiene información privada.")).toBe(true);
    expect(academic.withdrawProject(created.id, "teacher-1", "Intento repetido.")).toBe(false);
    expect(academic.listGallery().items).toEqual([]);
    expect(db.prepare("SELECT reason FROM mentor_academic_project_moderation WHERE proposal_id = ?").get(created.id)).toEqual({ reason: "Contiene información privada." });
    expect(mentor.getProposalHistoryByUser(created.id, "student-1")).toHaveLength(1);
  });
});
