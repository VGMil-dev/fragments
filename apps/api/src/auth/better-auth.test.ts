import { DatabaseSync } from "node:sqlite";
import type { IncomingMessage } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createFragmentsAuth, createFragmentsAuthService, migrateFragmentsAuth } from "./better-auth.js";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

async function fixture(allowSignUp = true) {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  const auth = createFragmentsAuth(database, { secret: "test-only-better-auth-secret-0123456789", allowSignUp });
  await migrateFragmentsAuth(auth);
  return { database, auth, service: createFragmentsAuthService(auth) };
}

async function createAccount(database: DatabaseSync, auth: Awaited<ReturnType<typeof fixture>>["auth"], email: string, isTeacher: boolean) {
  const signedUp = await auth.api.signUpEmail({ body: { name: "Fixture Docente", email, password: "fixture-password-2026" } });
  database.prepare("UPDATE user SET isTeacher = ? WHERE id = ?").run(isTeacher ? 1 : 0, signedUp.user.id);
  const signedIn = await auth.api.signInEmail({
    returnHeaders: true,
    body: { email, password: "fixture-password-2026" },
  });
  const cookie = signedIn.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
  return { id: signedUp.user.id, request: { headers: { cookie } } as IncomingMessage };
}

describe("Better Auth integration", () => {
  it("trusts only the normalized API and configured public app origins", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const auth = createFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      baseURL: "http://localhost:3000/api/auth",
      publicAppURL: "http://localhost:5173/",
    });
    expect(auth.options.trustedOrigins).toEqual(expect.arrayContaining(["http://localhost:3000", "http://localhost:5173"]));
  });

  it("disables public sign-up unless a test or provisioning flow explicitly enables it", async () => {
    const { auth } = await fixture(false);
    await expect(auth.api.signUpEmail({ body: { name: "Blocked", email: "blocked@example.test", password: "fixture-password-2026" } }))
      .rejects.toThrow();
  });

  it("authorizes only teacher-marked or admin-role Better Auth sessions", async () => {
    const { database, auth, service } = await fixture();
    const teacher = await createAccount(database, auth, "teacher@example.test", true);
    const student = await createAccount(database, auth, "student@example.test", false);

    await expect(service.teacherId(teacher.request)).resolves.toBe(teacher.id);
    await expect(service.teacherId(student.request)).resolves.toBeNull();
    await expect(service.teacherId({ headers: {} } as IncomingMessage)).resolves.toBeNull();

    database.prepare("UPDATE user SET role = 'admin' WHERE id = ?").run(student.id);
    await expect(service.teacherId(student.request)).resolves.toBe(student.id);
  });
});
