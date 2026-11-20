import { createServer, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { createHttpHandler } from "../http/app.js";
import { openDatabase } from "../db/open.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createFragmentsAuth, createFragmentsAuthService } from "./better-auth.js";

const servers: Server[] = [];
const createdUserIds: string[] = [];
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar las pruebas de autenticación Prisma.");
const describePostgres = databaseUrl ? describe : describe.skip;
let database: PrismaClient | undefined;
beforeAll(async () => { if (databaseUrl) { database = openDatabase(databaseUrl); await database.$connect(); } });
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
  if (database && createdUserIds.length) await database.user.deleteMany({ where: { id: { in: createdUserIds.splice(0) } } });
});
afterAll(async () => { await database?.$disconnect(); });

async function setup() {
  const db = database!;
  const instance = createFragmentsAuth(db, {
    secret: "teacher-link-test-secret-0123456789",
    baseURL: "http://localhost:3000",
    publicAppURL: "http://localhost:5173",
    allowSignUp: true,
    githubClientId: "fake-github-client-id",
    githubClientSecret: "fake-github-client-secret",
  });
  const auth = createFragmentsAuthService(instance, db);
  const server = createServer(createHttpHandler(db, { auth }));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  const base = `http://127.0.0.1:${address.port}`;

  async function createUser(email: string, isTeacher: boolean) {
    const fixtureEmail = `${email.split("@")[0]}-${randomUUID()}@example.test`;
    const signup = await instance.api.signUpEmail({ body: { name: "Cuenta de prueba", email: fixtureEmail, password: "fixture-password-2026" } });
    createdUserIds.push(signup.user.id);
    await db.user.update({ where: { id: signup.user.id }, data: { isTeacher } });
    const login = await instance.api.signInEmail({ returnHeaders: true, body: { email: fixtureEmail, password: "fixture-password-2026" } });
    const cookie = login.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
    return { id: signup.user.id, cookie };
  }

  return { database: db, instance, base, createUser };
}

describePostgres("Cuenta docente y vinculación explícita de GitHub (Prisma)", () => {
  it("mantiene el enlace implícito desactivado y bloquea el endpoint genérico", async () => {
    const { instance, base, createUser } = await setup();
    const teacher = await createUser("teacher-link@example.test", true);

    expect(instance.options.account?.accountLinking?.disableImplicitLinking).toBe(true);
    expect(instance.options.disabledPaths).toContain("/link-social");
    const response = await fetch(`${base}/api/auth/link-social`, {
      method: "POST", headers: { cookie: teacher.cookie, origin: "http://localhost:5173", "content-type": "application/json" },
      body: JSON.stringify({ provider: "github" }),
    });
    expect(response.status).toBe(404);
  });

  it("solo revela estado docente a una sesión docente", async () => {
    const { base, createUser } = await setup();
    const teacher = await createUser("teacher-status@example.test", true);
    const student = await createUser("student-status@example.test", false);

    const anonymous = await fetch(`${base}/api/teacher/account`);
    const denied = await fetch(`${base}/api/teacher/account`, { headers: { cookie: student.cookie } });
    const allowed = await fetch(`${base}/api/teacher/account`, { headers: { cookie: teacher.cookie } });

    expect(anonymous.status).toBe(401);
    expect(denied.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(await allowed.json()).toMatchObject({ ok: true, data: { credentialConnected: true, githubConnected: false } });
  });

  it("rechaza solicitudes sin origen confiable y contraseñas incorrectas sin vincular cuentas", async () => {
    const { database, base, createUser } = await setup();
    const teacher = await createUser("teacher-confirm@example.test", true);
    const headers = { cookie: teacher.cookie, "content-type": "application/json" };

    const untrusted = await fetch(`${base}/api/teacher/account/github/link`, {
      method: "POST", headers: { ...headers, origin: "https://attacker.example.test" }, body: JSON.stringify({ password: "fixture-password-2026" }),
    });
    const incorrectPassword = await fetch(`${base}/api/teacher/account/github/link`, {
      method: "POST", headers: { ...headers, origin: "http://localhost:5173" }, body: JSON.stringify({ password: "wrong-password" }),
    });

    expect(untrusted.status).toBe(403);
    expect(incorrectPassword.status).toBe(401);
    for (let index = 0; index < 4; index++) {
      expect((await fetch(`${base}/api/teacher/account/github/link`, {
        method: "POST", headers: { ...headers, origin: "http://localhost:5173" }, body: JSON.stringify({ password: "wrong-password" }),
      })).status).toBe(401);
    }
    const rateLimited = await fetch(`${base}/api/teacher/account/github/link`, {
      method: "POST", headers: { ...headers, origin: "http://localhost:5173" }, body: JSON.stringify({ password: "wrong-password" }),
    });
    expect(rateLimited.status).toBe(429);
    expect(await database.account.count({ where: { userId: teacher.id, providerId: "github" } })).toBe(0);
  });

  it("requiere contraseña válida y sesión docente; inicia OAuth sin crear aún una cuenta GitHub", async () => {
    const { database, instance, base, createUser } = await setup();
    const teacher = await createUser("teacher-link-start@example.test", true);
    const student = await createUser("student-link-start@example.test", false);
    const request = (cookie: string, password: string) => fetch(`${base}/api/teacher/account/github/link`, {
      method: "POST",
      headers: { cookie, origin: "http://localhost:5173", "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });

    expect((await request("", "fixture-password-2026")).status).toBe(401);
    expect((await request(student.cookie, "fixture-password-2026")).status).toBe(403);
    const started = await request(teacher.cookie, "fixture-password-2026");
    const body = await started.json() as { ok: boolean; data: { authorizationUrl: string } };
    expect(started.status, JSON.stringify(body)).toBe(200);
    const authorization = new URL(body.data.authorizationUrl);

    expect(started.status).toBe(200);
    expect(started.headers.get("cache-control")).toBe("no-store");
    expect(started.headers.getSetCookie().length).toBeGreaterThan(0);
    expect(authorization.origin).toBe("https://github.com");
    expect(authorization.pathname).toBe("/login/oauth/authorize");
    expect(authorization.searchParams.get("client_id")).toBe("fake-github-client-id");
    expect(authorization.searchParams.get("redirect_uri")).toBe("http://localhost:3000/api/auth/callback/github");
    expect(authorization.toString()).not.toContain("fake-github-client-secret");
    expect(await database.account.count({ where: { userId: teacher.id, providerId: "github" } })).toBe(0);
    expect(await database.user.findUnique({ where: { id: teacher.id }, select: { isTeacher: true } })).toEqual({ isTeacher: true });
  });

  it("no permite volver a vincular GitHub a una cuenta docente ya asociada", async () => {
    const { database, base, createUser } = await setup();
    const teacher = await createUser("teacher-linked@example.test", true);
    await database.account.create({ data: { id: `existing-${randomUUID()}`, accountId: "fake-github-user-id", providerId: "github", userId: teacher.id } });

    const response = await fetch(`${base}/api/teacher/account/github/link`, {
      method: "POST",
      headers: { cookie: teacher.cookie, origin: "http://localhost:5173", "content-type": "application/json" },
      body: JSON.stringify({ password: "fixture-password-2026" }),
    });

    expect(response.status).toBe(409);
    expect(await database.account.findMany({ where: { userId: teacher.id, providerId: "github" }, select: { accountId: true } })).toEqual([{ accountId: "fake-github-user-id" }]);
  });
});
