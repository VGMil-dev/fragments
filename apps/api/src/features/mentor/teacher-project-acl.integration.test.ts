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
const controlVersion = Number.parseInt(namespace.replaceAll("-", "").slice(0, 7), 16) + 1;
const teacherA = `f18c1-teacher-a-${namespace}`;
const teacherB = `f18c1-teacher-b-${namespace}`;
const teacherUnrelated = `f18c1-teacher-c-${namespace}`;
const studentId = `f18c1-student-${namespace}`;
const unlinkedStudentId = `f18c1-unlinked-student-${namespace}`;
const classroomA = `f18c1-class-a-${namespace}`;
const classroomB = `f18c1-class-b-${namespace}`;
const classroomArchived = `f18c1-class-archived-${namespace}`;
const classroomRemoved = `f18c1-class-removed-${namespace}`;
const classroomDraft = `f18c1-class-draft-${namespace}`;
const assignmentA = `f18c1-assignment-a-${namespace}`;
const assignmentB = `f18c1-assignment-b-${namespace}`;
const assignmentArchived = `f18c1-assignment-archived-${namespace}`;
const assignmentRemoved = `f18c1-assignment-removed-${namespace}`;
const assignmentDraft = `f18c1-assignment-draft-${namespace}`;
const versionA = `f18c1-version-a-${namespace}`;
const versionB = `f18c1-version-b-${namespace}`;
const versionArchived = `f18c1-version-archived-${namespace}`;
const versionRemoved = `f18c1-version-removed-${namespace}`;
const versionDraft = `f18c1-version-draft-${namespace}`;
let database: PrismaClient | undefined;
let server: Server | undefined;
let base = "";
let linkedA = "";
let linkedB = "";
let unlinked = "";
let linkedArchived = "";
let linkedRemoved = "";
let linkedDraft = "";

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
      { id: classroomArchived, teacherId: teacherA, title: "Aula archivada fixture", subject: "Programación", identityKey: `${namespace}-archived`, status: "archived", createdAt: now, updatedAt: now },
      { id: classroomRemoved, teacherId: teacherA, title: "Aula matrícula retirada fixture", subject: "Programación", identityKey: `${namespace}-removed`, status: "active", createdAt: now, updatedAt: now },
      { id: classroomDraft, teacherId: teacherA, title: "Aula misión draft fixture", subject: "Programación", identityKey: `${namespace}-draft`, status: "active", createdAt: now, updatedAt: now },
    ] });
    await db.classEnrollment.createMany({ data: [
      { id: `enrollment-a-${namespace}`, classroomId: classroomA, studentId, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherA },
      { id: `enrollment-b-${namespace}`, classroomId: classroomB, studentId, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherB },
      { id: `enrollment-archived-${namespace}`, classroomId: classroomArchived, studentId, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherA },
      { id: `enrollment-removed-${namespace}`, classroomId: classroomRemoved, studentId, status: "removed", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherA },
      { id: `enrollment-draft-${namespace}`, classroomId: classroomDraft, studentId, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherA },
    ] });
    for (const [id, classroomId, teacherId, versionId, title] of [
      [assignmentA, classroomA, teacherA, versionA, "Misión aula A"],
      [assignmentB, classroomB, teacherB, versionB, "Misión aula B"],
      [assignmentArchived, classroomArchived, teacherA, versionArchived, "Misión aula archivada"],
      [assignmentRemoved, classroomRemoved, teacherA, versionRemoved, "Misión matrícula retirada"],
      [assignmentDraft, classroomDraft, teacherA, versionDraft, "Misión sin publicar"],
    ]) {
      await db.classroomAssignment.create({ data: { id, classroomId, status: id === assignmentDraft ? "draft" : "published", draftVersion: 2, publishedVersion: id === assignmentDraft ? null : 1,
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
    linkedArchived = (await mentor.createProposalDraftByUser(proposal("Propuesta aula archivada"), studentId, versionArchived)).id;
    linkedRemoved = (await mentor.createProposalDraftByUser(proposal("Propuesta matrícula retirada"), studentId, versionRemoved)).id;
    linkedDraft = (await mentor.createProposalDraftByUser(proposal("Propuesta misión sin publicar"), studentId, versionDraft)).id;
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
      await database.mentorAcademicProjectModeration.deleteMany({ where: { proposalId: { in: [linkedA, linkedB] } } });
      await database.proposal.deleteMany({ where: { ownerUserId: studentId } });
      await database.proposal.deleteMany({ where: { id: `legacy-${namespace}` } });
      await database.mentorControlVersion.deleteMany({ where: { version: controlVersion } });
      await database.classroomAssignmentVersion.deleteMany({ where: { assignment: { classroomId: { in: [classroomA, classroomB] } } } });
      await database.classroomAssignmentVersion.deleteMany({ where: { assignment: { classroomId: { in: [classroomArchived, classroomRemoved, classroomDraft] } } } });
      await database.classroomAssignment.deleteMany({ where: { id: { in: [assignmentA, assignmentB, assignmentArchived, assignmentRemoved, assignmentDraft] } } });
      await database.classEnrollment.deleteMany({ where: { classroomId: { in: [classroomA, classroomB, classroomArchived, classroomRemoved, classroomDraft] } } });
      await database.classroom.deleteMany({ where: { id: { in: [classroomA, classroomB, classroomArchived, classroomRemoved, classroomDraft] } } });
      await database.account.deleteMany({ where: { userId: { in: [studentId, unlinkedStudentId] } } });
      await database.user.deleteMany({ where: { id: { in: [teacherA, teacherB, teacherUnrelated, studentId, unlinkedStudentId] } } });
    } finally { await database.$disconnect(); database = undefined; }
  });

  async function get(path: string, teacherId: string) {
    const response = await fetch(`${base}${path}`, { headers: { "x-fixture-user": teacherId, "x-fixture-role": "teacher" } });
    return { status: response.status, body: await response.json() as { data?: any; error?: { code: string } } };
  }

  it("returns only linked projects within the teacher's active classrooms and hides anonymous history", async () => {
    const now = new Date();
    const forTeacherA = await get(`/api/teacher/students/${studentId}/projects`, teacherA);
    expect(forTeacherA.status).toBe(200);
    expect(forTeacherA.body.data.map((item: { id: string }) => item.id)).toEqual([linkedA]);
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Borrador personal");
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Propuesta aula B");
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Propuesta aula archivada");
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Propuesta matrícula retirada");
    expect(JSON.stringify(forTeacherA.body)).not.toContain("Propuesta misión sin publicar");

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

    const assignmentIdentities = await get("/api/teacher/student-identities", teacherA);
    expect(assignmentIdentities.status).toBe(200);
    expect(assignmentIdentities.body.data.items.map((item: { id: string }) => item.id)).toContain(unlinkedStudentId);
    expect(JSON.stringify(assignmentIdentities.body)).not.toContain("projectCount");

    const historical = await get("/api/teacher/historical-projects", teacherA);
    expect(historical.status).toBe(404);
    expect(JSON.stringify(historical.body)).not.toContain("Histórico anónimo privado");

    await database!.mentorControlVersion.create({ data: { version: controlVersion, configJson: {}, publishedAt: now, publishedBy: teacherA } });
    const evaluationId = `evaluation-${namespace}`;
    await database!.mentorEvaluation.create({ data: { id: evaluationId, proposalId: linkedA, proposalVersion: 1, evaluationJson: {}, evaluatedAt: now, inputDigest: `digest-${namespace}`, contextVersion: controlVersion } });
    await database!.mentorAcademicPublication.create({ data: { proposalId: linkedA, proposalVersion: 1, evaluationId, contextVersion: controlVersion, rubricVersion: "fixture-v1", publishedAt: now } });
    const deniedWithdrawal = await fetch(`${base}/api/teacher/projects/${linkedA}/withdraw`, { method: "POST", headers: { "x-fixture-user": teacherB, "x-fixture-role": "teacher", "content-type": "application/json" }, body: JSON.stringify({ reason: "Fixture de control ACL" }) });
    expect(deniedWithdrawal.status).toBe(409);
    expect(await database!.mentorAcademicProjectModeration.findUnique({ where: { proposalId: linkedA } })).toBeNull();
    const allowedWithdrawal = await fetch(`${base}/api/teacher/projects/${linkedA}/withdraw`, { method: "POST", headers: { "x-fixture-user": teacherA, "x-fixture-role": "teacher", "content-type": "application/json" }, body: JSON.stringify({ reason: "Fixture de control ACL" }) });
    expect(allowedWithdrawal.status).toBe(200);
    expect(await database!.mentorAcademicProjectModeration.findUnique({ where: { proposalId: linkedA } })).toMatchObject({ withdrawnBy: teacherA });
    expect([linkedA, linkedB, linkedArchived, linkedRemoved, linkedDraft, unlinked]).toHaveLength(6);
  });
});
