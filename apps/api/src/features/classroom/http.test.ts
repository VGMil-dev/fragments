import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { createHttpHandler } from "../../http/app.js";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";

const servers: Server[] = [];
const prismaClients: PrismaClient[] = [];
const namespace = randomUUID();
const fixtureTeacherA = `fixture-teacher-a-${namespace}`;
const fixtureTeacherB = `fixture-teacher-b-${namespace}`;
const fixtureStudentA = `fixture-student-a-${namespace}`;
const fixtureStudentB = `fixture-student-b-${namespace}`;
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Classroom Studio con PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;

async function start() {
  const prisma = openDatabase(databaseUrl!); prismaClients.push(prisma); await prisma.$connect();
  for (const [id, isTeacher, login] of [
    [fixtureTeacherA, 1, "teacher-a"], [fixtureTeacherB, 1, "teacher-b"],
    [fixtureStudentA, 0, "student-a"], [fixtureStudentB, 0, "student-b"],
  ] as const) {
    await prisma.user.upsert({ where: { id }, create: { id, name: login, email: `${login}@fixture.test`, emailVerified: true, role: "user", isTeacher: Boolean(isTeacher), githubLogin: login }, update: { name: login, role: "user", isTeacher: Boolean(isTeacher), githubLogin: login } });
    if (!isTeacher) await prisma.account.upsert({ where: { providerId_accountId: { providerId: "github", accountId: `github-${id}` } },
      create: { id: `account-${id}`, providerId: "github", accountId: `github-${id}`, userId: id }, update: { userId: id } });
  }
  const auth = {
    handle: (_request: unknown, response: { writeHead: (status: number) => { end: () => void } }) => { response.writeHead(503).end(); },
    async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
    async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
    async student(request: { headers: Record<string, string | undefined> }) {
      const id = request.headers["x-fixture-user"];
      if (!id) return null;
      const row = await prisma.user.findFirst({ where: { id, isTeacher: false, accounts: { some: { providerId: "github" } } }, include: { accounts: { where: { providerId: "github" }, take: 1 } } });
      const account = row?.accounts[0];
      return row && account ? { id: row.id, githubAccountId: account.accountId, githubLogin: row.githubLogin, avatarUrl: row.image, registeredAt: row.createdAt.toISOString() } : null;
    },
    githubOAuthConfigured: true,
  } as unknown as FragmentsAuthService;
  const server = createServer(createHttpHandler(prisma, { auth })); servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected test server address");
  return { base: `http://127.0.0.1:${address.port}`, database: prisma, prisma };
}

async function request(base: string, path: string, user: string, role: "teacher" | "student", method = "GET", body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, signal: AbortSignal.timeout(5_000), headers: {
    "x-fixture-user": user, "x-fixture-role": role, ...(body === undefined ? {} : { "content-type": "application/json" }),
  }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() as { ok: boolean; data?: any; error?: { code: string } } };
}

async function createClassroom(base: string, user = fixtureTeacherA, title = "Grupo A", subject = "Programación") {
  return request(base, "/api/teacher/classrooms", user, "teacher", "POST", { title, subject, groupLabel: title });
}

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  const ids = [fixtureTeacherA, fixtureTeacherB, fixtureStudentA, fixtureStudentB];
  for (const prisma of prismaClients.splice(0)) {
    await prisma.classEnrollmentEvent.deleteMany({ where: { enrollment: { studentId: { in: ids } } } });
    await prisma.classEnrollment.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.classJoinAttempt.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.classroomSkillAvailability.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.classJoinCode.deleteMany({ where: { classroom: { teacherId: { in: ids } } } });
    await prisma.classroom.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.teacherSkill.deleteMany({ where: { teacherId: { in: ids } } });
    await prisma.account.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
});

