import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import {
  ClassroomSchema, ClassroomSummarySchema, ClassEnrollmentSchema, ClassJoinCodeSchema, TeacherDashboardSummarySchema,
  ClassroomSkillsResponseSchema, SkillCatalogEntrySchema,
} from "@fragments/contracts";

type ClassroomInput = { title: string; subject: string; groupLabel?: string | null | undefined; period?: string | null | undefined; context?: string | null | undefined };
type ClassroomUpdateInput = { title?: string | undefined; subject?: string | undefined; groupLabel?: string | null | undefined; period?: string | null | undefined; context?: string | null | undefined; status?: "active" | "archived" | undefined };
type EnrollmentDto = { id: string; status: "pending" | "active" | "rejected" | "removed"; source: "join_code" | "teacher_assignment"; requestedAt: string; decidedAt: string | null };
type EnrollmentStatus = EnrollmentDto["status"];
type EnrollmentSource = EnrollmentDto["source"];
type JoinEnrollmentResult = { kind: "ok"; enrollment: EnrollmentDto } | { kind: "invalid_code" } | { kind: "rate_limited" } | { kind: "conflict" };
type DirectEnrollmentResult = { kind: "ok"; enrollment: EnrollmentDto } | { kind: "not_found" } | { kind: "conflict" } | { kind: "invalid_student" };
type Db = PrismaClient | Prisma.TransactionClient;

