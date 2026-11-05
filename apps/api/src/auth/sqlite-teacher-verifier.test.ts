import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../db/migrate.js";
import { createTeacherAccount, hashTeacherPassword, SqliteTeacherCredentialVerifier } from "./sqlite-teacher-verifier.js";

const databases: DatabaseSync[] = [];
function database() { const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db); return db; }
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

describe("SqliteTeacherCredentialVerifier", () => {
  it("authenticates only the seeded teacher using a scrypt password hash", async () => {
    const db = database();
    const passwordHash = await hashTeacherPassword("local-test-password-123");
    createTeacherAccount(db, { id: "teacher-1", email: "Teacher@example.test", passwordHash, now: 10 });
    const verifier = new SqliteTeacherCredentialVerifier(db);

    await expect(verifier.verify("teacher@EXAMPLE.test", "local-test-password-123")).resolves.toBe("teacher-1");
    await expect(verifier.verify("teacher@example.test", "incorrect-password")).resolves.toBeNull();
    await expect(verifier.verify("missing@example.test", "local-test-password-123")).resolves.toBeNull();
  }, 30_000);

  it("rejects weak passwords and unsupported stored hashes", async () => {
    const db = database();
    await expect(hashTeacherPassword("short")).rejects.toThrow(/12 y 1024/);
    db.prepare("INSERT INTO teachers(id,email,password_hash,created_at) VALUES(?,?,?,?)").run("teacher-bad", "bad@example.test", "plain-text", 1);
    await expect(new SqliteTeacherCredentialVerifier(db).verify("bad@example.test", "password-long-enough")).resolves.toBeNull();
  });
});
