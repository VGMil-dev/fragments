import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { createInspectorTeacherPasswordHash, createInspectorTeacherSessionService } from "./teacher-auth.js";

let database: DatabaseSync | undefined;
afterEach(() => { database?.close(); database = undefined; });

function openFixture() {
  database = new DatabaseSync(":memory:");
  database.exec("CREATE TABLE teachers (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL)");
  return database;
}

describe("Inspector teacher auth adapter", () => {
  it("verifies a manually provisioned scrypt hash and issues the existing signed session", async () => {
    const db = openFixture();
    const passwordHash = await createInspectorTeacherPasswordHash("offline-fixture-teacher-password");
    db.prepare("INSERT INTO teachers (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run("teacher-fixture-01", "teacher@example.test", passwordHash, 1);

    const auth = createInspectorTeacherSessionService(db, "inspector-session-secret-for-offline-tests");
    await expect(auth.login("TEACHER@example.test", "incorrect-password")).resolves.toBeNull();
    await expect(auth.login("missing@example.test", "offline-fixture-teacher-password")).resolves.toBeNull();
    const issued = await auth.login("TEACHER@example.test", "offline-fixture-teacher-password", 100);
    expect(issued).toMatchObject({ teacherId: "teacher-fixture-01", expiresAt: 8 * 60 * 60 * 1000 + 100 });
    expect(auth.verify(issued!.token, 101)?.teacherId).toBe("teacher-fixture-01");
  });

  it("rejects weak provisioning passwords and malformed stored hashes", async () => {
    await expect(createInspectorTeacherPasswordHash("short")).rejects.toThrow(/12 caracteres/);
    const db = openFixture();
    db.prepare("INSERT INTO teachers (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
      .run("teacher-fixture-02", "broken@example.test", "scrypt$1$1$1$bad$hash", 1);
    const auth = createInspectorTeacherSessionService(db, "inspector-session-secret-for-offline-tests");
    await expect(auth.login("broken@example.test", "some-password-long-enough")).resolves.toBeNull();
  });
});
