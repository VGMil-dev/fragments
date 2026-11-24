import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import { AssignmentPublicationSchema, ClassroomAssignmentSchema, MentorEvaluationContextSchema, StudentAssignmentSchema, type AssignmentDraft } from "@fragments/contracts";
import { buildAssignmentMentorConfig } from "./mentor-context.js";

type Db = PrismaClient | Prisma.TransactionClient;

function publicSnapshot(value: Prisma.JsonValue): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const { _classroomSubject: _privateSubject, ...snapshot } = value as Record<string, unknown>;
  return snapshot;
}

export function createAssignmentRepository(database: PrismaClient) {
  async function ownedActiveClassroom(tx: Db, teacherId: string, classroomId: string) {
    return tx.classroom.findFirst({ where: { id: classroomId, teacherId, status: "active" } });
  }
  async function hasEnabledSkills(tx: Db, classroomId: string, skillIds: string[]) {
    const uniqueIds = [...new Set(skillIds)];
    if (!uniqueIds.length || uniqueIds.length !== skillIds.length) return false;
    const rows = await tx.classroomSkillAvailability.findMany({ where: { classroomId, enabled: true, skillId: { in: uniqueIds }, skill: { archived: false } }, select: { skillId: true } });
    return new Set(rows.map((row) => row.skillId)).size === uniqueIds.length;
  }
  async function dto(tx: Db, row: { id: string; classroomId: string; status: string; draftVersion: number; publishedVersion: number | null; draftJson: Prisma.JsonValue; updatedAt: Date }) {
    const versions = await tx.classroomAssignmentVersion.findMany({ where: { assignmentId: row.id }, orderBy: { version: "asc" } });
    return ClassroomAssignmentSchema.parse({ id: row.id, classroomId: row.classroomId, status: row.status, draftVersion: row.draftVersion,
      publishedVersion: row.publishedVersion, draft: row.draftJson, versions: versions.map((v) => ({ ...publicSnapshot(v.snapshotJson), id: v.id,
        version: v.version, assignmentId: row.id, status: "published", mentorContextVersion: v.mentorContextVersion, createdAt: v.createdAt.toISOString() })), updatedAt: row.updatedAt.toISOString() });
  }
  return {
    async list(teacherId: string, classroomId: string) {
      if (!await ownedActiveClassroom(database, teacherId, classroomId)) return null;
      const rows = await database.classroomAssignment.findMany({ where: { classroomId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }] });
      return Promise.all(rows.map((row) => dto(database, row)));
    },
    async create(teacherId: string, classroomId: string, draft: AssignmentDraft) {
      if (!await ownedActiveClassroom(database, teacherId, classroomId)) return null;
      if (!await hasEnabledSkills(database, classroomId, [...draft.requiredSkillIds, ...draft.optionalSkillIds])) return { kind: "invalid_skills" as const };
      const now = new Date();
      const row = await database.classroomAssignment.create({ data: { id: randomUUID(), classroomId, status: "draft", draftVersion: 1, draftJson: draft as Prisma.InputJsonValue, createdAt: now, updatedAt: now } });
      return dto(database, row);
    },
    async updateDraft(teacherId: string, classroomId: string, assignmentId: string, expectedVersion: number, draft: AssignmentDraft) {
      return database.$transaction(async (tx) => {
        if (!await ownedActiveClassroom(tx, teacherId, classroomId)) return { kind: "not_found" as const };
        const row = await tx.classroomAssignment.findFirst({ where: { id: assignmentId, classroomId } });
        if (!row) return { kind: "not_found" as const };
        if (row.draftVersion !== expectedVersion || row.status === "archived") return { kind: "conflict" as const };
        if (!await hasEnabledSkills(tx, classroomId, [...draft.requiredSkillIds, ...draft.optionalSkillIds])) return { kind: "invalid_skills" as const };
        const changed = await tx.classroomAssignment.updateMany({ where: { id: row.id, classroomId, draftVersion: expectedVersion, status: { not: "archived" } }, data: { draftJson: draft as Prisma.InputJsonValue, draftVersion: { increment: 1 }, updatedAt: new Date() } });
        if (changed.count !== 1) return { kind: "conflict" as const };
        const updated = await tx.classroomAssignment.findUniqueOrThrow({ where: { id: row.id } });
        return { kind: "ok" as const, assignment: await dto(tx, updated) };
      });
    },
    async publish(teacherId: string, classroomId: string, assignmentId: string, expectedVersion: number) {
      return database.$transaction(async (tx) => {
        const classroom = await ownedActiveClassroom(tx, teacherId, classroomId);
        if (!classroom) return { kind: "not_found" as const };
        const row = await tx.classroomAssignment.findFirst({ where: { id: assignmentId, classroomId } });
        if (!row) return { kind: "not_found" as const };
        if (row.draftVersion !== expectedVersion || row.status === "archived") return { kind: "conflict" as const };
        const parsedDraft = AssignmentPublicationSchema.safeParse(row.draftJson);
        if (!parsedDraft.success) return { kind: "incomplete_assignment" as const };
        const draft = parsedDraft.data;
        const availability = await tx.classroomSkillAvailability.findMany({ where: { classroomId, enabled: true, skillId: { in: [...draft.requiredSkillIds, ...draft.optionalSkillIds] }, skill: { archived: false } }, include: { skill: true } });
        const skills = new Map(availability.map(({ skill }) => [skill.id, { id: skill.id, name: skill.name, description: skill.description }]));
        if ([...draft.requiredSkillIds, ...draft.optionalSkillIds].some((id) => !skills.has(id))) return { kind: "invalid_skills" as const };
        const context = await tx.mentorControlVersion.findFirst({ orderBy: { version: "desc" }, select: { version: true } });
        const version = (row.publishedVersion ?? 0) + 1, now = new Date(), versionId = randomUUID();
        const snapshot = { title: draft.title, instructions: draft.instructions, objectives: draft.objectives,
          missionRubric: draft.missionRubric, deliverables: draft.deliverables,
          _classroomSubject: classroom.subject,
          requiredSkills: draft.requiredSkillIds.map((id) => skills.get(id)!), optionalSkills: draft.optionalSkillIds.map((id) => skills.get(id)!) };
        const claimed = await tx.classroomAssignment.updateMany({ where: { id: assignmentId, classroomId, draftVersion: expectedVersion, publishedVersion: row.publishedVersion, status: { not: "archived" } }, data: { status: "published", publishedVersion: version, draftVersion: { increment: 1 }, updatedAt: now } });
        if (claimed.count !== 1) return { kind: "conflict" as const };
        await tx.classroomAssignmentVersion.create({ data: { id: versionId, assignmentId, version, snapshotJson: snapshot as Prisma.InputJsonValue, mentorContextVersion: context?.version ?? 1, createdAt: now } });
        return { kind: "ok" as const, assignment: await dto(tx, await tx.classroomAssignment.findUniqueOrThrow({ where: { id: assignmentId } })) };
      });
    },
    async listStudent(studentId: string, classroomId: string) {
      const enrollment = await database.classEnrollment.findFirst({ where: { studentId, classroomId, status: "active", classroom: { status: "active" } }, select: { classroom: { select: { id: true, title: true, subject: true } } } });
      if (!enrollment) return null;
      const rows = await database.classroomAssignment.findMany({ where: { classroomId, status: "published", publishedVersion: { not: null } }, include: { versions: true } });
      const output = [];
      for (const row of rows) {
        const version = row.versions.find((entry) => entry.version === row.publishedVersion); if (!version) continue;
        const control = await database.mentorControlVersion.findUnique({ where: { version: version.mentorContextVersion } });
        if (!control) continue;
        const context = MentorEvaluationContextSchema.parse({ version: control.version, publishedAt: control.publishedAt.toISOString(), config: {
          ...buildAssignmentMentorConfig(control.configJson, version.snapshotJson, enrollment.classroom.subject),
        } });
        output.push(StudentAssignmentSchema.parse({ ...publicSnapshot(version.snapshotJson), id: version.id, assignmentId: row.id, version: version.version,
          classroomId, classroomTitle: enrollment.classroom.title, subject: enrollment.classroom.subject, status: "published",
          mentorContextVersion: version.mentorContextVersion, mentorContext: context, createdAt: version.createdAt.toISOString() }));
      }
      return output;
    },
  };
}
