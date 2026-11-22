import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createAssignmentRepository } from "./repository.js";
import { createPrismaMentorRepository } from "../mentor/prisma-repository.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "../mentor/local-fakes.js";
import { createMentorService } from "../mentor/service.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para probar el recorrido académico PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID();
const teacherId = `academic-flow-teacher-${namespace}`;
const studentId = `academic-flow-student-${namespace}`;
const classroomId = `academic-flow-class-${namespace}`;
const skillId = `academic-flow-skill-${namespace}`;
let database: PrismaClient | undefined;

describePostgres("F18.B mission to Mentor academic flow — PostgreSQL", () => {
  beforeAll(async () => {
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
    await database.teacherSkill.create({ data: { id: skillId, teacherId, name: "Navegación", normalizedName: namespace, createdAt: now, updatedAt: now } });
    await database.classroomSkillAvailability.create({ data: { classroomId, teacherId, skillId, enabled: true, updatedAt: now } });
    await database.classEnrollment.create({ data: { id: `academic-flow-enrollment-${namespace}`, classroomId, studentId, status: "active", source: "teacher_assignment", requestedAt: now } });
  });

  afterAll(async () => {
    if (!database) return;
    await database.proposal.deleteMany({ where: { ownerUserId: studentId } });
    await database.classroomAssignmentVersion.deleteMany({ where: { assignment: { classroomId } } });
    await database.classroomAssignment.deleteMany({ where: { classroomId } });
    await database.classEnrollment.deleteMany({ where: { classroomId } });
    await database.classroomSkillAvailability.deleteMany({ where: { classroomId } });
    await database.classroom.deleteMany({ where: { id: classroomId } });
    await database.teacherSkill.deleteMany({ where: { id: skillId } });
    await database.user.deleteMany({ where: { id: { in: [teacherId, studentId] } } });
    await database.$disconnect();
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
      requiredSkillIds: [], optionalSkillIds: [skillId],
    });
    expect(edit.kind).toBe("ok");
    const second = await assignments.publish(teacherId, classroomId, created.id, 3);
    expect(second.kind).toBe("ok");
    expect((await db.classroomAssignmentVersion.findUniqueOrThrow({ where: { id: missionV1.id } })).snapshotJson).toMatchObject({ title: "Misión v1", requiredSkills: [{ id: skillId }] });

    const recovered = await mentorRepository.getOwnedProposalDraftByUser(saved.id, studentId);
    expect(recovered?.assignmentVersionId).toBe(missionV1.id);
    expect(recovered?.assignmentContext?.mentorContext.config).toMatchObject({
      theme: "Misión v1", requiredSkills: [{ id: skillId, name: "Navegación" }], optionalSkills: [],
    });

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
    expect(evaluatedConfig).toMatchObject({ theme: "Misión v1", requiredSkills: [{ id: skillId }], optionalSkills: [] });
    expect(evaluation.mentorContextVersion).toBe(recovered!.assignmentContext!.mentorContext.version);
    expect(evaluation.analysis.modelId).toBe("fake/local-heuristic-v1");
  });
});
