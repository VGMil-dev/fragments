import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  ClassroomSchema, ClassroomSummarySchema, ClassEnrollmentSchema, ClassJoinCodeSchema,
  ClassroomSkillsResponseSchema, SkillCatalogEntrySchema,
} from "@fragments/contracts";

type ClassroomInput = { title: string; subject: string; groupLabel: string; period?: string | null | undefined; context?: string | null | undefined };
type ClassroomUpdateInput = { title?: string | undefined; subject?: string | undefined; groupLabel?: string | undefined; period?: string | null | undefined; context?: string | null | undefined; status?: "active" | "archived" | undefined };
type EnrollmentDto = { id: string; status: "pending" | "active" | "rejected" | "removed"; source: "join_code" | "teacher_assignment"; requestedAt: string; decidedAt: string | null };
type EnrollmentStatus = EnrollmentDto["status"];
type EnrollmentSource = EnrollmentDto["source"];
type JoinEnrollmentResult = { kind: "ok"; enrollment: EnrollmentDto } | { kind: "invalid_code" } | { kind: "rate_limited" } | { kind: "conflict" };
type DirectEnrollmentResult = { kind: "ok"; enrollment: EnrollmentDto } | { kind: "not_found" } | { kind: "conflict" } | { kind: "invalid_student" };
type ClassroomRow = { id: string; teacher_id: string; title: string; subject: string; group_label: string; period: string | null; context: string | null; status: "active" | "archived"; created_at: string; updated_at: string };
type EnrollmentRow = { id: string; student_id: string; githubLogin: string | null; status: "pending" | "active" | "rejected" | "removed"; source: "join_code" | "teacher_assignment"; requested_at: string; decided_at: string | null };
type SkillRow = { id: string; name: string; description: string | null; archived: number; created_at: string; updated_at: string };

function normalizedName(value: string): string { return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("es"); }
function classroomIdentity(input: ClassroomInput) { return JSON.stringify([input.subject, input.groupLabel, input.period ?? ""].map(normalizedName)); }
function hashCode(code: string): string { return createHash("sha256").update(code).digest("hex"); }
function transaction<T>(database: DatabaseSync, run: () => T): T {
  database.exec("BEGIN IMMEDIATE");
  try { const result = run(); database.exec("COMMIT"); return result; }
  catch (error) { database.exec("ROLLBACK"); throw error; }
}
function toClassroom(row: ClassroomRow) {
  return ClassroomSchema.parse({ id: row.id, title: row.title, subject: row.subject, groupLabel: row.group_label,
    period: row.period, context: row.context, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at });
}
function toClassroomSummary(row: ClassroomRow) {
  const { context: _privateContext, ...summary } = toClassroom(row);
  return ClassroomSummarySchema.parse(summary);
}