function normalizedName(value: string): string { return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es"); }
function classroomIdentity(input: Pick<ClassroomInput, "subject" | "period">) { return JSON.stringify([input.subject, input.period ?? ""].map(normalizedName)); }
function hasLegacyGroupIdentity(identityKey: string): boolean {
  try { const value: unknown = JSON.parse(identityKey); return Array.isArray(value) && value.length === 3; }
  catch { return false; }
}
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function toClassroom(row: { id: string; title: string; subject: string; groupLabel: string | null; period: string | null; context: string | null; status: string; createdAt: Date; updatedAt: Date }) {
  return ClassroomSchema.parse({ id: row.id, title: row.title, subject: row.subject, groupLabel: row.groupLabel, period: row.period,
    context: row.context, status: row.status, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
}
function toClassroomSummary(row: Parameters<typeof toClassroom>[0]) {
  const { context: _privateContext, ...summary } = toClassroom(row);
  return ClassroomSummarySchema.parse(summary);
}
function enrollmentDto(row: { id: string; status: string; source: string; requestedAt: Date; decidedAt: Date | null }): EnrollmentDto {
  return { id: row.id, status: row.status as EnrollmentStatus, source: row.source as EnrollmentSource,
    requestedAt: row.requestedAt.toISOString(), decidedAt: row.decidedAt?.toISOString() ?? null };
}
async function audit(tx: Db, enrollmentId: string, previousStatus: string | null, nextStatus: string, source: string, actorUserId: string | null, createdAt: Date) {
  await tx.classEnrollmentEvent.create({ data: { enrollmentId, previousStatus, nextStatus, source, actorUserId, createdAt } });
}

export function createClassroomRepository(database: PrismaClient, clock: () => Date = () => new Date()) {
  const now = () => clock();
  async function ownedClassroom(teacherId: string, classroomId: string) {
    return database.classroom.findFirst({ where: { id: classroomId, teacherId } });
  }
  async function transition(teacherId: string, classroomId: string, enrollmentId: string, from: string, to: string, source: string) {
    const timestamp = now();
    return database.$transaction(async (tx) => {
      const row = await tx.classEnrollment.findFirst({ where: { id: enrollmentId, classroomId, classroom: { teacherId } }, include: { classroom: { select: { status: true } } } });
      if (!row) return "not_found" as const;
      if (row.status !== from || (to === "active" && row.classroom.status !== "active")) return "conflict" as const;
      const updated = await tx.classEnrollment.updateMany({ where: { id: enrollmentId, status: from }, data: { status: to, decidedAt: timestamp, decidedBy: teacherId } });
      if (updated.count !== 1) return "conflict" as const;
      await audit(tx, enrollmentId, from, to, source, teacherId, timestamp);
      return "ok" as const;
    });
  }

  return {
    async createClassroom(teacherId: string, input: ClassroomInput) {
      const timestamp = now();
      const row = await database.classroom.create({ data: { id: randomUUID(), teacherId, title: input.title, subject: input.subject,
        // New classrooms represent a theme, not a school section. Legacy request fields are accepted but ignored.
        groupLabel: null, identityKey: classroomIdentity(input), period: input.period ?? null, context: input.context ?? null,
        status: "active", createdAt: timestamp, updatedAt: timestamp } });
      return toClassroom(row);
    },
    async getDashboardSummary(teacherId: string) {
      const [totalClassrooms, pendingJoinRequests, rows] = await Promise.all([
        database.classroom.count({ where: { teacherId } }),
        database.classEnrollment.count({ where: { status: "pending", source: "join_code", classroom: { teacherId, status: "active" } } }),
        database.classroom.findMany({ where: { teacherId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: 4 }),
      ]);
      return TeacherDashboardSummarySchema.parse({
        totalClassrooms,
        pendingJoinRequests,
        classrooms: rows.map(toClassroomSummary),
      });
    },
    async listClassrooms(teacherId: string, offset: number, limit: number) {
      const rows = await database.classroom.findMany({ where: { teacherId }, orderBy: [{ updatedAt: "desc" }, { id: "asc" }], take: limit + 1, skip: offset });
      return { items: rows.slice(0, limit).map(toClassroomSummary), nextOffset: rows.length > limit ? offset + limit : null };
    },
    async getClassroom(teacherId: string, classroomId: string) {
      const row = await ownedClassroom(teacherId, classroomId);
      return row ? toClassroom(row) : null;
    },
    async updateClassroom(teacherId: string, classroomId: string, input: ClassroomUpdateInput) {
      const row = await ownedClassroom(teacherId, classroomId);
      if (!row) return null;
      const next = { title: input.title ?? row.title, subject: input.subject ?? row.subject, groupLabel: input.groupLabel === undefined ? row.groupLabel : input.groupLabel,
        period: input.period === undefined ? row.period : input.period, context: input.context === undefined ? row.context : input.context,
        status: input.status ?? row.status };
      const nextIdentityKey = hasLegacyGroupIdentity(row.identityKey)
        ? input.groupLabel === null ? classroomIdentity(next) : row.identityKey
        : classroomIdentity(next);
      const timestamp = now();
      await database.$transaction(async (tx) => {
        await tx.classroom.update({ where: { id: classroomId }, data: { ...next, identityKey: nextIdentityKey, updatedAt: timestamp } });
        if (row.status === "active" && next.status === "archived") {
          await tx.classJoinCode.updateMany({ where: { classroomId, revokedAt: null }, data: { revokedAt: timestamp, revokedBy: teacherId } });
        }
      });
      return this.getClassroom(teacherId, classroomId);
    },
    async createJoinCode(teacherId: string, classroomId: string, expiresInDays: number | null | undefined) {
      const classroom = await ownedClassroom(teacherId, classroomId);
      if (!classroom || classroom.status !== "active") return null;
      const timestamp = now(); const raw = randomBytes(32).toString("base64url");
      const expiresAt = expiresInDays ? new Date(clock().getTime() + expiresInDays * 86_400_000) : null;
      await database.$transaction(async (tx) => {
        await tx.classJoinCode.updateMany({ where: { classroomId, revokedAt: null }, data: { revokedAt: timestamp, revokedBy: teacherId } });
        await tx.classJoinCode.create({ data: { id: randomUUID(), classroomId, codeHash: hashCode(raw), expiresAt, createdAt: timestamp, createdBy: teacherId } });
      });
      return ClassJoinCodeSchema.parse({ code: raw, expiresAt: expiresAt?.toISOString() ?? null, createdAt: timestamp.toISOString() });
    },
    async revokeJoinCode(teacherId: string, classroomId: string) {
      const result = await database.classJoinCode.updateMany({ where: { classroomId, revokedAt: null, classroom: { teacherId } }, data: { revokedAt: now(), revokedBy: teacherId } });
      return result.count > 0;
    },
    async requestByCode(studentId: string, code: string): Promise<JoinEnrollmentResult> {
      const timestamp = now(); const windowStart = new Date(timestamp.getTime() - 15 * 60_000);
      return database.$transaction(async (tx) => {
        await tx.classJoinAttempt.createMany({ data: [{ studentId, windowStartedAt: timestamp, attemptCount: 0 }], skipDuplicates: true });
        const [attempt] = await tx.$queryRaw<Array<{ window_started_at: Date; attempt_count: number }>>`
          SELECT window_started_at, attempt_count FROM class_join_attempts WHERE student_id = ${studentId} FOR UPDATE
        `;
        if (!attempt) throw new Error("No se pudo reservar el intento de ingreso al aula.");
        const count = attempt.window_started_at > windowStart ? attempt.attempt_count : 0;
        if (count >= 10) return { kind: "rate_limited" };
        await tx.classJoinAttempt.update({ where: { studentId }, data: {
          windowStartedAt: count === 0 ? timestamp : attempt.window_started_at, attemptCount: count + 1,
        } });
        const match = await tx.classJoinCode.findFirst({ where: { codeHash: hashCode(code), revokedAt: null }, include: { classroom: { select: { status: true } } } });
        if (!match || match.classroom.status !== "active" || (match.expiresAt && match.expiresAt <= timestamp)) return { kind: "invalid_code" };
        const existing = await tx.classEnrollment.findUnique({ where: { classroomId_studentId: { classroomId: match.classroomId, studentId } } });
        if (existing) {
          if (existing.status === "pending" || existing.status === "active") return { kind: "ok", enrollment: enrollmentDto(existing) };
          return { kind: "conflict" };
        }
        const created = await tx.classEnrollment.create({ data: { id: randomUUID(), classroomId: match.classroomId, studentId, status: "pending", source: "join_code", requestedAt: timestamp } });
        await audit(tx, created.id, null, "pending", "join_code", studentId, timestamp);
        return { kind: "ok", enrollment: enrollmentDto(created) };
      });
    },
    async directAssign(teacherId: string, classroomId: string, studentId: string): Promise<DirectEnrollmentResult> {
      const timestamp = now();
      return database.$transaction(async (tx) => {
        const classroom = await tx.classroom.findFirst({ where: { id: classroomId, teacherId, status: "active" } });
        if (!classroom) return { kind: "not_found" };
        const student = await tx.user.findFirst({ where: { id: studentId, isTeacher: false, accounts: { some: { providerId: "github" } },
          OR: [{ role: null }, { role: { not: { contains: "admin" } } }] }, select: { id: true } });
        if (!student) return { kind: "invalid_student" };
        const existing = await tx.classEnrollment.findUnique({ where: { classroomId_studentId: { classroomId, studentId } } });
        if (existing) {
          if (existing.status === "active") return { kind: "ok", enrollment: enrollmentDto(existing) };
          if (existing.status !== "pending") return { kind: "conflict" };
          const updated = await tx.classEnrollment.update({ where: { id: existing.id }, data: { status: "active", source: "teacher_assignment", decidedAt: timestamp, decidedBy: teacherId } });
          await audit(tx, existing.id, "pending", "active", "teacher_assignment", teacherId, timestamp);
          return { kind: "ok", enrollment: enrollmentDto(updated) };
        }
        const created = await tx.classEnrollment.create({ data: { id: randomUUID(), classroomId, studentId, status: "active", source: "teacher_assignment", requestedAt: timestamp, decidedAt: timestamp, decidedBy: teacherId } });
        await audit(tx, created.id, null, "active", "teacher_assignment", teacherId, timestamp);
        return { kind: "ok", enrollment: enrollmentDto(created) };
      });
    },
    transitionEnrollment: transition,
    async listEnrollments(teacherId: string, classroomId: string) {
      if (!await ownedClassroom(teacherId, classroomId)) return null;
      const rows = await database.classEnrollment.findMany({ where: { classroomId }, include: { student: { select: { githubLogin: true } } },
        orderBy: [{ status: "asc" }, { requestedAt: "desc" }] });
      rows.sort((a, b) => (a.status === "pending" ? 0 : 1) - (b.status === "pending" ? 0 : 1));
      return rows.map((row) => ClassEnrollmentSchema.parse({ ...enrollmentDto(row), studentId: row.studentId, githubLogin: row.student.githubLogin }));
    },
    async listStudentClassrooms(studentId: string) {
      const rows = await database.classroom.findMany({ where: { status: "active", enrollments: { some: { studentId, status: "active" } } },
        include: { enrollments: { where: { studentId, status: "active" }, select: { decidedAt: true } } } });
      rows.sort((a, b) => (b.enrollments[0]?.decidedAt?.getTime() ?? 0) - (a.enrollments[0]?.decidedAt?.getTime() ?? 0) || a.title.localeCompare(b.title));
      return rows.map(toClassroomSummary);
    },
    async listStudentSkills(studentId: string, classroomId: string) {
      const member = await database.classEnrollment.findFirst({ where: { studentId, classroomId, status: "active", classroom: { status: "active" } }, select: { id: true } });
      if (!member) return null;
      const rows = await database.classroomSkillAvailability.findMany({ where: { classroomId, enabled: true, skill: { archived: false } }, include: { skill: true }, orderBy: { skill: { name: "asc" } } });
      return rows.map(({ skill }) => SkillCatalogEntrySchema.parse({ id: skill.id, name: skill.name, description: skill.description, archived: false, createdAt: skill.createdAt.toISOString(), updatedAt: skill.updatedAt.toISOString() }));
    },
    async listStudentRequests(studentId: string) {
      const rows = await database.classEnrollment.findMany({ where: { studentId }, orderBy: { requestedAt: "desc" }, take: 200 });
      return rows.map(enrollmentDto);
    },
    async createSkill(teacherId: string, name: string, description?: string | null) {
      const timestamp = now(); const trimmedName = name.trim();
      const row = await database.teacherSkill.create({ data: { id: randomUUID(), teacherId, name: trimmedName, normalizedName: normalizedName(trimmedName),
        description: description?.trim() || null, archived: false, createdAt: timestamp, updatedAt: timestamp } });
      return SkillCatalogEntrySchema.parse({ id: row.id, name: row.name, description: row.description, archived: row.archived, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() });
    },
    async listSkills(teacherId: string) {
      const rows = await database.teacherSkill.findMany({ where: { teacherId }, orderBy: [{ archived: "asc" }, { name: "asc" }] });
      return rows.map((row) => SkillCatalogEntrySchema.parse({ id: row.id, name: row.name, description: row.description, archived: row.archived, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() }));
    },
    async updateSkill(teacherId: string, skillId: string, input: { name?: string | undefined; description?: string | null | undefined; archived?: boolean | undefined }) {
      const row = await database.teacherSkill.findFirst({ where: { id: skillId, teacherId } });
      if (!row) return null;
      const name = input.name?.trim() ?? row.name; const description = input.description === undefined ? row.description : input.description?.trim() || null;
      const updated = await database.teacherSkill.update({ where: { id: skillId }, data: { name, normalizedName: normalizedName(name), description, archived: input.archived ?? row.archived, updatedAt: now() } });
      return SkillCatalogEntrySchema.parse({ id: updated.id, name: updated.name, description: updated.description, archived: updated.archived, createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
    },
    async listClassroomSkills(teacherId: string, classroomId: string) {
      if (!await ownedClassroom(teacherId, classroomId)) return null;
      const rows = await database.teacherSkill.findMany({ where: { teacherId }, include: { availability: { where: { classroomId } } }, orderBy: [{ archived: "asc" }, { name: "asc" }] });
      return ClassroomSkillsResponseSchema.parse(rows.map((row) => ({ id: row.id, name: row.name, description: row.description, archived: row.archived,
        createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(), enabled: row.availability[0]?.enabled ?? false })));
    },
    async setClassroomSkill(teacherId: string, classroomId: string, skillId: string, enabled: boolean) {
      const [classroom, skill] = await Promise.all([ownedClassroom(teacherId, classroomId), database.teacherSkill.findFirst({ where: { id: skillId, teacherId } })]);
      if (!classroom || !skill) return { kind: "not_found" } as const;
      if (enabled && skill.archived) return { kind: "archived" } as const;
      const timestamp = now();
      await database.classroomSkillAvailability.upsert({ where: { classroomId_skillId: { classroomId, skillId } },
        create: { classroomId, skillId, teacherId, enabled, updatedAt: timestamp }, update: { enabled, updatedAt: timestamp } });
      return { kind: "ok", availability: { classroomId, skillId, enabled, updatedAt: timestamp.toISOString() } } as const;
    },
  };
}
