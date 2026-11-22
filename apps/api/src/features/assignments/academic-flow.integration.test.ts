import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createAssignmentRepository } from "./repository.js";
import { createPrismaMentorRepository } from "../mentor/prisma-repository.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "../mentor/local-fakes.js";
import { createMentorService } from "../mentor/service.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createHttpHandler } from "../../http/app.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para probar el recorrido académico PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID();
const teacherId = `academic-flow-teacher-${namespace}`;
const studentId = `academic-flow-student-${namespace}`;
const classroomId = `academic-flow-class-${namespace}`;
const skillId = `academic-flow-skill-${namespace}`;
const optionalSkillId = `academic-flow-optional-skill-${namespace}`;
let database: PrismaClient | undefined;

describePostgres("F18.B mission to Mentor academic flow — PostgreSQL", () => {
  beforeAll(async () => {
    const configuredDatabase = new URL(databaseUrl!);
    if (configuredDatabase.pathname !== "/fragments_test" || !["localhost", "127.0.0.1", "::1"].includes(configuredDatabase.hostname)) {
      throw new Error("La prueba académica solo admite una URL local dirigida a fragments_test.");
    }
    const candidate = openDatabase(databaseUrl!);
    await candidate.$connect();
    const [{ name }] = await candidate.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (name !== "fragments_test") {
      await candidate.$disconnect();
      throw new Error("El recorrido académico solo puede ejecutarse en fragments_test.");
    }
    database = candidate;

    await database.user.createMany({ data: [
      { id: teacherId, name: "Fixture docente", email: `${teacherId}@example.test`, emailVerified: true, isTeacher: true },
      { id: studentId, name: "Fixture estudiante", email: `${studentId}@example.test`, emailVerified: true, githubLogin: studentId },
    ] });
    const now = new Date();
    await database.classroom.create({ data: { id: classroomId, teacherId, title: "Aula fixture", subject: "Programación móvil", identityKey: namespace, status: "active", createdAt: now, updatedAt: now } });
    await database.teacherSkill.createMany({ data: [
      { id: skillId, teacherId, name: "Navegación", normalizedName: namespace, createdAt: now, updatedAt: now },
      { id: optionalSkillId, teacherId, name: "Accesibilidad", normalizedName: `${namespace}-optional`, createdAt: now, updatedAt: now },
    ] });
    await database.classroomSkillAvailability.createMany({ data: [
      { classroomId, teacherId, skillId, enabled: true, updatedAt: now },
      { classroomId, teacherId, skillId: optionalSkillId, enabled: true, updatedAt: now },
    ] });
    await database.classEnrollment.create({ data: { id: `academic-flow-enrollment-${namespace}`, classroomId, studentId, status: "active", source: "teacher_assignment", requestedAt: now } });
  });

  afterAll(async () => {
    if (!database) return;
    try {
      await database.proposal.deleteMany({ where: { ownerUserId: studentId } });
      await database.classroomAssignmentVersion.deleteMany({ where: { assignment: { classroomId } } });
      await database.classroomAssignment.deleteMany({ where: { classroomId } });
      await database.classEnrollment.deleteMany({ where: { classroomId } });
      await database.classroomSkillAvailability.deleteMany({ where: { classroomId } });
      await database.classroom.deleteMany({ where: { id: classroomId } });
      await database.teacherSkill.deleteMany({ where: { id: { in: [skillId, optionalSkillId] } } });
      await database.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
    } finally {
      await database.$disconnect();
      database = undefined;
    }
  });

  it("runs authenticated mission, student draft, and Mentor evaluation through HTTP with the pinned version", async () => {
    const db = database!;
    const localEvaluator = createLocalMentorEvaluator();
    let evaluatedConfig: unknown;
    const mentor = createMentorService({
      evaluator: { async evaluate(input) { evaluatedConfig = input.config; return localEvaluator.evaluate(input); } },
      pdf: createMinimalPdfRenderer(),
    });
    const auth = {
      async userId(request: { headers: Record<string, string | undefined> }) {
        const id = request.headers["x-fixture-user"];
        return id && request.headers["x-fixture-role"] === "teacher" ? id : null;
      },
      async teacherId(request: { headers: Record<string, string | undefined> }) {
        const id = request.headers["x-fixture-user"];
        return id && request.headers["x-fixture-role"] === "teacher" ? id : null;
      },
      async student(request: { headers: Record<string, string | undefined> }) {
        const id = request.headers["x-fixture-user"];
        if (!id || request.headers["x-fixture-role"] !== "student") return null;
        return { id, githubAccountId: `fixture-github-${id}`, githubLogin: id, avatarUrl: null, registeredAt: new Date().toISOString() };
      },
      githubOAuthConfigured: true,
    } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(db, { auth, mentor }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected local HTTP address");
    const base = `http://127.0.0.1:${address.port}`;
    const request = async (path: string, role: "teacher" | "student" | "anonymous", method = "GET", body?: unknown, user = role === "teacher" ? teacherId : studentId) => {
      const response = await fetch(`${base}${path}`, { method, headers: { ...(role === "anonymous" ? {} : { "x-fixture-user": user, "x-fixture-role": role }), ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() as { data?: any; error?: { code: string } } };
    };
    try {
      const basePath = `/api/teacher/classrooms/${classroomId}/assignments`;
      expect((await request(basePath, "anonymous", "POST", {})).status).toBe(401);
      expect((await request(basePath, "teacher", "GET", undefined, "fixture-other-teacher")).status).toBe(404);
      const created = await request(basePath, "teacher", "POST", {
        title: "Misión HTTP v1", instructions: "Construye una navegación clara.", objectives: ["Conectar dos vistas"],
        requiredSkillIds: [skillId], optionalSkillIds: [],
      });
      expect(created.status).toBe(201);
      const published = await request(`${basePath}/${created.body.data!.id}/publish`, "teacher", "POST", { expectedVersion: 1 });
      expect(published.status).toBe(200);
      const version = published.body.data!.versions.find((item: { version: number }) => item.version === 1);
      expect(version).toMatchObject({ assignmentId: created.body.data!.id, status: "published", requiredSkills: [{ id: skillId, name: "Navegación" }] });

      const noEnrollment = await request(`/api/me/classrooms/${classroomId}/assignments`, "student", "GET", undefined, "fixture-student-without-enrollment");
      expect(noEnrollment.status).toBe(404);
      const visible = await request(`/api/me/classrooms/${classroomId}/assignments`, "student");
      expect(visible.status).toBe(200);
      expect(visible.body.data).toMatchObject([{ assignmentId: created.body.data!.id, id: version.id, title: "Misión HTTP v1" }]);

      const proposal = {
        title: "Propuesta desde la misión", problem: "El equipo necesita navegar entre pantallas.",
        solution: "Una barra conecta las pantallas.", description: "Implementar una navegación móvil sencilla.",
        purpose: "Aplicar navegación en un proyecto real.", goals: ["Conectar dos pantallas"], skills: [],
        mentorSkills: { classroomId, selectedSkillIds: [] }, scope: "Dos pantallas conectadas.", constraints: [],
      };
      const deniedDraft = await request("/api/me/proposals/drafts", "student", "POST", { proposal, assignmentVersionId: version.id }, "fixture-student-without-enrollment");
      expect(deniedDraft).toMatchObject({ status: 404, body: { error: { code: "ASSIGNMENT_UNAVAILABLE" } } });
      const createdDraft = await request("/api/me/proposals/drafts", "student", "POST", { proposal, assignmentVersionId: version.id });
      expect(createdDraft.status).toBe(201);
      expect(createdDraft.body.data).toMatchObject({ assignmentVersionId: version.id, assignmentContext: { assignmentVersionId: version.id, mentorContext: { config: { theme: "Misión HTTP v1", requirements: expect.arrayContaining(["Habilidad requerida: Navegación"]) } } } });

      const edit = await request(`${basePath}/${created.body.data!.id}/draft`, "teacher", "PATCH", {
        title: "Misión HTTP v2", instructions: "Conecta vistas y conserva el estado.", objectives: ["Conectar vistas", "Conservar el estado"],
        requiredSkillIds: [skillId], optionalSkillIds: [optionalSkillId], expectedVersion: 2,
      });
      expect(edit.status).toBe(200);
      expect((await request(`${basePath}/${created.body.data!.id}/publish`, "teacher", "POST", { expectedVersion: 3 })).status).toBe(200);
      const owned = await request("/api/me/proposals", "student");
      expect(owned.status).toBe(200);
      expect(owned.body.data).toMatchObject([{ id: createdDraft.body.data!.id, assignmentVersionId: version.id, assignmentContext: { mentorContext: { config: { theme: "Misión HTTP v1" } } } }]);

      const evaluation = await request(`/api/proposals/${createdDraft.body.data!.id}/review`, "student", "POST");
      expect(evaluation.status).toBe(200);
      expect(evaluatedConfig).toMatchObject({ theme: "Misión HTTP v1", requirements: expect.arrayContaining(["Habilidad requerida: Navegación"]) });
      expect((evaluatedConfig as { requirements: string[] }).requirements).not.toContain("Habilidad optativa: Accesibilidad");
      expect(evaluation.body.data).toMatchObject({ mentorContextVersion: expect.any(Number), proposalId: createdDraft.body.data!.id });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  it("keeps the mission version and academic context fixed through draft recovery and fake Mentor evaluation", async () => {
    const db = database!;
    const assignments = createAssignmentRepository(db);
    const mentorRepository = createPrismaMentorRepository(db);
    const created = await assignments.create(teacherId, classroomId, {
      title: "Misión v1", instructions: "Diseña una pantalla de navegación verificable.", objectives: ["Demostrar navegación"],
      requiredSkillIds: [skillId], optionalSkillIds: [],
    });
    expect(created).toMatchObject({ draftVersion: 1 });
    if (!created || "kind" in created) throw new Error("No se creó la misión fixture.");
    const first = await assignments.publish(teacherId, classroomId, created.id, 1);
    expect(first.kind).toBe("ok");
    if (first.kind !== "ok") throw new Error("No se publicó la versión fixture.");
    const missionV1 = first.assignment.versions.find((version) => version.version === 1)!;
    expect(missionV1).toMatchObject({ title: "Misión v1", requiredSkills: [{ id: skillId, name: "Navegación" }] });

    const visible = await assignments.listStudent(studentId, classroomId);
    expect(visible?.map((mission) => mission.id)).toContain(missionV1.id);
    const proposalDraft = {
      title: "Propuesta desde misión v1", problem: "El grupo necesita una navegación clara para organizar sus pantallas.",
      solution: "Una barra sencilla separa las vistas y mantiene visible la sección actual.",
      description: "Implementar una navegación mínima para una aplicación móvil.", purpose: "Practicar navegación de pantallas.",
      goals: ["Construir y demostrar dos pantallas"], skills: [], scope: "Dos pantallas conectadas por una navegación simple.", constraints: [],
    };
    const saved = await mentorRepository.createProposalDraftByUser(proposalDraft, studentId, missionV1.id);

    const edit = await assignments.updateDraft(teacherId, classroomId, created.id, 2, {
      title: "Misión v2", instructions: "Diseña una navegación con estado verificable.", objectives: ["Demostrar navegación y estado"],
      requiredSkillIds: [skillId], optionalSkillIds: [optionalSkillId],
    });
    expect(edit.kind).toBe("ok");
    const second = await assignments.publish(teacherId, classroomId, created.id, 3);
    expect(second.kind).toBe("ok");
    if (second.kind !== "ok") throw new Error("No se publicó la versión fixture v2.");
    expect(second.assignment.versions.find((version) => version.version === 2)).toMatchObject({
      requiredSkills: [{ id: skillId, name: "Navegación" }], optionalSkills: [{ id: optionalSkillId, name: "Accesibilidad" }],
    });
    expect((await db.classroomAssignmentVersion.findUniqueOrThrow({ where: { id: missionV1.id } })).snapshotJson).toMatchObject({ title: "Misión v1", requiredSkills: [{ id: skillId }] });

    const recovered = await mentorRepository.getOwnedProposalDraftByUser(saved.id, studentId);
    expect(recovered?.assignmentVersionId).toBe(missionV1.id);
    expect(recovered?.assignmentContext?.mentorContext.config).toMatchObject({
      theme: "Misión v1", requirements: expect.arrayContaining(["Habilidad requerida: Navegación"]),
    });
    expect(recovered?.assignmentContext?.mentorContext.config.requirements).not.toContain("Habilidad optativa: Accesibilidad");

    const fake = createLocalMentorEvaluator();
    let evaluatedConfig: unknown;
    const service = createMentorService({
      evaluator: { async evaluate(input) { evaluatedConfig = input.config; return fake.evaluate(input); } },
      pdf: createMinimalPdfRenderer(),
    });
    const evaluation = await service.evaluate(recovered!.proposal, [], {
      config: recovered!.assignmentContext!.mentorContext.config,
      version: recovered!.assignmentContext!.mentorContext.version,
    });
    expect(evaluatedConfig).toMatchObject({ theme: "Misión v1", requirements: expect.arrayContaining(["Habilidad requerida: Navegación"]) });
    expect((evaluatedConfig as { requirements: string[] }).requirements).not.toContain("Habilidad optativa: Accesibilidad");
    expect(evaluation.mentorContextVersion).toBe(recovered!.assignmentContext!.mentorContext.version);
    expect(evaluation.analysis.modelId).toBe("fake/local-heuristic-v1");
  });
});