describePostgres("Classroom Studio HTTP — PostgreSQL integration", () => {
  it("isolates classrooms between teachers and never trusts client ownership", async () => {
    const { base } = await start();
    const created = await createClassroom(base);
    expect(created.status).toBe(201);
    const id = created.body.data!.id as string;
    expect(created.body.data).toMatchObject({ groupLabel: null });
    expect((await createClassroom(base)).body.error!.code).toBe("CLASSROOM_EXISTS");
    expect((await createClassroom(base, fixtureTeacherA, "Grupo B")).body.error!.code).toBe("CLASSROOM_EXISTS");
    expect((await createClassroom(base, fixtureTeacherA, "Desarrollo web", "Desarrollo web")).status).toBe(201);
    const forged = await request(base, "/api/teacher/classrooms", fixtureTeacherA, "teacher", "POST", { title: "Forgery", subject: "X", groupLabel: "X", teacherId: fixtureTeacherB });
    expect(forged.status).toBe(400);
    expect((await request(base, "/api/teacher/classrooms", fixtureTeacherB, "teacher")).body.data.items).toHaveLength(0);
    expect((await request(base, `/api/teacher/classrooms/${id}`, fixtureTeacherB, "teacher")).status).toBe(404);
    expect((await request(base, `/api/teacher/classrooms/${id}`, fixtureTeacherB, "teacher", "PATCH", { title: "Robo" })).status).toBe(404);
  });

  it("returns only the authenticated teacher's classroom count and pending join requests", async () => {
    const { base, prisma } = await start();
    const ownActive = await createClassroom(base, fixtureTeacherA, "Aula móvil", "Programación móvil");
    const ownArchived = await createClassroom(base, fixtureTeacherA, "Aula histórica", "Diseño web");
    const foreign = await createClassroom(base, fixtureTeacherB, "Aula ajena", "Proyectos de software");
    const ownActiveId = ownActive.body.data!.id as string;
    const ownArchivedId = ownArchived.body.data!.id as string;
    const foreignId = foreign.body.data!.id as string;
    const archivedCode = await request(base, `/api/teacher/classrooms/${ownArchivedId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    const archivedRequest = await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: archivedCode.body.data!.code });
    expect(archivedRequest.body.data!.status).toBe("pending");
    await request(base, `/api/teacher/classrooms/${ownArchivedId}`, fixtureTeacherA, "teacher", "PATCH", { status: "archived" });

    const ownCode = await request(base, `/api/teacher/classrooms/${ownActiveId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    const foreignCode = await request(base, `/api/teacher/classrooms/${foreignId}/join-code`, fixtureTeacherB, "teacher", "POST", {});
    await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code: ownCode.body.data!.code });
    await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: foreignCode.body.data!.code });
    await prisma.classEnrollment.create({ data: {
      id: `fixture-assignment-pending-${namespace}`, classroomId: ownActiveId, studentId: fixtureStudentB,
      status: "pending", source: "teacher_assignment", requestedAt: new Date(),
    } });

    const anonymous = await fetch(`${base}/api/teacher/dashboard/summary`);
    expect(anonymous.status).toBe(401);
    expect((await request(base, "/api/teacher/dashboard/summary", fixtureStudentA, "student")).status).toBe(403);

    const own = await request(base, "/api/teacher/dashboard/summary", fixtureTeacherA, "teacher");
    expect(own.status).toBe(200);
    expect(own.body.data).toMatchObject({ totalClassrooms: 2, pendingJoinRequests: 1 });
    expect(own.body.data!.classrooms.map((classroom: { id: string }) => classroom.id).sort()).toEqual([ownActiveId, ownArchivedId].sort());

    const other = await request(base, "/api/teacher/dashboard/summary", fixtureTeacherB, "teacher");
    expect(other.body.data).toMatchObject({ totalClassrooms: 1, pendingJoinRequests: 1 });
    expect(other.body.data!.classrooms.map((classroom: { id: string }) => classroom.id)).toEqual([foreignId]);
  });

  it("preserves historical parallel identity keys and does not merge them into a new thematic classroom", async () => {
    const { base, prisma } = await start();
    const timestamp = new Date();
    const legacyId = `fixture-legacy-classroom-${namespace}`;
    const legacyKey = JSON.stringify(["programación móvil", "3.º bgu e2", ""]);
    await prisma.classroom.create({ data: {
      id: legacyId, teacherId: fixtureTeacherA, title: "Programación móvil · grupo previo", subject: "Programación móvil",
      groupLabel: "3.º BGU E2", identityKey: legacyKey, period: null, context: null, status: "archived",
      createdAt: timestamp, updatedAt: timestamp,
    } });
    const thematic = await createClassroom(base, fixtureTeacherA, "Programación móvil", "Programación móvil");
    expect(thematic.status).toBe(201);

    const renamed = await request(base, `/api/teacher/classrooms/${legacyId}`, fixtureTeacherA, "teacher", "PATCH", { title: "Aula histórica conservada" });
    expect(renamed.status).toBe(200);
    expect((await prisma.classroom.findUniqueOrThrow({ where: { id: legacyId } })).identityKey).toBe(legacyKey);

    const collision = await request(base, `/api/teacher/classrooms/${legacyId}`, fixtureTeacherA, "teacher", "PATCH", { groupLabel: null });
    expect(collision.status).toBe(409);
    expect(await prisma.classroom.findUniqueOrThrow({ where: { id: legacyId } })).toMatchObject({ groupLabel: "3.º BGU E2", identityKey: legacyKey });
    const summary = await request(base, "/api/teacher/dashboard/summary", fixtureTeacherA, "teacher");
    expect(summary.body.data).toMatchObject({ totalClassrooms: 2 });
  });

  it("keeps code enrollment pending until its owner approves and scopes student reads to the caller", async () => {
    const { base, prisma } = await start();
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
    const storedCode = await prisma.classJoinCode.findFirstOrThrow({ where: { classroomId: classId } });
    expect(storedCode.codeHash).not.toBe(code);
    expect(storedCode.codeHash).toMatch(/^[a-f0-9]{64}$/);
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
    expect(await prisma.classEnrollmentEvent.count({ where: { enrollmentId: first.body.data.id } })).toBe(2);
  });

  it("distinguishes direct teacher assignment, preserves its source and refuses silent reactivation", async () => {
    const { base, prisma } = await start();
    const classId = (await createClassroom(base)).body.data!.id as string;
    const assigned = await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: fixtureStudentA });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data).toMatchObject({ status: "active", source: "teacher_assignment", studentId: fixtureStudentA });
    expect((await request(base, "/api/me/classrooms", fixtureStudentA, "student")).body.data).toHaveLength(1);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: "fixture-unknown" })).status).toBe(404);
    expect(await prisma.classEnrollmentEvent.count({ where: { source: "teacher_assignment", actorUserId: fixtureTeacherA } })).toBe(1);
    const code = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    const pending = await request(base, "/api/classroom-join-requests", fixtureStudentB, "student", "POST", { code: code.body.data.code });
    expect(pending.body.data.status).toBe("pending");
    const directFromPending = await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: fixtureStudentB });
    expect(directFromPending.body.data).toMatchObject({ status: "active", source: "teacher_assignment" });
    expect(await prisma.classEnrollmentEvent.count({ where: { enrollmentId: pending.body.data.id, previousStatus: "pending", nextStatus: "active", source: "teacher_assignment" } })).toBe(1);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/${assigned.body.data.id}/remove`, fixtureTeacherA, "teacher", "POST")).status).toBe(200);
    expect((await request(base, `/api/teacher/classrooms/${classId}/enrollments/direct`, fixtureTeacherA, "teacher", "POST", { studentId: fixtureStudentA })).status).toBe(409);
  }, 15_000);

  it("rejects expired, revoked, and repeated invalid codes without granting membership", async () => {
    const { base, prisma } = await start();
    const classId = (await createClassroom(base)).body.data!.id as string;
    const expired = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", { expiresInDays: 1 });
    await prisma.classJoinCode.updateMany({ where: { classroom: { teacherId: fixtureTeacherA } }, data: { expiresAt: new Date("2000-01-01T00:00:00.000Z") } });
    expect((await request(base, "/api/classroom-join-requests", fixtureStudentA, "student", "POST", { code: expired.body.data.code })).body.error!.code).toBe("INVALID_JOIN_CODE");
    const current = await request(base, `/api/teacher/classrooms/${classId}/join-code`, fixtureTeacherA, "teacher", "POST", {});
    const revoked = await request(base, `/api/teacher/classrooms/${classId}/join-code/revoke`, fixtureTeacherA, "teacher", "POST");
    expect(revoked.status).toBe(200);
    expect(revoked.body.data).toEqual({ revoked: true });
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
