import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../../db/migrate.js";
import { createHttpHandler } from "../../http/app.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";

const servers: Server[] = [];
const databases: DatabaseSync[] = [];
const fixtureTeacherA = "fixture-teacher-a";
const fixtureTeacherB = "fixture-teacher-b";
const fixtureStudentA = "fixture-student-a";
const fixtureStudentB = "fixture-student-b";

async function start() {
  const database = new DatabaseSync(":memory:"); databases.push(database); migrate(database);
  database.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT, name TEXT, image TEXT, role TEXT DEFAULT 'user', isTeacher INTEGER DEFAULT 0, githubLogin TEXT, createdAt TEXT);
    CREATE TABLE account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL);`);
  for (const [id, isTeacher, login] of [
    [fixtureTeacherA, 1, "teacher-a"], [fixtureTeacherB, 1, "teacher-b"],
    [fixtureStudentA, 0, "student-a"], [fixtureStudentB, 0, "student-b"],
  ] as const) {
    database.prepare("INSERT INTO user(id,email,name,image,role,isTeacher,githubLogin,createdAt) VALUES(?,?,?,?,?,?,?,?)")
      .run(id, `${login}@fixture.test`, login, null, "user", isTeacher, login, "2026-11-19T12:00:00.000Z");
    if (!isTeacher) database.prepare("INSERT INTO account(id,accountId,providerId,userId) VALUES(?,?,'github',?)").run(`account-${id}`, `github-${id}`, id);
  }
  const auth = {
    handle: (_request: unknown, response: { writeHead: (status: number) => { end: () => void } }) => { response.writeHead(503).end(); },
    async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
    async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
    async student(request: { headers: Record<string, string | undefined> }) {
      const id = request.headers["x-fixture-user"];
      if (!id) return null;
      const row = database.prepare(`SELECT u.id,a.accountId,u.githubLogin,u.image,u.createdAt FROM user u JOIN account a ON a.userId=u.id AND a.providerId='github'
        WHERE u.id=? AND u.isTeacher=0`).get(id) as { id: string; accountId: string; githubLogin: string | null; image: string | null; createdAt: string } | undefined;
      return row ? { id: row.id, githubAccountId: row.accountId, githubLogin: row.githubLogin, avatarUrl: row.image, registeredAt: row.createdAt } : null;
    },
    githubOAuthConfigured: true,
  } as unknown as FragmentsAuthService;
  const server = createServer(createHttpHandler(database, { auth })); servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected test server address");
  return { base: `http://127.0.0.1:${address.port}`, database };
}

async function request(base: string, path: string, user: string, role: "teacher" | "student", method = "GET", body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, headers: {
    "x-fixture-user": user, "x-fixture-role": role, ...(body === undefined ? {} : { "content-type": "application/json" }),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() as { ok: boolean; data?: any; error?: { code: string } } };
}

async function createClassroom(base: string, user = fixtureTeacherA, title = "Grupo A") {
  return request(base, "/api/teacher/classrooms", user, "teacher", "POST", { title, subject: "Programación", groupLabel: title });
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  for (const database of databases.splice(0)) database.close();
});

