import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createHttpHandler } from "../../http/app.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar persistencia Classroom con PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID();
const teacherId = `fixture-persist-teacher-${namespace}`;
const studentId = `fixture-persist-student-${namespace}`;
let prisma: PrismaClient;
let server: Server | undefined;

async function start() {
  const auth = {
    handle: (_request: unknown, response: { writeHead: (status: number) => { end: () => void } }) => { response.writeHead(503).end(); },
    async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
    async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
    async student(request: { headers: Record<string, string | undefined> }) { const id = request.headers["x-fixture-user"]; return id === studentId ? { id, githubAccountId: `github-${namespace}`, githubLogin: "fixture-student", avatarUrl: null, registeredAt: new Date().toISOString() } : null; },
    async studentAccess(request: { headers: Record<string, string | undefined> }) { const student = await this.student(request); return student ? { kind: "student" as const, student } : { kind: "session_required" as const }; },
    githubOAuthConfigured: true,
  } as unknown as FragmentsAuthService;
  server = createServer(createHttpHandler(prisma, { auth }));
  await new Promise<void>((done) => server!.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected test server address");
  return `http://127.0.0.1:${address.port}`;
}

async function api(base: string, path: string, user: string, role: "teacher" | "student", method = "GET", body?: unknown) {
  const response = await fetch(`${base}${path}`, { method, headers: { "x-fixture-user": user, "x-fixture-role": role, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  return { status: response.status, body: await response.json() as { data?: any; error?: { code: string } } };
}

describePostgres("Classroom Studio persistence — PostgreSQL integration", () => {
  beforeAll(async () => {
    prisma = openDatabase(databaseUrl!);
    await prisma.$connect();
    await prisma.user.createMany({ data: [
      { id: teacherId, name: "Teacher", email: `${teacherId}@fixture.test`, emailVerified: true, isTeacher: true },
      { id: studentId, name: "Student", email: `${studentId}@fixture.test`, emailVerified: true, githubLogin: "fixture-student" },
    ] });
    await prisma.account.create({ data: { id: `account-${namespace}`, providerId: "github", accountId: `github-${namespace}`, userId: studentId } });
  });
  afterAll(async () => {
    if (!prisma) return;
    if (server) { server.closeAllConnections(); await new Promise<void>((done) => server!.close(() => done())); }
    await prisma.classEnrollmentEvent.deleteMany({ where: { enrollment: { studentId } } });
    await prisma.classEnrollment.deleteMany({ where: { studentId } });
    await prisma.classJoinAttempt.deleteMany({ where: { studentId } });
    await prisma.classroomSkillAvailability.deleteMany({ where: { teacherId } });
    await prisma.classJoinCode.deleteMany({ where: { classroom: { teacherId } } });
    await prisma.classroom.deleteMany({ where: { teacherId } });
    await prisma.teacherSkill.deleteMany({ where: { teacherId } });
    await prisma.account.deleteMany({ where: { userId: { in: [teacherId, studentId] } } });
    await prisma.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
    await prisma.$disconnect();
  });

  it("preserves classes, enrollment, and authorized skills across an API restart", async () => {
    const base = await start();
    const classroom = await api(base, "/api/teacher/classrooms", teacherId, "teacher", "POST", { title: "Persistencia", subject: "Ciencias", groupLabel: "7A" });
    const classroomId = classroom.body.data!.id as string;
    const skill = await api(base, "/api/teacher/skills", teacherId, "teacher", "POST", { name: "Observación" });
    const skillId = skill.body.data!.id as string;
    const code = await api(base, `/api/teacher/classrooms/${classroomId}/join-code`, teacherId, "teacher", "POST", {});
    const request = await api(base, "/api/classroom-join-requests", studentId, "student", "POST", { code: code.body.data!.code });
    expect(request.body.data!.status).toBe("pending");
    expect((await api(base, `/api/teacher/classrooms/${classroomId}/enrollments/${request.body.data!.id}/approve`, teacherId, "teacher", "POST")).status).toBe(200);
    expect((await api(base, `/api/teacher/classrooms/${classroomId}/skills/${skillId}`, teacherId, "teacher", "PUT", { enabled: true })).status).toBe(200);

    server!.closeAllConnections();
    await new Promise<void>((done) => server!.close(() => done()));
    const restarted = await start();
    expect((await api(restarted, "/api/me/classrooms", studentId, "student")).body.data).toHaveLength(1);
    expect((await api(restarted, "/api/me/classroom-requests", studentId, "student")).body.data![0].status).toBe("active");
    expect((await api(restarted, `/api/me/classrooms/${classroomId}/skills`, studentId, "student")).body.data!.map((item: { id: string }) => item.id)).toEqual([skillId]);
  });
});
