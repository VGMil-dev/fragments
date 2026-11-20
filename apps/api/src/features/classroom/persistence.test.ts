import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { migrate } from "../../db/migrate.js";
import { createHttpHandler } from "../../http/app.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";

const resources: Array<{ server: Server; database: DatabaseSync; directory: string }> = [];
const teacherId = "fixture-persist-teacher";
const studentId = "fixture-persist-student";

async function start(database: DatabaseSync, directory: string) {
  const auth = {
    handle: (_request: unknown, response: { writeHead: (status: number) => { end: () => void } }) => { response.writeHead(503).end(); },
    async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
    async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
    async student(request: { headers: Record<string, string | undefined> }) { const id = request.headers["x-fixture-user"]; return id === studentId ? { id, githubAccountId: "fixture-github", githubLogin: "fixture-student", avatarUrl: null, registeredAt: "2026-11-19T12:00:00.000Z" } : null; },
    async studentAccess(request: { headers: Record<string, string | undefined> }) { const student = await this.student(request); return student ? { kind: "student" as const, student } : { kind: "session_required" as const }; },
    githubOAuthConfigured: true,
  } as unknown as FragmentsAuthService;
  const server = createServer(createHttpHandler(database, { auth }));
  resources.push({ server, database, directory });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected test server address");
  return `http://127.0.0.1:${address.port}`;
}

async function api(base: string, path: string, user: string, role: "teacher" | "student", method = "GET", body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, headers: { "x-fixture-user": user, "x-fixture-role": role, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() as { data?: any; error?: { code: string } } };
}

afterEach(async () => {
  for (const resource of resources.splice(0)) {
    await new Promise<void>((done) => { resource.server.close(() => done()); resource.server.closeAllConnections(); });
    resource.database.close();
    const temporaryRoot = resolve(tmpdir());
    const target = resolve(resource.directory);
    if (!target.startsWith(`${temporaryRoot}${process.platform === "win32" ? "\\" : "/"}`)) throw new Error("Refusing to clean a path outside the OS temporary directory.");
    rmSync(target, { recursive: true, force: true });
  }
});

describe("Classroom Studio persistence", () => {
  it("preserves classes, enrollment, and authorized skills across an API restart", async () => {
    const directory = mkdtempSync(join(tmpdir(), "fragments-f18a-persist-"));
    const file = join(directory, "classroom.sqlite");
    const firstDb = new DatabaseSync(file); migrate(firstDb);
    firstDb.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT, name TEXT, image TEXT, role TEXT DEFAULT 'user', isTeacher INTEGER DEFAULT 0, githubLogin TEXT, createdAt TEXT);
      CREATE TABLE account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL);`);
    firstDb.prepare("INSERT INTO user(id,email,name,role,isTeacher,githubLogin,createdAt) VALUES(?,?,?,?,?,?,?)").run(teacherId, "teacher@fixture.test", "Teacher", "user", 1, "fixture-teacher", "2026-11-19T12:00:00.000Z");
    firstDb.prepare("INSERT INTO user(id,email,name,role,isTeacher,githubLogin,createdAt) VALUES(?,?,?,?,?,?,?)").run(studentId, "student@fixture.test", "Student", "user", 0, "fixture-student", "2026-11-19T12:00:00.000Z");
    firstDb.prepare("INSERT INTO account(id,accountId,providerId,userId) VALUES(?,?,?,?)").run("fixture-account", "fixture-github", "github", studentId);
    const base = await start(firstDb, directory);
    const classroom = await api(base, "/api/teacher/classrooms", teacherId, "teacher", "POST", { title: "Persistencia", subject: "Ciencias", groupLabel: "7A" });
    const classroomId = classroom.body.data.id as string;
    const skill = await api(base, "/api/teacher/skills", teacherId, "teacher", "POST", { name: "Observación" });
    const skillId = skill.body.data.id as string;
    const code = await api(base, `/api/teacher/classrooms/${classroomId}/join-code`, teacherId, "teacher", "POST", {});
    const request = await api(base, "/api/classroom-join-requests", studentId, "student", "POST", { code: code.body.data.code });
    expect(request.body.data.status).toBe("pending");
    expect((await api(base, `/api/teacher/classrooms/${classroomId}/enrollments/${request.body.data.id}/approve`, teacherId, "teacher", "POST")).status).toBe(200);
    expect((await api(base, `/api/teacher/classrooms/${classroomId}/skills/${skillId}`, teacherId, "teacher", "PUT", { enabled: true })).status).toBe(200);

    await new Promise<void>((done) => { const old = resources.pop()!; old.server.close(() => { old.database.close(); done(); }); old.server.closeAllConnections(); });
    const secondDb = new DatabaseSync(file); migrate(secondDb);
    const restarted = await start(secondDb, directory);
    expect((await api(restarted, "/api/me/classrooms", studentId, "student")).body.data).toHaveLength(1);
    expect((await api(restarted, "/api/me/classroom-requests", studentId, "student")).body.data[0].status).toBe("active");
    expect((await api(restarted, `/api/me/classrooms/${classroomId}/skills`, studentId, "student")).body.data.map((item: { id: string }) => item.id)).toEqual([skillId]);
  });
});