describe("Classroom Studio HTTP — synthetic identity fixtures", () => {
  it("isolates classrooms between teachers and never trusts client ownership", async () => {
    const { base } = await start();
    const created = await createClassroom(base);
    expect(created.status).toBe(201);
    const id = created.body.data!.id as string;
    expect((await createClassroom(base)).body.error!.code).toBe("CLASSROOM_EXISTS");
    expect((await createClassroom(base, fixtureTeacherA, "Grupo B")).status).toBe(201);
    const forged = await request(base, "/api/teacher/classrooms", fixtureTeacherA, "teacher", "POST", { title: "Forgery", subject: "X", groupLabel: "X", teacherId: fixtureTeacherB });
    expect(forged.status).toBe(400);
    expect((await request(base, "/api/teacher/classrooms", fixtureTeacherB, "teacher")).body.data.items).toHaveLength(0);
    expect((await request(base, `/api/teacher/classrooms/${id}`, fixtureTeacherB, "teacher")).status).toBe(404);
    expect((await request(base, `/api/teacher/classrooms/${id}`, fixtureTeacherB, "teacher", "PATCH", { title: "Robo" })).status).toBe(404);
  });

  it("keeps code enrollment pending until its owner approves and scopes student reads to the caller", async () => {
    const { base, database } = await start();
    const classroom = await createClassroom(base); const classId = classroom.body.data!.id as string;
    const skill = await request(base, "/api/teacher/skills", fixtureTeacherA, "teacher", "POST", { name: "  Custom Hooks  " });
    expect(skill.status).toBe(201);
    const skillId = skill.body.data!.id as string;
    expect((await request(base, `/api/teacher/classrooms/${classId}/skills/${skillId}`, fixtureTeacherA, "teacher", "PUT", { enabled: true })).status).toBe(200);
    expect((await request(base, `/api/me/classrooms/${classId}/skills`, fixtureStudentA, "student")).status).toBe(404);
    const generated = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    expect(generated.status).toBe(201);
    expect(Object.keys(generated.body.data!).sort()).toEqual(["code", "createdAt", "expiresAt"]);
    expect(generated.body.data).not.toHaveProperty("codeHash");
    const code = generated.body.data!.code as string;
    const storedCode = database.prepare("SELECT code_hash FROM class_join_codes").get() as { code_hash: string };
    expect(storedCode.code_hash).not.toBe(code);
    expect(storedCode.code_hash).toMatch(/^[a-f0-9]{64}$/);
    const first = await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code });
    const duplicate = await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code });
    expect(first.body.data.status).toBe("pending");
    expect(duplicate.body.data.id).toBe(first.body.data.id);
    expect((await request(base, "/api/me/classrooms", fixtureStudentA, "student")).body.data).toEqual([]);
    expect((await request(base, "/api/me/classroom-requests", fixtureStudentA, "student")).body.data).toHaveLength(1);
    expect((await request(base, "/api/me/classroom-requests", fixtureStudentB, "student")).body.data).toHaveLength(0);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/${first.body.data.id}/approve`, fixtureTeacherB, "teacher", "POST")).status).toBe(404);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/${first.body.data.id}/approve`, fixtureTeacherA, "teacher", "POST")).status).toBe(200);
    expect((await request(base, "/api/me/classrooms", fixtureStudentA, "student")).body.data).toHaveLength(1);
    expect((await request(base, `/api/me/classrooms/${classId}/skills`, fixtureStudentA, "student")).body.data.map((entry: { id: string }) => entry.id)).toEqual([skillId]);
    expect((await request(base, "/api/me/classrooms", fixtureStudentB, "student")).body.data).toEqual([]);
    expect((await request(base, `/api/me/classrooms/${classId}/skills`, fixtureStudentB, "student")).status).toBe(404);
    expect(Number(database.prepare("SELECT COUNT(*) AS count FROM class_enrollment_events").get()!.count)).toBe(2);
  });

  it("distinguishes direct teacher assignment, preserves its source and refuses silent reactivation", async () => {
    const { base, database } = await start();
    const classId = (await createClassroom(base)).body.data!.id as string;
    const assigned = await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: fixtureStudentA });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data).toMatchObject({ status: "active", source: "teacher_assignment", studentId: fixtureStudentA });
    expect((await request(base, "/api/me/classrooms", fixtureStudentA, "student")).body.data).toHaveLength(1);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: "fixture-unknown" })).status).toBe(404);
    expect(Number(database.prepare("SELECT COUNT(*) AS count FROM class_enrollment_events WHERE source='teacher_assignment'").get()!.count)).toBe(1);
    const code = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    const pending = await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: code.body.data.code });
    expect(pending.body.data.status).toBe("pending");
    const directFromPending = await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: fixtureStudentB });
    expect(directFromPending.body.data).toMatchObject({ status: "active", source: "teacher_assignment" });
    expect(Number(database.prepare("SELECT COUNT(*) AS count FROM class_enrollment_events WHERE enrollment_id=? AND previous_status='pending' AND next_status='active' AND source='teacher_assignment'").get(pending.body.data.id)!.count)).toBe(1);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/${assigned.body.data.id}/remove`, fixtureTeacherA, "teacher", "POST")).status).toBe(200);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: fixtureStudentA })).status).toBe(409);
  });

  it("rejects expired, revoked, and repeated invalid codes without granting membership", async () => {
    const { base, database } = await start();
    const classId = (await createClassroom(base)).body.data!.id as string;
    const expired = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", { expiresInDays: 1 });
    database.prepare("UPDATE class_join_codes SET expires_at='2000-01-01T00:00:00.000Z' WHERE code_hash IS NOT NULL").run();
    expect((await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code: expired.body.data.code })).body.error!.code).toBe("INVALID_JOIN_CODE");
    const current = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    expect((await request(base, `/api/teacher/classrooms/${classId}/join-code/revoke`, fixtureTeacherA, "teacher", "POST")).status).toBe(200);
    expect((await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code: current.body.data.code })).body.error!.code).toBe("INVALID_JOIN_CODE");
    let final!: Awaited<ReturnType<typeof request>>;
    for (let i = 0; i < 11; i++) final = await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: "X".repeat(43) });
    expect(final.status).toBe(429);
    expect((await request(base, "/api/me/classrooms", fixtureStudentA, "student")).body.data).toEqual([]);
  });

  it("archives aulas without reactivating their old join codes or pending enrollments", async () => {
    const { base } = await start();
    const classId = (await createClassroom(base)).body.data!.id as string;
    const generated = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    const pending = await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code: generated.body.data.code });
    expect(pending.body.data.status).toBe("pending");
    expect((await request(base, `/api/teacher/classrooms/${classId}`, fixtureTeacherA, "teacher", "PATCH", { status: "archived" })).body.data.status).toBe("archived");
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/${pending.body.data.id}/approve`, fixtureTeacherA, "teacher", "POST")).status).toBe(409);
    expect((await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: generated.body.data.code })).status).toBe(404);
    expect((await request(base, `/api/teacher/classrooms/${classId}`, fixtureTeacherA, "teacher", "PATCH", { status: "active" })).status).toBe(200);
    expect((await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: generated.body.data.code })).status).toBe(404);
    expect((await request(base, "/api/me/classrooms", fixtureStudentA, "student")).body.data).toEqual([]);
  });

  it("isolates skill catalogs by teacher and preserves archived entries", async () => {
    const { base } = await start();
    const skill = await request(base, "/api/teacher/skills", fixtureTeacherA, "teacher", "POST", { name: "Accesibilidad" });
    expect(skill.status).toBe(201);
    expect((await request(base, "/api/teacher/skills", fixtureTeacherB, "teacher")).body.data).toEqual([]);
    expect((await request(base, "/api/teacher/skills", fixtureStudentA, "student")).status).toBe(403);
    expect((await request(base, `/api/teacher/skills/${skill.body.data.id}/archive`, fixtureTeacherA, "teacher", "POST")).body.data.archived).toBe(true);
    expect((await request(base, "/api/teacher/skills", fixtureTeacherA, "teacher")).body.data).toHaveLength(1);
    const duplicate = await request(base, "/api/teacher/skills", fixtureTeacherA, "teacher", "POST", { name: "  ACCESIBILIDAD " });
    expect(duplicate.status).toBe(409);
  });
});
