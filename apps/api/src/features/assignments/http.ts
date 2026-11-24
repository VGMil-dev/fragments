import type { IncomingMessage, ServerResponse } from "node:http";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { ClassroomAssignmentsResponseSchema, CreateAssignmentRequestSchema, PublishAssignmentRequestSchema, StudentAssignmentsResponseSchema, UpdateAssignmentDraftRequestSchema } from "@fragments/contracts";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createAssignmentRepository } from "./repository.js";

type Result = "handled" | "unhandled";
export function createAssignmentHttp(database: PrismaClient, auth?: FragmentsAuthService) {
  const repository = createAssignmentRepository(database);
  return async function handleAssignmentHttp(request: IncomingMessage, response: ServerResponse): Promise<Result> {
    const pathname = new URL(request.url ?? "/", "http://fragments.local").pathname;
    const studentMatch = pathname.match(/^\/api\/me\/classrooms\/([A-Za-z0-9_-]{1,100})\/assignments$/);
    const teacherMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/assignments$/);
    const draftMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/assignments\/([A-Za-z0-9_-]{1,100})\/draft$/);
    const publishMatch = pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/assignments\/([A-Za-z0-9_-]{1,100})\/publish$/);
    const missionPlanEnabled = request.headers["x-fragments-mission-plan"] === "1";
    if (!studentMatch && !teacherMatch && !draftMatch && !publishMatch) return "unhandled";
    if (studentMatch && request.method === "GET") {
      const student = await auth?.student(request).catch(() => null);
      if (!student) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
      const assignments = await repository.listStudent(student.id, studentMatch[1]!);
      if (!assignments) send(response, 404, { ok: false, error: { code: "NOT_FOUND", message: "No se encontró un aula activa." } });
      else {
        const data = StudentAssignmentsResponseSchema.parse(assignments);
        send(response, 200, { ok: true, data: missionPlanEnabled ? data : data.map(legacyStudentAssignment) });
      }
      return "handled";
    }
    const teacherId = await auth?.teacherId(request).catch(() => null);
    if (!teacherId) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión con permisos docentes." } }); return "handled"; }
    if (teacherMatch && request.method === "GET") {
      const rows = await repository.list(teacherId, teacherMatch[1]!);
      if (!rows) send(response, 404, { ok: false, error: { code: "NOT_FOUND", message: "No se encontró un aula activa propia." } });
      else {
        const data = ClassroomAssignmentsResponseSchema.parse(rows);
        send(response, 200, { ok: true, data: missionPlanEnabled ? data : data.map(legacyClassroomAssignment) });
      }
      return "handled";
    }
    if (teacherMatch && request.method === "POST") {
      const raw = await body(request, response); if (raw === undefined) return "handled";
      const input = CreateAssignmentRequestSchema.safeParse(raw);
      if (!input.success) { send(response, 400, { ok: false, error: { code: "INVALID_INPUT", message: "Revisa el borrador y las habilidades." } }); return "handled"; }
      const result = await repository.create(teacherId, teacherMatch[1]!, input.data);
      if (!result) send(response, 404, { ok: false, error: { code: "NOT_FOUND", message: "No se encontró un aula activa propia." } });
      else if ("kind" in result) send(response, 409, { ok: false, error: { code: "SKILLS_UNAVAILABLE", message: "Activa las habilidades seleccionadas en el aula." } });
      else send(response, 201, { ok: true, data: missionPlanEnabled ? result : legacyClassroomAssignment(result) });
      return "handled";
    }
    if (draftMatch && request.method === "PATCH") {
      const raw = await body(request, response); if (raw === undefined) return "handled";
      const input = UpdateAssignmentDraftRequestSchema.safeParse(raw);
      if (!input.success) { send(response, 400, { ok: false, error: { code: "INVALID_INPUT", message: "Revisa el borrador y las habilidades." } }); return "handled"; }
      const { expectedVersion, ...draft } = input.data;
      const result = await repository.updateDraft(teacherId, draftMatch[1]!, draftMatch[2]!, expectedVersion, draft);
      if (result.kind === "not_found") send(response, 404, { ok: false, error: { code: "NOT_FOUND", message: "No se encontró el borrador." } });
      else if (result.kind === "conflict") send(response, 409, { ok: false, error: { code: "VERSION_CONFLICT", message: "El borrador cambió. Actualiza y vuelve a intentar." } });
      else if (result.kind === "invalid_skills") send(response, 409, { ok: false, error: { code: "SKILLS_UNAVAILABLE", message: "Activa las habilidades seleccionadas en el aula." } });
      else send(response, 200, { ok: true, data: missionPlanEnabled ? result.assignment : legacyClassroomAssignment(result.assignment) });
      return "handled";
    }
    if (publishMatch && request.method === "POST") {
      const raw = await body(request, response); if (raw === undefined) return "handled";
      const input = PublishAssignmentRequestSchema.safeParse(raw);
      if (!input.success) { send(response, 400, { ok: false, error: { code: "INVALID_INPUT", message: "Revisa la versión del borrador." } }); return "handled"; }
      const result = await repository.publish(teacherId, publishMatch[1]!, publishMatch[2]!, input.data.expectedVersion, missionPlanEnabled);
      if (result.kind === "not_found") send(response, 404, { ok: false, error: { code: "NOT_FOUND", message: "No se encontró el borrador." } });
      else if (result.kind === "conflict") send(response, 409, { ok: false, error: { code: "VERSION_CONFLICT", message: "El borrador cambió. Actualiza y vuelve a intentar." } });
      else if (result.kind === "invalid_skills") send(response, 409, { ok: false, error: { code: "SKILLS_UNAVAILABLE", message: "Activa las habilidades seleccionadas en el aula." } });
      else if (result.kind === "incomplete_assignment") send(response, 409, { ok: false, error: { code: "MISSION_INCOMPLETE", message: "Completa la rúbrica propia y configura al menos dos entregas antes de publicar." } });
      else send(response, 200, { ok: true, data: missionPlanEnabled ? result.assignment : legacyClassroomAssignment(result.assignment) });
      return "handled";
    }
    return "unhandled";
  };
}

function legacyStudentAssignment(value: unknown) {
  const { missionRubric: _rubric, deliverables: _deliverables, missionPlanVersion: _version, ...legacy } = value as Record<string, unknown>;
  return legacy;
}

function legacyClassroomAssignment(value: unknown) {
  const assignment = value as Record<string, unknown>;
  const { missionPlanVersion: _version, draft, versions, ...legacy } = assignment;
  const stripPlan = (snapshot: unknown) => {
    if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return snapshot;
    const { missionRubric: _rubric, deliverables: _deliverables, ...rest } = snapshot as Record<string, unknown>;
    return rest;
  };
  return { ...legacy, draft: draft ? stripPlan(draft) : draft, versions: Array.isArray(versions) ? versions.map(stripPlan) : versions };
}

async function body(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let value = "";
  try { for await (const part of request) { value += part.toString(); if (Buffer.byteLength(value) > 12_000) { send(response, 413, { ok: false, error: { code: "INVALID_INPUT", message: "La solicitud es demasiado grande." } }); return undefined; } } return JSON.parse(value); }
  catch { send(response, 400, { ok: false, error: { code: "INVALID_INPUT", message: "La solicitud no contiene JSON válido." } }); return undefined; }
}
function send(response: ServerResponse, status: number, value: unknown) { response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }); response.end(JSON.stringify(value)); }