export function createClassroomRepository(database: DatabaseSync, clock: () => Date = () => new Date()) {
  const now = () => clock().toISOString();
  const audit = database.prepare(`INSERT INTO class_enrollment_events
    (id, enrollment_id, previous_status, next_status, source, actor_user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  function ownedClassroom(teacherId: string, classroomId: string): ClassroomRow | undefined {
    return database.prepare("SELECT * FROM classrooms WHERE id = ? AND teacher_id = ?").get(classroomId, teacherId) as ClassroomRow | undefined;
  }
  function transition(teacherId: string, classroomId: string, enrollmentId: string, from: string, to: string, source: string) {
    const timestamp = now();
    return transaction(database, () => {
      const row = database.prepare(`SELECT e.id,e.status,c.status AS classroom_status FROM class_enrollments e JOIN classrooms c ON c.id=e.classroom_id
        WHERE e.id=? AND e.classroom_id=? AND c.teacher_id=?`).get(enrollmentId, classroomId, teacherId) as { id: string; status: string; classroom_status: string } | undefined;
      if (!row) return "not_found" as const;
      if (row.status !== from) return "conflict" as const;
      if (to === "active" && row.classroom_status !== "active") return "conflict" as const;
      database.prepare("UPDATE class_enrollments SET status=?,decided_at=?,decided_by=? WHERE id=?").run(to, timestamp, teacherId, enrollmentId);
      audit.run(randomUUID(), enrollmentId, from, to, source, teacherId, timestamp);
      return "ok" as const;
    });
  }

  return {
    createClassroom(teacherId: string, input: ClassroomInput) {
      const timestamp = now(); const id = randomUUID();
      database.prepare(`INSERT INTO classrooms(id,teacher_id,title,subject,group_label,identity_key,period,context,status,created_at,updated_at)
        VALUES(?,?,?,?,?,?,?,?,'active',?,?)`).run(id, teacherId, input.title, input.subject, input.groupLabel, classroomIdentity(input), input.period ?? null, input.context ?? null, timestamp, timestamp);
      return toClassroom(database.prepare("SELECT * FROM classrooms WHERE id=?").get(id) as ClassroomRow);
    },
    listClassrooms(teacherId: string, offset: number, limit: number) {
      const rows = database.prepare("SELECT * FROM classrooms WHERE teacher_id=? ORDER BY updated_at DESC,id LIMIT ? OFFSET ?").all(teacherId, limit + 1, offset) as ClassroomRow[];
      return { items: rows.slice(0, limit).map(toClassroomSummary), nextOffset: rows.length > limit ? offset + limit : null };
    },
    getClassroom(teacherId: string, classroomId: string) {
      const row = ownedClassroom(teacherId, classroomId);
      return row ? toClassroom(row) : null;
    },
    updateClassroom(teacherId: string, classroomId: string, input: ClassroomUpdateInput) {
      const row = ownedClassroom(teacherId, classroomId);
      if (!row) return null;
      const next = { title: input.title ?? row.title, subject: input.subject ?? row.subject, groupLabel: input.groupLabel ?? row.group_label,
        period: input.period === undefined ? row.period : input.period, context: input.context === undefined ? row.context : input.context,
        status: input.status ?? row.status };
      const timestamp = now();
      transaction(database, () => {
        database.prepare(`UPDATE classrooms SET title=?,subject=?,group_label=?,identity_key=?,period=?,context=?,status=?,updated_at=? WHERE id=? AND teacher_id=?`)
          .run(next.title, next.subject, next.groupLabel, classroomIdentity(next), next.period, next.context, next.status, timestamp, classroomId, teacherId);
        if (row.status === "active" && next.status === "archived") {
          database.prepare("UPDATE class_join_codes SET revoked_at=?,revoked_by=? WHERE classroom_id=? AND revoked_at IS NULL").run(timestamp, teacherId, classroomId);
        }
      });
      return this.getClassroom(teacherId, classroomId);
    },
    createJoinCode(teacherId: string, classroomId: string, expiresInDays: number | null | undefined) {
      const classroom = ownedClassroom(teacherId, classroomId);
      if (!classroom || classroom.status !== "active") return null;
      const timestamp = now(); const raw = randomBytes(32).toString("base64url"); const expiresAt = expiresInDays ? new Date(clock().getTime() + expiresInDays * 86_400_000).toISOString() : null;
      transaction(database, () => {
        database.prepare("UPDATE class_join_codes SET revoked_at=?,revoked_by=? WHERE classroom_id=? AND revoked_at IS NULL").run(timestamp, teacherId, classroomId);
        database.prepare("INSERT INTO class_join_codes(id,classroom_id,code_hash,expires_at,created_at,created_by) VALUES(?,?,?,?,?,?)")
          .run(randomUUID(), classroomId, hashCode(raw), expiresAt, timestamp, teacherId);
      });
      return ClassJoinCodeSchema.parse({ code: raw, expiresAt, createdAt: timestamp });
    },
    revokeJoinCode(teacherId: string, classroomId: string) {
      const timestamp = now();
      const result = database.prepare(`UPDATE class_join_codes SET revoked_at=?,revoked_by=? WHERE classroom_id=? AND revoked_at IS NULL
        AND EXISTS(SELECT 1 FROM classrooms c WHERE c.id=? AND c.teacher_id=?)`).run(timestamp, teacherId, classroomId, classroomId, teacherId);
      return Number(result.changes) > 0;
    },
    requestByCode(studentId: string, code: string): JoinEnrollmentResult {
      const timestamp = clock(); const windowStart = timestamp.getTime() - 15 * 60_000;
      return transaction(database, () => {
        const previous = database.prepare("SELECT window_started_at,attempt_count FROM class_join_attempts WHERE student_id=?").get(studentId) as { window_started_at: number; attempt_count: number } | undefined;
        const count = previous && previous.window_started_at > windowStart ? previous.attempt_count : 0;
        if (count >= 10) return { kind: "rate_limited" };
        database.prepare(`INSERT INTO class_join_attempts(student_id,window_started_at,attempt_count) VALUES(?,?,1)
          ON CONFLICT(student_id) DO UPDATE SET window_started_at=excluded.window_started_at,
          attempt_count=CASE WHEN class_join_attempts.window_started_at > ? THEN class_join_attempts.attempt_count+1 ELSE 1 END`)
          .run(studentId, timestamp.getTime(), windowStart);
        const match = database.prepare(`SELECT c.id,c.status,code.expires_at FROM class_join_codes code JOIN classrooms c ON c.id=code.classroom_id
          WHERE code.code_hash=? AND code.revoked_at IS NULL`).get(hashCode(code)) as { id: string; status: string; expires_at: string | null } | undefined;
        if (!match || match.status !== "active" || (match.expires_at && Date.parse(match.expires_at) <= timestamp.getTime())) return { kind: "invalid_code" };
        const existing = database.prepare("SELECT id,status,source,requested_at,decided_at FROM class_enrollments WHERE classroom_id=? AND student_id=?").get(match.id, studentId) as { id: string; status: EnrollmentStatus; source: EnrollmentSource; requested_at: string; decided_at: string | null } | undefined;
        if (existing) {
          if (existing.status === "pending" || existing.status === "active") return { kind: "ok", enrollment: { id: existing.id, status: existing.status, source: existing.source, requestedAt: existing.requested_at, decidedAt: existing.decided_at } };
          return { kind: "conflict" };
        }
        const id = randomUUID(); const createdAt = timestamp.toISOString();
        database.prepare("INSERT INTO class_enrollments(id,classroom_id,student_id,status,source,requested_at) VALUES(?,?,?,'pending','join_code',?)").run(id, match.id, studentId, createdAt);
        audit.run(randomUUID(), id, null, "pending", "join_code", studentId, createdAt);
        return { kind: "ok", enrollment: { id, status: "pending", source: "join_code", requestedAt: createdAt, decidedAt: null } };
      });
    },
    directAssign(teacherId: string, classroomId: string, studentId: string): DirectEnrollmentResult {
      const timestamp = now();
      return transaction(database, () => {
        const classroom = ownedClassroom(teacherId, classroomId);
        if (!classroom || classroom.status !== "active") return { kind: "not_found" };
        const student = database.prepare(`SELECT 1 FROM user u JOIN account a ON a.userId=u.id AND a.providerId='github'
          WHERE u.id=? AND COALESCE(u.isTeacher,0)=0 AND COALESCE(u.role,'user') NOT LIKE '%admin%'`).get(studentId);
        if (!student) return { kind: "invalid_student" };
        const existing = database.prepare("SELECT id,status,source,requested_at,decided_at FROM class_enrollments WHERE classroom_id=? AND student_id=?").get(classroomId, studentId) as { id: string; status: EnrollmentStatus; source: EnrollmentSource; requested_at: string; decided_at: string | null } | undefined;
        if (existing) {
          if (existing.status === "active") return { kind: "ok", enrollment: { id: existing.id, status: "active", source: existing.source, requestedAt: existing.requested_at, decidedAt: existing.decided_at } };
          if (existing.status !== "pending") return { kind: "conflict" };
          database.prepare("UPDATE class_enrollments SET status='active',source='teacher_assignment',decided_at=?,decided_by=? WHERE id=?").run(timestamp, teacherId, existing.id);
          audit.run(randomUUID(), existing.id, "pending", "active", "teacher_assignment", teacherId, timestamp);
          return { kind: "ok", enrollment: { id: existing.id, status: "active", source: "teacher_assignment", requestedAt: existing.requested_at, decidedAt: timestamp } };
        }
        const id = randomUUID();
        database.prepare("INSERT INTO class_enrollments(id,classroom_id,student_id,status,source,requested_at,decided_at,decided_by) VALUES(?,?,?,'active','teacher_assignment',?,?,?)")
          .run(id, classroomId, studentId, timestamp, timestamp, teacherId);
        audit.run(randomUUID(), id, null, "active", "teacher_assignment", teacherId, timestamp);
        return { kind: "ok", enrollment: { id, status: "active", source: "teacher_assignment", requestedAt: timestamp, decidedAt: timestamp } };
      });
    },
    transitionEnrollment: transition,
    listEnrollments(teacherId: string, classroomId: string) {
      if (!ownedClassroom(teacherId, classroomId)) return null;
      const rows = database.prepare(`SELECT e.id,e.student_id,u.githubLogin,e.status,e.source,e.requested_at,e.decided_at FROM class_enrollments e
        JOIN user u ON u.id=e.student_id WHERE e.classroom_id=? ORDER BY CASE e.status WHEN 'pending' THEN 0 ELSE 1 END,e.requested_at DESC`)
        .all(classroomId) as EnrollmentRow[];
      return rows.map((row) => ClassEnrollmentSchema.parse({ id: row.id, studentId: row.student_id, githubLogin: row.githubLogin,
        status: row.status, source: row.source, requestedAt: row.requested_at, decidedAt: row.decided_at }));
    },
    listStudentClassrooms(studentId: string) {
      const rows = database.prepare(`SELECT c.* FROM classrooms c JOIN class_enrollments e ON e.classroom_id=c.id
        WHERE e.student_id=? AND e.status='active' AND c.status='active' ORDER BY e.decided_at DESC,c.title`)
        .all(studentId) as ClassroomRow[];
      return rows.map(toClassroomSummary);
    },
    listStudentSkills(studentId: string, classroomId: string) {
      const member = database.prepare(`SELECT 1 FROM class_enrollments e JOIN classrooms c ON c.id=e.classroom_id
        WHERE e.student_id=? AND e.classroom_id=? AND e.status='active' AND c.status='active'`).get(studentId, classroomId);
      if (!member) return null;
      const rows = database.prepare(`SELECT s.id,s.name,s.description,s.archived,s.created_at,s.updated_at FROM teacher_skills s
        JOIN classroom_skill_availability a ON a.skill_id=s.id AND a.teacher_id=s.teacher_id
        WHERE a.classroom_id=? AND a.enabled=1 AND s.archived=0 ORDER BY s.name`).all(classroomId) as SkillRow[];
      return rows.map((row) => SkillCatalogEntrySchema.parse({ id: row.id, name: row.name, description: row.description, archived: false, createdAt: row.created_at, updatedAt: row.updated_at }));
    },
    listStudentRequests(studentId: string) {
      const rows = database.prepare("SELECT id,status,source,requested_at,decided_at FROM class_enrollments WHERE student_id=? ORDER BY requested_at DESC LIMIT 200")
        .all(studentId) as Array<{ id: string; status: EnrollmentStatus; source: EnrollmentSource; requested_at: string; decided_at: string | null }>;
      return rows.map((row) => ({ id: row.id, status: row.status, source: row.source, requestedAt: row.requested_at, decidedAt: row.decided_at }));
    },
    createSkill(teacherId: string, name: string, description?: string | null) {
      const timestamp = now(); const id = randomUUID();
      database.prepare("INSERT INTO teacher_skills(id,teacher_id,name,normalized_name,description,archived,created_at,updated_at) VALUES(?,?,?,?,?,0,?,?)")
        .run(id, teacherId, name.trim(), normalizedName(name), description?.trim() || null, timestamp, timestamp);
      return SkillCatalogEntrySchema.parse({ id, name: name.trim(), description: description?.trim() || null, archived: false, createdAt: timestamp, updatedAt: timestamp });
    },
    listSkills(teacherId: string) {
      const rows = database.prepare("SELECT id,name,description,archived,created_at,updated_at FROM teacher_skills WHERE teacher_id=? ORDER BY archived,name")
        .all(teacherId) as SkillRow[];
      return rows.map((row) => SkillCatalogEntrySchema.parse({ id: row.id, name: row.name, description: row.description, archived: row.archived === 1, createdAt: row.created_at, updatedAt: row.updated_at }));
    },
    updateSkill(teacherId: string, skillId: string, input: { name?: string | undefined; description?: string | null | undefined; archived?: boolean | undefined }) {
      const row = database.prepare("SELECT * FROM teacher_skills WHERE id=? AND teacher_id=?").get(skillId, teacherId) as SkillRow & { normalized_name: string } | undefined;
      if (!row) return null;
      const name = input.name?.trim() ?? row.name; const description = input.description === undefined ? row.description : input.description?.trim() || null;
      const archived = input.archived === undefined ? row.archived : Number(input.archived); const timestamp = now();
      database.prepare("UPDATE teacher_skills SET name=?,normalized_name=?,description=?,archived=?,updated_at=? WHERE id=? AND teacher_id=?")
        .run(name, normalizedName(name), description, archived, timestamp, skillId, teacherId);
      return this.listSkills(teacherId).find((skill) => skill.id === skillId) ?? null;
    },
    listClassroomSkills(teacherId: string, classroomId: string) {
      if (!ownedClassroom(teacherId, classroomId)) return null;
      const rows = database.prepare(`SELECT s.id,s.name,s.description,s.archived,s.created_at,s.updated_at,a.enabled FROM teacher_skills s
        LEFT JOIN classroom_skill_availability a ON a.skill_id=s.id AND a.classroom_id=? AND a.teacher_id=?
        WHERE s.teacher_id=? ORDER BY s.archived,s.name`).all(classroomId, teacherId, teacherId) as Array<SkillRow & { enabled: number | null }>;
      return ClassroomSkillsResponseSchema.parse(rows.map((row) => ({ id: row.id, name: row.name, description: row.description, archived: row.archived === 1,
        createdAt: row.created_at, updatedAt: row.updated_at, enabled: row.enabled === 1 })));
    },
    setClassroomSkill(teacherId: string, classroomId: string, skillId: string, enabled: boolean) {
      const classroom = ownedClassroom(teacherId, classroomId); const skill = database.prepare("SELECT archived FROM teacher_skills WHERE id=? AND teacher_id=?").get(skillId, teacherId) as { archived: number } | undefined;
      if (!classroom || !skill) return { kind: "not_found" } as const;
      if (enabled && skill.archived) return { kind: "archived" } as const;
      const timestamp = now();
      database.prepare(`INSERT INTO classroom_skill_availability(classroom_id,skill_id,teacher_id,enabled,updated_at) VALUES(?,?,?,?,?)
        ON CONFLICT(classroom_id,skill_id) DO UPDATE SET enabled=excluded.enabled,updated_at=excluded.updated_at`)
        .run(classroomId, skillId, teacherId, Number(enabled), timestamp);
      return { kind: "ok", availability: { classroomId, skillId, enabled, updatedAt: timestamp } } as const;
    },
  };
}
