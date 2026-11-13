import { DatabaseSync } from "node:sqlite";
import { createServer, type IncomingMessage, type Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createFragmentsAuth, createFragmentsAuthService, createMigratedFragmentsAuth } from "./better-auth.js";

const databases: DatabaseSync[] = [];
const servers: Server[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
  for (const database of databases.splice(0)) database.close();
});

async function fixture(allowSignUp = true) {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  const auth = await createMigratedFragmentsAuth(database, { secret: "test-only-better-auth-secret-0123456789", allowSignUp });
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
      validateSchema: false,
    });
    expect(auth.options.trustedOrigins).toEqual(expect.arrayContaining(["http://localhost:3000", "http://localhost:5173"]));
  });

  it("disables public sign-up unless a test or provisioning flow explicitly enables it", async () => {
    const { auth } = await fixture(false);
    await expect(auth.api.getSession({ headers: new Headers() })).resolves.toBeNull();
    await expect(auth.api.signUpEmail({ body: { name: "Blocked", email: "blocked@example.test", password: "fixture-password-2026" } }))
      .rejects.toThrow();
  });

  it("configures GitHub as the only student OAuth provider without implicit email linking", async () => {
    const database = new DatabaseSync(":memory:"); databases.push(database);
    const auth = await createMigratedFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      publicAppURL: "http://localhost:5173",
      githubClientId: "fake-github-client-id",
      githubClientSecret: "fake-github-client-secret",
    });
    const login = await auth.api.signInSocial({ body: { provider: "github", callbackURL: "http://localhost:5173/student/gallery" } });
    const authorize = new URL(login.url!);
    const additional = auth.options.user?.additionalFields as Record<string, { input?: boolean }>;

    expect(authorize.origin).toBe("https://github.com");
    expect(authorize.pathname).toBe("/login/oauth/authorize");
    expect(authorize.searchParams.get("scope")).toContain("read:user");
    expect(authorize.searchParams.get("scope")).toContain("user:email");
    expect(authorize.searchParams.get("scope")).not.toMatch(/repo|workflow|admin:repo_hook/);
    expect(auth.options.account?.accountLinking?.disableImplicitLinking).toBe(true);
    expect(auth.options.emailAndPassword?.disableSignUp).toBe(true);
    expect(additional.isTeacher?.input).toBe(false);
    expect(additional.githubLogin?.input).toBe(false);
    expect(login.url).not.toContain("fake-github-client-secret");
    expect(await database.prepare("SELECT COUNT(*) AS count FROM user").get()).toMatchObject({ count: 0 });
    const untrusted = await auth.api.signInSocial({ body: { provider: "github", callbackURL: "https://untrusted.example.test/" } });
    expect(untrusted.url).toContain("https://github.com/login/oauth/authorize");
    expect(untrusted.url).not.toContain("untrusted.example.test");
  });

  it("builds the production GitHub callback from the configured public origin", async () => {
    const database = new DatabaseSync(":memory:"); databases.push(database);
    const auth = await createMigratedFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      baseURL: "https://fragments.gavanti.org",
      publicAppURL: "https://fragments.gavanti.org",
      githubClientId: "fake-github-client-id",
      githubClientSecret: "fake-github-client-secret",
    });
    const login = await auth.api.signInSocial({ body: { provider: "github", callbackURL: "/student/gallery" } });
    const authorize = new URL(login.url!);

    expect(authorize.searchParams.get("redirect_uri")).toBe("https://fragments.gavanti.org/api/auth/callback/github");
  });

  it("authorizes only teacher-marked or admin-role Better Auth sessions", async () => {
    const { database, auth, service } = await fixture();
    const teacher = await createAccount(database, auth, "teacher@example.test", true);
    const student = await createAccount(database, auth, "student@example.test", false);

    await expect(service.teacherId(teacher.request)).resolves.toBe(teacher.id);
    await expect(service.teacherId(student.request)).resolves.toBeNull();
    await expect(service.teacherId({ headers: {} } as IncomingMessage)).resolves.toBeNull();
    await expect(service.studentAccess(teacher.request)).resolves.toEqual({ kind: "role_not_student" });
    await expect(service.studentAccess(student.request)).resolves.toEqual({ kind: "github_account_not_linked" });

    database.prepare("UPDATE user SET role = 'admin' WHERE id = ?").run(student.id);
    await expect(service.teacherId(student.request)).resolves.toBe(student.id);
  });

  it("resolves student ownership through stable IDs when email and login change", async () => {
    const { database, auth, service } = await fixture();
    const signedUp = await auth.api.signUpEmail({ body: { name: "Fixture estudiante", email: "student-identity@example.test", password: "fixture-password-2026" } });
    database.prepare("UPDATE user SET githubLogin = ? WHERE id = ?").run("student-before", signedUp.user.id);
    database.prepare("INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt) VALUES (?, ?, 'github', ?, ?, ?)")
      .run("github-account-link", "github-stable-account-123", signedUp.user.id, Date.now(), Date.now());
    const signedIn = await auth.api.signInEmail({ returnHeaders: true, body: { email: "student-identity@example.test", password: "fixture-password-2026" } });
    const cookie = signedIn.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
    const request = { headers: { cookie } } as IncomingMessage;

    await expect(service.student(request)).resolves.toMatchObject({ id: signedUp.user.id, githubAccountId: "github-stable-account-123", githubLogin: "student-before" });
    database.prepare("UPDATE user SET email = ?, githubLogin = ? WHERE id = ?").run("student-renamed@personal.example.test", "student-after", signedUp.user.id);
    await expect(service.student(request)).resolves.toMatchObject({ id: signedUp.user.id, githubAccountId: "github-stable-account-123", githubLogin: "student-after" });
    database.prepare("UPDATE account SET accountId = '' WHERE userId = ? AND providerId = 'github'").run(signedUp.user.id);
    await expect(service.student(request)).resolves.toBeNull();
    await expect(service.studentAccess(request)).resolves.toEqual({ kind: "invalid_github_identity" });
  });

  it("treats an expired Better Auth session as unauthenticated", async () => {
    const { database, auth, service } = await fixture();
    const student = await createAccount(database, auth, "expired-session@example.test", false);
    const cookie = student.request.headers.cookie;
    database.prepare("UPDATE session SET expiresAt = ? WHERE userId = ?").run(new Date(Date.now() - 60_000).toISOString(), student.id);

    await expect(service.studentAccess({ headers: { cookie } } as IncomingMessage)).resolves.toEqual({ kind: "session_required" });
  });

  it("sends a single-use reset token, accepts it once, and revokes old sessions", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const deliveries: Array<{ email: string; url: string }> = [];
    const auth = await createMigratedFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      publicAppURL: "http://localhost:5173",
      allowSignUp: true,
      passwordResetEmailSender: async (message) => { deliveries.push(message); },
    });
    const teacher = await createAccount(database, auth, "teacher-reset@example.test", true);

    const result = await auth.api.requestPasswordReset({ body: {
      email: "teacher-reset@example.test",
      redirectTo: "http://localhost:5173/teacher/reset-password",
    } });
    expect(result).toMatchObject({ status: true });
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].email).toBe("teacher-reset@example.test");
    const resetUrl = new URL(deliveries[0].url);
    expect(resetUrl.origin).toBe("http://localhost:5173");
    expect(resetUrl.pathname).toBe("/teacher/reset-password");
    expect(resetUrl.search).toBe("");
    const token = new URLSearchParams(resetUrl.hash.slice(1)).get("token");
    expect(token).toBeTruthy();

    await auth.api.resetPassword({ body: { token: token!, newPassword: "replacement-password-2026" } });
    await expect(auth.api.getSession({ headers: new Headers({ cookie: teacher.request.headers.cookie }) })).resolves.toBeNull();
    await expect(auth.api.resetPassword({ body: { token: token!, newPassword: "second-password-2026" } })).rejects.toThrow();
    await expect(auth.api.signInEmail({ body: { email: "teacher-reset@example.test", password: "replacement-password-2026" } })).resolves.toBeDefined();
  });

  it("uses the same reset response for existing and unknown email addresses", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const auth = await createMigratedFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      allowSignUp: true,
      passwordResetEmailSender: async () => undefined,
    });
    await createAccount(database, auth, "known@example.test", true);
    const body = (email: string) => ({ email, redirectTo: "http://localhost:5173/teacher/reset-password" });
    const known = await auth.api.requestPasswordReset({ body: body("known@example.test") });
    const unknown = await auth.api.requestPasswordReset({ body: body("unknown@example.test") });
    expect(known).toEqual(unknown);
    expect(auth.options.emailAndPassword?.resetPasswordTokenExpiresIn).toBe(60 * 60);
    expect(auth.options.emailAndPassword?.revokeSessionsOnPasswordReset).toBe(true);
    expect(auth.options.rateLimit?.enabled).toBe(true);
    expect(auth.options.rateLimit?.customRules).toMatchObject({
      "/request-password-reset": { window: 60, max: 3 },
      "/reset-password": { window: 60, max: 5 },
    });
  });

  it("limits reset requests to three per minute per client", async () => {
    const database = new DatabaseSync(":memory:");
    databases.push(database);
    const auth = await createMigratedFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      publicAppURL: "http://localhost:5173",
      passwordResetEmailSender: async () => undefined,
    });
    const service = createFragmentsAuthService(auth);
    const server = createServer((request, response) => service.handle(request, response));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const statuses: number[] = [];
    for (let index = 0; index < 4; index++) {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/request-password-reset`, {
        method: "POST",
        headers: { origin: "http://localhost:5173", "content-type": "application/json" },
        body: JSON.stringify({ email: "unknown@example.test", redirectTo: "http://localhost:5173/teacher/reset-password" }),
      });
      statuses.push(response.status);
    }
    expect(statuses).toEqual([200, 200, 200, 429]);
  });
});
