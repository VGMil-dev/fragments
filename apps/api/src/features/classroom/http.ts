import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import {
  ApiResultSchema, ClassroomCreateRequestSchema, ClassroomJoinCodeRequestSchema, ClassroomPageSchema,
  ClassroomSchema, ClassroomUpdateRequestSchema, ClassEnrollmentSchema, ClassEnrollmentsResponseSchema, ClassroomJoinCodeRevocationSchema,
  ClassJoinCodeSchema, ClassroomSkillsResponseSchema, DirectEnrollmentRequestSchema, JoinClassroomRequestSchema,
  SkillCatalogResponseSchema, SkillCreateRequestSchema, SkillUpdateRequestSchema, StudentClassroomRequestsSchema,
  StudentClassroomsSchema, ClassroomSkillAvailabilitySchema,
} from "@fragments/contracts";
import { z } from "zod";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createClassroomRepository } from "./repository.js";

const errorSchema = ApiResultSchema(z.unknown());
type HandlerResult = "handled" | "unhandled";

export function createClassroomHttp(database: DatabaseSync, auth?: FragmentsAuthService) {
  let repository: ReturnType<typeof createClassroomRepository> | undefined;
  const getRepository = () => repository ??= createClassroomRepository(database);
  return async function handleClassroomHttp(request: IncomingMessage, response: ServerResponse): Promise<HandlerResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    const { pathname } = url;
    if (pathname.startsWith("/api/teacher/classrooms") || pathname.startsWith("/api/teacher/skills")) {
      const teacherId = await requireTeacher(request, response, auth);
      if (!teacherId) return "handled";
      const classrooms = getRepository();

      if (pathname === "/api/teacher/classrooms" && request.method === "GET") {
        const page = readPage(url.searchParams);
        if (!page) { sendError(response, 400, "INVALID_PAGINATION", "Revisa los límites de la página solicitada."); return "handled"; }
        sendJson(response, 200, { ok: true, data: ClassroomPageSchema.parse(classrooms.listClassrooms(teacherId, page.offset, page.limit)) }); return "handled";
      }
      if (pathname === "/api/teacher/classrooms" && request.method === "POST") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = ClassroomCreateRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los datos del aula."); return "handled"; }
        try { sendJson(response, 201, { ok: true, data: ClassroomSchema.parse(classrooms.createClassroom(teacherId, input.data)) }); }
        catch (error) { sendDatabaseError(response, error, "CLASSROOM_EXISTS", "Ya existe un aula con la misma asignatura, grupo y período."); }
        return "handled";
      }

      const classroomId = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})$/)?.[1];
      if (classroomId && request.method === "GET") {
        const result = classrooms.getClassroom(teacherId, classroomId);
        if (!result) sendError(response, 404, "NOT_FOUND", "No se encontró el aula.");
        else sendJson(response, 200, { ok: true, data: ClassroomSchema.parse(result) });
        return "handled";
      }
      if (classroomId && request.method === "PATCH") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = ClassroomUpdateRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los datos del aula."); return "handled"; }
        try {
          const result = classrooms.updateClassroom(teacherId, classroomId, input.data);
          if (!result) sendError(response, 404, "NOT_FOUND", "No se encontró el aula.");
          else sendJson(response, 200, { ok: true, data: ClassroomSchema.parse(result) });
        } catch (error) { sendDatabaseError(response, error, "CLASSROOM_EXISTS", "Ya existe un aula con la misma asignatura, grupo y período."); }
        return "handled";
      }

      const joinCodeMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/join-code$/);
      if (joinCodeMatch && request.method === "POST") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = ClassroomJoinCodeRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "La expiración debe estar entre 1 y 90 días."); return "handled"; }
        const code = classrooms.createJoinCode(teacherId, joinCodeMatch[1]!, input.data.expiresInDays);
        if (!code) sendError(response, 404, "NOT_FOUND", "No se encontró un aula activa.");
        else sendJson(response, 201, { ok: true, data: ClassJoinCodeSchema.parse(code) });
        return "handled";
      }
      const revokeCodeMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/join-code\/revoke$/);
      if (revokeCodeMatch && request.method === "POST") {
        if (!classrooms.revokeJoinCode(teacherId, revokeCodeMatch[1]!)) sendError(response, 404, "NOT_FOUND", "No hay un código activo para revocar en esa aula.");
        else sendJson(response, 200, { ok: true, data: ClassroomJoinCodeRevocationSchema.parse({ revoked: true }) });
        return "handled";
      }

      const enrollmentRoute = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/enrollments$/);
      if (enrollmentRoute && request.method === "GET") {
        const result = classrooms.listEnrollments(teacherId, enrollmentRoute[1]!);
        if (!result) sendError(response, 404, "NOT_FOUND", "No se encontró el aula.");
        else sendJson(response, 200, { ok: true, data: ClassEnrollmentsResponseSchema.parse(result) });
        return "handled";
      }
      const directRoute = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/enrollments\/direct$/);
      if (directRoute && request.method === "POST") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = DirectEnrollmentRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Indica una identidad estudiantil válida."); return "handled"; }
        const result = classrooms.directAssign(teacherId, directRoute[1]!, input.data.studentId);
        if (result.kind === "ok") sendJson(response, 200, { ok: true, data: ClassEnrollmentSchema.parse({ ...result.enrollment, studentId: input.data.studentId, githubLogin: null }) });
        else if (result.kind === "invalid_student") sendError(response, 404, "STUDENT_NOT_FOUND", "No se encontró una identidad estudiantil verificada.");
        else if (result.kind === "not_found") sendError(response, 404, "NOT_FOUND", "No se encontró un aula activa.");
        else sendError(response, 409, "ENROLLMENT_CONFLICT", "La matrícula anterior no se reactiva automáticamente.");
        return "handled";
      }
      const transitionMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/enrollments\/([A-Za-z0-9_-]{1,100})\/(approve|reject|remove)$/);
      if (transitionMatch && request.method === "POST") {
        const [, classId, enrollmentId, action] = transitionMatch;
        const [from, to, source] = action === "approve" ? ["pending", "active", "teacher_approval"] as const
          : action === "reject" ? ["pending", "rejected", "teacher_rejection"] as const : ["active", "removed", "teacher_removal"] as const;
        const result = classrooms.transitionEnrollment(teacherId, classId!, enrollmentId!, from, to, source);
        if (result !== "ok") sendError(response, result === "not_found" ? 404 : 409, result === "not_found" ? "NOT_FOUND" : "INVALID_TRANSITION", "La matrícula no admite esa transición.");
        else sendJson(response, 200, { ok: true, data: { status: to } });
        return "handled";
      }
      const skillList = pathname === "/api/teacher/skills" && request.method === "GET";
      if (skillList) { sendJson(response, 200, { ok: true, data: SkillCatalogResponseSchema.parse(classrooms.listSkills(teacherId)) }); return "handled"; }
      if (pathname === "/api/teacher/skills" && request.method === "POST") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = SkillCreateRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa el nombre y la descripción de la habilidad."); return "handled"; }
        try { sendJson(response, 201, { ok: true, data: classrooms.createSkill(teacherId, input.data.name, input.data.description) }); }
        catch (error) { sendDatabaseError(response, error, "SKILL_EXISTS", "Ya existe una habilidad con ese nombre normalizado."); }
        return "handled";
      }
      const skillMatch = pathname.match(/^\/api\/teacher\/skills\/([A-Za-z0-9_-]{1,100})$/);
      if (skillMatch && request.method === "PATCH") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = SkillUpdateRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa los datos de la habilidad."); return "handled"; }
        try {
          const result = classrooms.updateSkill(teacherId, skillMatch[1]!, input.data);
          if (!result) sendError(response, 404, "NOT_FOUND", "No se encontró la habilidad.");
          else sendJson(response, 200, { ok: true, data: result });
        } catch (error) { sendDatabaseError(response, error, "SKILL_EXISTS", "Ya existe una habilidad con ese nombre normalizado."); }
        return "handled";
      }
      const archiveMatch = pathname.match(/^\/api\/teacher\/skills\/([A-Za-z0-9_-]{1,100})\/archive$/);
      if (archiveMatch && request.method === "POST") {
        const result = classrooms.updateSkill(teacherId, archiveMatch[1]!, { archived: true });
        if (!result) sendError(response, 404, "NOT_FOUND", "No se encontró la habilidad.");
        else sendJson(response, 200, { ok: true, data: result });
        return "handled";
      }
      const classroomSkillsMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/skills$/);
      if (classroomSkillsMatch && request.method === "GET") {
        const result = classrooms.listClassroomSkills(teacherId, classroomSkillsMatch[1]!);
        if (!result) sendError(response, 404, "NOT_FOUND", "No se encontró el aula.");
        else sendJson(response, 200, { ok: true, data: ClassroomSkillsResponseSchema.parse(result) });
        return "handled";
      }
      const availabilityMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/skills\/([A-Za-z0-9_-]{1,100})$/);
      if (availabilityMatch && request.method === "PUT") {
        const raw = await readJson(request, response); if (raw === undefined) return "handled";
        const input = z.object({ enabled: z.boolean() }).strict().safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Indica si la habilidad estará disponible en el aula."); return "handled"; }
        const result = classrooms.setClassroomSkill(teacherId, availabilityMatch[1]!, availabilityMatch[2]!, input.data.enabled);
        if (result.kind === "not_found") sendError(response, 404, "NOT_FOUND", "No se encontró el aula o la habilidad.");
        else if (result.kind === "archived") sendError(response, 409, "SKILL_ARCHIVED", "Una habilidad archivada no puede habilitarse.");
        else sendJson(response, 200, { ok: true, data: ClassroomSkillAvailabilitySchema.parse(result.availability) });
        return "handled";
      }
      sendError(response, 404, "NOT_FOUND", "No se encontró la ruta de Classroom Studio."); return "handled";
    }

    if (pathname === "/api/classroom-join-requests" && request.method === "POST") {
      const student = await requireStudent(request, response, auth); if (!student) return "handled";
      const classrooms = getRepository();
      const raw = await readJson(request, response); if (raw === undefined) return "handled";
      const input = JoinClassroomRequestSchema.safeParse(raw);
      if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Revisa el código de aula."); return "handled"; }
      const result = classrooms.requestByCode(student.id, input.data.code);
      if (result.kind === "ok") sendJson(response, 201, { ok: true, data: ClassEnrollmentSchema.pick({ id: true, status: true, source: true, requestedAt: true, decidedAt: true }).parse(result.enrollment) });
      else if (result.kind === "invalid_code") sendError(response, 404, "INVALID_JOIN_CODE", "El código no es válido o ya no está activo.");
      else if (result.kind === "rate_limited") sendError(response, 429, "JOIN_CODE_RATE_LIMITED", "Se alcanzó el límite de intentos. Espera antes de volver a probar.");
      else sendError(response, 409, "ENROLLMENT_CONFLICT", "La matrícula anterior requiere una decisión docente explícita.");
      return "handled";
    }
    if (pathname === "/api/me/classrooms" && request.method === "GET") {
      const student = await requireStudent(request, response, auth); if (!student) return "handled";
      const classrooms = getRepository();
      sendJson(response, 200, { ok: true, data: StudentClassroomsSchema.parse(classrooms.listStudentClassrooms(student.id)) }); return "handled";
    }
    if (pathname === "/api/me/classroom-requests" && request.method === "GET") {
      const student = await requireStudent(request, response, auth); if (!student) return "handled";
      const classrooms = getRepository();
      sendJson(response, 200, { ok: true, data: StudentClassroomRequestsSchema.parse(classrooms.listStudentRequests(student.id)) }); return "handled";
    }
    const studentSkillsMatch = pathname.match(/^\/api\/me\/classrooms\/([A-Za-z0-9_-]{1,100})\/skills$/);
    if (studentSkillsMatch && request.method === "GET") {
      const student = await requireStudent(request, response, auth); if (!student) return "handled";
      const classrooms = getRepository();
      const result = classrooms.listStudentSkills(student.id, studentSkillsMatch[1]!);
      if (!result) sendError(response, 404, "NOT_FOUND", "No se encontraron habilidades disponibles para esa aula.");
      else sendJson(response, 200, { ok: true, data: SkillCatalogResponseSchema.parse(result) });
      return "handled";
    }
    return "unhandled";
  };
}

