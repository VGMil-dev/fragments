import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createHttpHandler } from "../../http/app.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createMentorService } from "./service.js";

const databaseUrl = process.env.DATABASE_URL;
function databaseName(connectionString?: string): string | null {
  if (!connectionString) return null;
  try { return decodeURIComponent(new URL(connectionString).pathname.replace(/^\/+/, "").split("/")[0] ?? ""); }
  catch { return null; }
}
if (databaseUrl && databaseName(databaseUrl) !== "fragments_test") {
  throw new Error("Refusing F17.3 integration tests unless DATABASE_URL names fragments_test.");
}
const describePostgres = databaseUrl ? describe : describe.skip;

const namespace = randomUUID();
const teacherA = "fixture-f17-ux07-teacher-a-" + namespace;
const teacherB = "fixture-f17-ux07-teacher-b-" + namespace;
const studentA = "fixture-f17-ux07-student-a-" + namespace;
const studentB = "fixture-f17-ux07-student-b-" + namespace;
const ids = [teacherA, teacherB, studentA, studentB];
const classSizes = [0, 3, 12, 30, 50, 100] as const;
const classrooms = classSizes.map((_, index) => "fixture-f17-ux07-class-" + index + "-" + namespace);
const foreignClassroom = "fixture-f17-ux07-foreign-class-" + namespace;
const disabledSkill = "fixture-f17-ux07-disabled-" + namespace;
const archivedSkill = "fixture-f17-ux07-archived-" + namespace;
let database: PrismaClient | undefined;
let server: Server | undefined;
let base = "";
let availableSkillIds: string[] = [];

async function startTestServer() {
  const prisma = openDatabase(databaseUrl!);
  await prisma.$connect();
  const rows = await prisma.$queryRawUnsafe<Array<{ name: string }>>("SELECT current_database() AS name");
  if (rows[0]?.name !== "fragments_test") {
    await prisma.$disconnect();
    throw new Error("Refusing F17.3 fixture writes because the connected database is not fragments_test.");
  }
  database = prisma;
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
  const mentor = createMentorService({ evaluator: createLocalMentorEvaluator(), pdf: createMinimalPdfRenderer() });
  server = createServer(createHttpHandler(prisma, { auth, mentor }));
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected an ephemeral HTTP listener.");
  base = "http://127.0.0.1:" + address.port;
}

