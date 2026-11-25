import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createHttpHandler } from "../../http/app.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createPrismaMentorRepository } from "./prisma-repository.js";
import { createMentorService } from "./service.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para la prueba F18.C.1.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID();
const teacherA = `f18c1-teacher-a-${namespace}`;
const teacherB = `f18c1-teacher-b-${namespace}`;
const teacherUnrelated = `f18c1-teacher-c-${namespace}`;
const studentId = `f18c1-student-${namespace}`;
const unlinkedStudentId = `f18c1-unlinked-student-${namespace}`;
const classroomA = `f18c1-class-a-${namespace}`;
const classroomB = `f18c1-class-b-${namespace}`;
const assignmentA = `f18c1-assignment-a-${namespace}`;
const assignmentB = `f18c1-assignment-b-${namespace}`;
const versionA = `f18c1-version-a-${namespace}`;
const versionB = `f18c1-version-b-${namespace}`;
let database: PrismaClient | undefined;
let server: Server | undefined;
let base = "";
let linkedA = "";
let linkedB = "";
let unlinked = "";

describePostgres("F18.C.1 teacher project ACL — PostgreSQL fragments_test", () => {
  beforeAll(async () => {
    const configured = new URL(databaseUrl!);
    if (configured.pathname !== "/fragments_test" || !["localhost", "127.0.0.1", "::1"].includes(configured.hostname)) {
      throw new Error("F18.C.1 only writes to a local fragments_test database.");
    }
    const db = openDatabase(databaseUrl!);
    await db.$connect();
    const [{ name }] = await db.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (name !== "fragments_test") {
      await db.$disconnect();
      throw new Error("F18.C.1 refuses fixture writes outside fragments_test.");
    }
    database = db;
    const now = new Date();
    await db.user.createMany({ data: [
      { id: teacherA, name: "Fixture docente A", email: `${teacherA}@fixture.test`, emailVerified: true, isTeacher: true },
      { id: teacherB, name: "Fixture docente B", email: `${teacherB}@fixture.test`, emailVerified: true, isTeacher: true },
      { id: teacherUnrelated, name: "Fixture docente sin aula", email: `${teacherUnrelated}@fixture.test`, emailVerified: true, isTeacher: true },
      { id: studentId, name: "Fixture estudiante", email: `${studentId}@fixture.test`, emailVerified: true, isTeacher: false, githubLogin: "f18c1-student" },
      { id: unlinkedStudentId, name: "Fixture estudiante sin matrícula", email: `${unlinkedStudentId}@fixture.test`, emailVerified: true, isTeacher: false, githubLogin: "f18c1-unlinked" },
    ] });
    await db.account.createMany({ data: [studentId, unlinkedStudentId].map((id) => ({ id: `account-${id}`, accountId: `github-${id}`, providerId: "github", userId: id })) });
    await db.classroom.createMany({ data: [
      { id: classroomA, teacherId: teacherA, title: "Aula A fixture", subject: "Programación", identityKey: `${namespace}-a`, status: "active", createdAt: now, updatedAt: now },
      { id: classroomB, teacherId: teacherB, title: "Aula B fixture", subject: "Programación", identityKey: `${namespace}-b`, status: "active", createdAt: now, updatedAt: now },
    ] });
    await db.classEnrollment.createMany({ data: [
      { id: `enrollment-a-${namespace}`, classroomId: classroomA, studentId, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherA },
      { id: `enrollment-b-${namespace}`, classroomId: classroomB, studentId, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherB },
    ] });
    for (const [id, classroomId, teacherId, versionId, title] of [
      [assignmentA, classroomA, teacherA, versionA, "Misión aula A"],
      [assignmentB, classroomB, teacherB, versionB, "Misión aula B"],
    ]) {
      await db.classroomAssignment.create({ data: { id, classroomId, status: "published", draftVersion: 2, publishedVersion: 1,
        draftJson: { title, instructions: "Fixture sintético", objectives: ["Probar ACL"], requiredSkillIds: [], optionalSkillIds: [] }, createdAt: now, updatedAt: now } });
      await db.classroomAssignmentVersion.create({ data: { id: versionId, assignmentId: id, version: 1,
        snapshotJson: { title, instructions: "Fixture sintético", objectives: ["Probar ACL"], requiredSkills: [], optionalSkills: [] }, mentorContextVersion: 1, createdAt: now } });
    }
    const mentor = createPrismaMentorRepository(db);
    const proposal = (title: string) => ({ title, problem: "Caso QA sintético para comprobar permisos del docente.",
      solution: "Mostrar únicamente el proyecto ligado al aula autorizada.", description: "Fixture de integración; no contiene datos de alumnos reales.",
      purpose: "Verificar ACL académica.", goals: ["Aislar el historial"], skills: [], scope: "Solo datos sintéticos.", constraints: [] });
    linkedA = (await mentor.createProposalDraftByUser(proposal("Propuesta aula A"), studentId, versionA)).id;
    linkedB = (await mentor.createProposalDraftByUser(proposal("Propuesta aula B"), studentId, versionB)).id;
    unlinked = (await mentor.createProposalDraftByUser(proposal("Borrador personal"), studentId)).id;
    await db.proposal.create({ data: { id: `legacy-${namespace}`, version: 1, proposalJson: proposal("Histórico anónimo privado"), updatedAt: now, ownerHash: `hash-${namespace}`, ownerUserId: null } });

    const auth = {
      async handle(_request: unknown, response: { writeHead: (status: number) => { end: () => void } }) { response.writeHead(503).end(); },
      async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
      async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
      async student() { return null; },
      githubOAuthConfigured: true,
    } as unknown as FragmentsAuthService;
    const service = createMentorService({ evaluator: createLocalMentorEvaluator(), pdf: createMinimalPdfRenderer() });
    server = createServer(createHttpHandler(db, { auth, mentor: service }));
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected local HTTP listener.");
    base = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    if (!database) return;
    try {
      await database.proposal.deleteMany({ where: { ownerUserId: studentId } });
      await database.proposal.deleteMany({ where: { id: `legacy-${namespace}` } });
      await database.classroomAssignmentVersion.deleteMany({ where: { assignment: { classroomId: { in: [classroomA, classroomB] } } } });
      await database.classroomAssignment.deleteMany({ where: { id: { in: [assignmentA, assignmentB] } } });
      await database.classEnrollment.deleteMany({ where: { classroomId: { in: [classroomA, classroomB] } } });
      await database.classroom.deleteMany({ where: { id: { in: [classroomA, classroomB] } } });
      await database.account.deleteMany({ where: { userId: { in: [studentId, unlinkedStudentId] } } });
      await database.user.deleteMany({ where: { id: { in: [teacherA, teacherB, teacherUnrelated, studentId, unlinkedStudentId] } } });
    } finally { await database.$disconnect(); database = undefined; }
  });

  async function get(path: string, teacherId: string) {
    const response = await fetch(`${base}${path}`, { headers: { "x-fixture-user": teacherId, "x-fixture-role": "teacher" } });
    return { status: response.status, body: await response.json() as { data?: any; error?: { code: string } } };
  }

  it("returns only linked projects within the teacher's active classrooms and hides anonymous history", async () => {
    const forTeacherA = await get(`/api/teacher/students/${studentId}/projects`, teacherA);
    expect(forTeacherA.status).toBe(200);
    expect(forTeacherA.body.data.map((item: { id: string }) => item.id)).toEqual([linkedA]);
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Borrador personal");
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Propuesta aula B");

    const forTeacherB = await get(`/api/teacher/students/${studentId}/projects`, teacherB);
    expect(forTeacherB.status).toBe(200);
    expect(forTeacherB.body.data.map((item: { id: string }) => item.id)).toEqual([linkedB]);

    const unrelated = await get(`/api/teacher/students/${studentId}/projects`, teacherUnrelated);
    expect(unrelated.status).toBe(404);
    expect(unrelated.body.error?.code).toBe("NOT_FOUND");

    const directory = await get("/api/teacher/students", teacherA);
    expect(directory.status).toBe(200);
    expect(directory.body.data.items.find((item: { id: string }) => item.id === studentId)?.projectCount).toBe(1);
    expect(directory.body.data.items.map((item: { id: string }) => item.id)).not.toContain(unlinkedStudentId);

    const historical = await get("/api/teacher/historical-projects", teacherA);
    expect(historical.status).toBe(404);
    expect(JSON.stringify(historical.body)).not.toContain("Histórico anónimo privado");
    expect([linkedA, linkedB, unlinked]).toHaveLength(3);
  });
});