async function requireTeacher(request: IncomingMessage, response: ServerResponse, auth?: FragmentsAuthService): Promise<string | null> {
  if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado."); return null; }
  try {
    const id = await auth.userId(request); if (!id) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión para continuar."); return null; }
    const teacherId = await auth.teacherId(request); if (!teacherId) { sendError(response, 403, "FORBIDDEN", "Esta acción requiere permisos docentes."); return null; }
    return teacherId;
  } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión docente."); return null; }
}
async function requireStudent(request: IncomingMessage, response: ServerResponse, auth?: FragmentsAuthService): Promise<{ id: string } | null> {
  if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso estudiantil no está habilitado."); return null; }
  try {
    const student = await auth.student(request); if (!student) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión con GitHub para continuar."); return null; }
    return student;
  } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión."); return null; }
}
function readPage(search: URLSearchParams): { offset: number; limit: number } | null {
  const offsetRaw = search.get("offset") ?? "0", limitRaw = search.get("limit") ?? "20";
  if (!/^\d{1,6}$/.test(offsetRaw) || !/^\d{1,2}$/.test(limitRaw)) return null;
  const offset = Number(offsetRaw), limit = Number(limitRaw);
  return offset <= 100_000 && limit >= 1 && limit <= 50 ? { offset, limit } : null;
}
async function readJson(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  try {
    for await (const chunk of request) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 8 * 1024) { sendError(response, 413, "INVALID_INPUT", "La solicitud supera el tamaño permitido."); return undefined; } }
    return JSON.parse(raw);
  } catch { sendError(response, 400, "INVALID_INPUT", "La solicitud no contiene JSON válido."); return undefined; }
}
function sendJson(response: ServerResponse, status: number, body: unknown): void { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }); response.end(JSON.stringify(body)); }
function sendError(response: ServerResponse, status: number, code: string, message: string): void { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }); response.end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } }))); }
function sendDatabaseError(response: ServerResponse, error: unknown, conflictCode: string, conflictMessage: string): void {
  if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) sendError(response, 409, conflictCode, conflictMessage);
  else sendError(response, 500, "PERSISTENCE_ERROR", "No se pudo guardar el cambio. Inténtalo de nuevo.");
}