async function request(path: string, user: string, body?: unknown, method = body === undefined ? "GET" : "POST", role: "student" | "teacher" = "student") {
  const response = await fetch(base + path, {
    method,
    signal: AbortSignal.timeout(5_000),
    headers: { "x-fixture-user": user, "x-fixture-role": role, ...(body === undefined ? {} : { "content-type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  return { status: response.status, body: await response.json() as { ok: boolean; data?: any; error?: { code: string } } };
}

async function seedFixtures() {
  const prisma = database!;
  const now = new Date();
  for (const [id, name, isTeacher] of [
    [teacherA, "F17.3 teacher A", true], [teacherB, "F17.3 teacher B", true],
    [studentA, "F17.3 student A", false], [studentB, "F17.3 student B", false],
  ] as const) {
    await prisma.user.create({ data: { id, name, email: id + "@fixture.test", emailVerified: true, isTeacher, githubLogin: isTeacher ? null : "fixture-student" } });
  }
  for (const studentId of [studentA, studentB]) {
    await prisma.account.create({ data: { id: "account-" + studentId, accountId: "github-" + studentId, providerId: "github", userId: studentId } });
  }
  const classroomRows = classSizes.map((_, index) => ({
    id: classrooms[index]!, teacherId: teacherA, title: "UX-07 fixture " + classSizes[index], subject: "Programación",
    groupLabel: "Fixture " + index, identityKey: "f17.3:" + namespace + ":" + index,
    period: "2026-2", context: null, status: "active", createdAt: now, updatedAt: now,
  }));
  classroomRows.push({
    id: foreignClassroom, teacherId: teacherB, title: "Aula ajena", subject: "Programación",
    groupLabel: "Ajena", identityKey: "f17.3:" + namespace + ":foreign",
    period: "2026-2", context: null, status: "active", createdAt: now, updatedAt: now,
  });
  await prisma.classroom.createMany({ data: classroomRows });
  await prisma.classEnrollment.createMany({ data: [
    ...classrooms.map((classroomId) => ({ id: "enrollment-" + classroomId, classroomId, studentId: studentA, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherA })),
    { id: "enrollment-foreign-" + namespace, classroomId: foreignClassroom, studentId: studentB, status: "active", source: "teacher_assignment", requestedAt: now, decidedAt: now, decidedBy: teacherB },
  ] });

  const total = classSizes.reduce((sum, value) => sum + value, 0);
  const skills = Array.from({ length: total }, (_, index) => ({
    id: "fixture-f17-ux07-skill-" + index + "-" + namespace,
    teacherId: teacherA,
    name: "Habilidad fixture " + String(index + 1).padStart(3, "0"),
    normalizedName: "habilidad fixture " + String(index + 1).padStart(3, "0"),
    description: null, archived: false, createdAt: now, updatedAt: now,
  }));
  skills.push(
    { id: disabledSkill, teacherId: teacherA, name: "Habilidad deshabilitada", normalizedName: "habilidad deshabilitada " + namespace, description: null, archived: false, createdAt: now, updatedAt: now },
    { id: archivedSkill, teacherId: teacherA, name: "Habilidad archivada", normalizedName: "habilidad archivada " + namespace, description: null, archived: true, createdAt: now, updatedAt: now },
  );
  await prisma.teacherSkill.createMany({ data: skills });
  const availability: Array<{ classroomId: string; skillId: string; teacherId: string; enabled: boolean; updatedAt: Date }> = [];
  let cursor = 0;
  for (let index = 0; index < classSizes.length; index += 1) {
    for (let offset = 0; offset < classSizes[index]!; offset += 1) {
      availability.push({ classroomId: classrooms[index]!, skillId: skills[cursor]!.id, teacherId: teacherA, enabled: true, updatedAt: now });
      cursor += 1;
    }
  }
  availability.push(
    { classroomId: classrooms[1]!, skillId: disabledSkill, teacherId: teacherA, enabled: false, updatedAt: now },
    { classroomId: classrooms[1]!, skillId: archivedSkill, teacherId: teacherA, enabled: true, updatedAt: now },
  );
  await prisma.classroomSkillAvailability.createMany({ data: availability });
  availableSkillIds = skills.slice(0, classSizes[1]).map((skill) => skill.id);
}

async function cleanFixtures() {
  const prisma = database;
  if (!prisma) return;
  const classroomIds = [...classrooms, foreignClassroom];
  await prisma.proposal.deleteMany({ where: { ownerUserId: { in: [studentA, studentB] } } });
  await prisma.classEnrollmentEvent.deleteMany({ where: { enrollment: { classroomId: { in: classroomIds } } } });
  await prisma.classEnrollment.deleteMany({ where: { classroomId: { in: classroomIds } } });
  await prisma.classroomSkillAvailability.deleteMany({ where: { classroomId: { in: classroomIds } } });
  await prisma.classJoinCode.deleteMany({ where: { classroomId: { in: classroomIds } } });
  await prisma.classroom.deleteMany({ where: { id: { in: classroomIds } } });
  await prisma.teacherSkill.deleteMany({ where: { teacherId: { in: [teacherA, teacherB] } } });
  await prisma.account.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  database = undefined;
}

describePostgres("Mentor skill selections — guarded PostgreSQL integration", () => {
  beforeAll(async () => {
    await startTestServer();
    await seedFixtures();
  });
  afterAll(async () => {
    if (server) {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    }
    await cleanFixtures();
  });

  it("reads six catalog sizes and persists only authorized IDs for the authenticated student", async () => {
    const list = await request("/api/me/classrooms", studentA);
    expect(list.status).toBe(200);
    expect((list.body.data as Array<{ id: string }>).map((classroom) => classroom.id)).toHaveLength(6);
    for (let index = 0; index < classSizes.length; index += 1) {
      const response = await request("/api/me/classrooms/" + classrooms[index] + "/skills", studentA);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(classSizes[index]);
    }

    const unauthorizedClassroom = await request("/api/me/classrooms/" + foreignClassroom + "/skills", studentA);
    expect(unauthorizedClassroom.status).toBe(404);
    const otherIdentity = await request("/api/me/classrooms/" + classrooms[1] + "/skills", studentB);
    expect(otherIdentity.status).toBe(404);
    const teacherDraft = await request("/api/me/proposals/drafts", teacherA, { proposal: { title: "No autorizado" } });
    expect(teacherDraft.status).toBe(401);

    const validSelection = {
      proposal: {
        title: "Proyecto de prueba UX-07",
        skills: ["Texto que no debe persistir"],
        mentorSkills: { classroomId: classrooms[1], selectedSkillIds: [availableSkillIds[0]] },
      },
    };
    const created = await request("/api/me/proposals/drafts", studentA, validSelection);
    expect(created.status).toBe(201);
    expect(created.body.data.proposal.skills).toEqual(["Habilidad fixture 001"]);
    expect(created.body.data.proposal.mentorSkills).toEqual(validSelection.proposal.mentorSkills);
    const proposalId = created.body.data.id as string;
    const stored = await database!.proposal.findUnique({ where: { id: proposalId } });
    expect(stored?.version).toBe(1);
    expect(stored?.proposalJson).toMatchObject({ skills: ["Habilidad fixture 001"], mentorSkills: validSelection.proposal.mentorSkills });
    const firstRevision = await database!.proposalRevision.findUnique({ where: { proposalId_version: { proposalId, version: 1 } } });
    expect(firstRevision?.proposalJson).toMatchObject({ skills: ["Habilidad fixture 001"], mentorSkills: validSelection.proposal.mentorSkills });

    const invalidSelections = [
      { classroomId: foreignClassroom, selectedSkillIds: [availableSkillIds[0]] },
      { classroomId: classrooms[1], selectedSkillIds: [disabledSkill] },
      { classroomId: classrooms[1], selectedSkillIds: [archivedSkill] },
      { classroomId: classrooms[1], selectedSkillIds: ["arbitrary-client-id"] },
    ];
    for (const mentorSkills of invalidSelections) {
      const rejected = await request("/api/me/proposals/drafts", studentA, { proposal: { title: "Rechazada", mentorSkills } });
      expect(rejected.status).toBe(400);
      expect(rejected.body.error?.code).toBe("INVALID_SKILL_SELECTION");
    }
    const legacyFreeText = await request("/api/me/proposals/drafts", studentA, { proposal: { skills: ["Habilidad inventada"] } });
    expect(legacyFreeText.status).toBe(400);
    expect(await database!.proposal.count({ where: { ownerUserId: studentA } })).toBe(1);

    const updated = await request("/api/me/proposals/" + proposalId + "/draft", studentA, {
      expectedVersion: 1,
      proposal: { mentorSkills: { classroomId: classrooms[1], selectedSkillIds: [] } },
    }, "PUT");
    expect(updated.status).toBe(200);
    expect(updated.body.data.version).toBe(2);
    expect(updated.body.data.proposal.skills).toEqual([]);
    const stale = await request("/api/me/proposals/" + proposalId + "/draft", studentA, {
      expectedVersion: 1,
      proposal: { title: "No debe sobrescribir" },
    }, "PUT");
    expect(stale.status).toBe(409);
    const persisted = await database!.proposal.findUnique({ where: { id: proposalId } });
    expect(persisted?.version).toBe(2);
    expect(persisted?.proposalJson).toMatchObject({ title: "Proyecto de prueba UX-07", skills: [], mentorSkills: { classroomId: classrooms[1], selectedSkillIds: [] } });
    const revisions = await database!.proposalRevision.findMany({ where: { proposalId }, orderBy: { version: "asc" } });
    expect(revisions).toHaveLength(2);

    const ownedDrafts = await request("/api/me/proposals", studentA);
    expect(ownedDrafts.status).toBe(200);
    expect(ownedDrafts.body.data[0]?.proposal.mentorSkills).toEqual({ classroomId: classrooms[1], selectedSkillIds: [] });

    const fullProposal = {
      title: "Propuesta completa UX-07",
      problem: "El grupo necesita organizar tareas.",
      solution: "Una lista permite registrar tareas y responsables.",
      description: "Aplicación para organizar una lista de tareas.",
      purpose: "Facilitar la planificación del grupo.",
      goals: ["Registrar tareas"],
      skills: ["Etiqueta inventada"],
      mentorSkills: { classroomId: classrooms[1], selectedSkillIds: [availableSkillIds[1]] },
      technologies: ["TypeScript"],
      expectedOutcome: "Una lista consultable.",
      tags: [],
      scope: "Una lista de tareas.",
      constraints: [],
    };
    const fullCreated = await request("/api/proposals", studentA, fullProposal);
    expect(fullCreated.status).toBe(201);
    expect(fullCreated.body.data.proposal.skills).toEqual(["Habilidad fixture 002"]);
    const fullId = fullCreated.body.data.id as string;
    const fullUpdated = await request("/api/proposals/" + fullId, studentA, {
      ...fullProposal,
      title: "Propuesta completa actualizada",
      mentorSkills: { classroomId: classrooms[1], selectedSkillIds: [availableSkillIds[2]] },
      expectedVersion: 1,
    }, "PUT");
    expect(fullUpdated.status).toBe(200);
    expect(fullUpdated.body.data.proposal.skills).toEqual(["Habilidad fixture 003"]);

    const teacherProjects = await request("/api/teacher/students/" + studentA + "/projects", teacherA, undefined, "GET", "teacher");
    expect(teacherProjects.status).toBe(200);
    expect(teacherProjects.body.data).toEqual([]);
  });
});
