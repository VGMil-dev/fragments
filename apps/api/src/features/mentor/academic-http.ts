import { createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import {
  AcademicGalleryDetailSchema,
  AcademicGalleryPageSchema,
  ApiResultSchema,
  GalleryWithdrawalRequestSchema,
  HistoricalProjectsResponseSchema,
  MeResponseSchema,
  OwnedProposalsResponseSchema,
  StudentMeSchema,
  TeacherProjectsResponseSchema,
  TeacherStudentsPageSchema,
} from "@fragments/contracts";
import { z } from "zod";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createAcademicRepository } from "./academic-repository.js";

type RouteResult = "handled" | "unhandled";
const errorSchema = ApiResultSchema(z.unknown());

export function createAcademicHttp(database: DatabaseSync, auth?: FragmentsAuthService) {
  const academic = createAcademicRepository(database);

  return async function handleAcademicHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method === "GET" && url.pathname === "/api/me") {
      if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso por GitHub no está habilitado."); return "handled"; }
      try {
        const result = await auth.studentAccess(request);
        if (result.kind !== "student") {
          sendJson(response, 200, { ok: true, data: MeResponseSchema.parse({ authenticated: false, githubOAuthConfigured: auth.githubOAuthConfigured, reason: result.kind }) });
          return "handled";
        }
        const student = result.student;
        sendJson(response, 200, { ok: true, data: MeResponseSchema.parse({
          authenticated: true,
          id: student.id,
          githubLogin: student.githubLogin,
          avatarUrl: safeAvatar(student.avatarUrl),
          profileUrl: student.githubLogin ? `https://github.com/${student.githubLogin}` : null,
          registeredAt: student.registeredAt,
        }) });
      } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión."); }
      return "handled";
    }

    if (request.method === "GET" && url.pathname === "/api/me/proposals") {
      const student = await requireStudent(request, response, auth);
      if (!student) return "handled";
      sendJson(response, 200, { ok: true, data: OwnedProposalsResponseSchema.parse(academic.listOwnedProposals(student.id)) });
      return "handled";
    }

    const claim = request.method === "POST" && url.pathname.match(/^\/api\/me\/proposals\/([A-Za-z0-9_-]{1,100})\/claim$/);
    if (claim) {
      const student = await requireStudent(request, response, auth);
      if (!student) return "handled";
      const token = readOwnerToken(request);
      if (!token) { sendError(response, 404, "NOT_FOUND", "No se encontró una propuesta histórica con esta prueba de propiedad."); return "handled"; }
      const status = academic.claimHistoricalProject(claim[1]!, hashOwnerToken(token), student.id);
      if (status === "not_found") sendError(response, 404, "NOT_FOUND", "No se encontró una propuesta histórica con esta prueba de propiedad.");
      else if (status === "conflict") sendError(response, 409, "ALREADY_CLAIMED", "La propuesta histórica ya fue reclamada o no admite otro reclamo.");
      else sendJson(response, 200, { ok: true, data: { claimed: true } });
      return "handled";
    }

    if (request.method === "GET" && url.pathname === "/api/gallery") {
      const student = await requireStudent(request, response, auth);
      if (!student) return "handled";
      const page = readPage(url.searchParams);
      if (!page) { sendError(response, 400, "INVALID_PAGINATION", "Revisa los límites de la página solicitada."); return "handled"; }
      sendJson(response, 200, { ok: true, data: AcademicGalleryPageSchema.parse(academic.listGallery(page.offset, page.limit)) });
      return "handled";
    }

    const detail = request.method === "GET" && url.pathname.match(/^\/api\/gallery\/([A-Za-z0-9_-]{1,100})$/);
    if (detail) {
      const student = await requireStudent(request, response, auth);
      if (!student) return "handled";
      const value = academic.getGalleryDetail(detail[1]!);
      if (!value) sendError(response, 404, "NOT_FOUND", "No se encontró el proyecto publicado.");
      else sendJson(response, 200, { ok: true, data: AcademicGalleryDetailSchema.parse(value) });
      return "handled";
    }

    if (url.pathname === "/api/teacher/mentor-control" || url.pathname.startsWith("/api/teacher/mentor-control/")) return "unhandled";

    if (url.pathname.startsWith("/api/teacher/")) {
      const teacherId = await requireTeacher(request, response, auth);
      if (!teacherId) return "handled";
      if (request.method === "GET" && url.pathname === "/api/teacher/students") {
        const page = readPage(url.searchParams);
        if (!page) { sendError(response, 400, "INVALID_PAGINATION", "Revisa los límites de la página solicitada."); return "handled"; }
        sendJson(response, 200, { ok: true, data: TeacherStudentsPageSchema.parse(academic.listStudents(page.offset, page.limit)) });
        return "handled";
      }
      if (request.method === "GET" && url.pathname === "/api/teacher/historical-projects") {
        sendJson(response, 200, { ok: true, data: HistoricalProjectsResponseSchema.parse(academic.listHistoricalProjects()) });
        return "handled";
      }
      const studentProjects = request.method === "GET" && url.pathname.match(/^\/api\/teacher\/students\/([A-Za-z0-9_-]{1,100})\/projects$/);
      if (studentProjects) {
        if (!academic.isGitHubStudent(studentProjects[1]!)) { sendError(response, 404, "NOT_FOUND", "No se encontró el perfil estudiantil."); return "handled"; }
        sendJson(response, 200, { ok: true, data: TeacherProjectsResponseSchema.parse(academic.listStudentProjects(studentProjects[1]!)) });
        return "handled";
      }
      const withdraw = request.method === "POST" && url.pathname.match(/^\/api\/teacher\/projects\/([A-Za-z0-9_-]{1,100})\/withdraw$/);
      if (withdraw) {
        const raw = await readJson(request, response);
        if (raw === undefined) return "handled";
        const input = GalleryWithdrawalRequestSchema.safeParse(raw);
        if (!input.success) { sendError(response, 400, "INVALID_INPUT", "Indica un motivo para retirar el proyecto."); return "handled"; }
        const removed = academic.withdrawProject(withdraw[1]!, teacherId, input.data.reason);
        if (!removed) sendError(response, 409, "NOT_PUBLISHED", "El proyecto no está publicado o ya fue retirado.");
        else sendJson(response, 200, { ok: true, data: { withdrawn: true } });
        return "handled";
      }
      sendError(response, 404, "NOT_FOUND", "No se encontró la ruta docente.");
      return "handled";
    }

    return "unhandled";
  };
}

async function requireStudent(request: IncomingMessage, response: ServerResponse, auth?: FragmentsAuthService): Promise<{ id: string } | null> {
  if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso estudiantil no está habilitado."); return null; }
  try {
    const student = await auth.student(request);
    if (!student) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión con GitHub para continuar."); return null; }
    return student;
  } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión."); return null; }
}

async function requireTeacher(request: IncomingMessage, response: ServerResponse, auth?: FragmentsAuthService): Promise<string | null> {
  if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado."); return null; }
  try {
    const userId = await auth.userId(request);
    if (!userId) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión para continuar."); return null; }
    const teacherId = await auth.teacherId(request);
    if (!teacherId) { sendError(response, 403, "FORBIDDEN", "Esta acción requiere permisos docentes."); return null; }
    return teacherId;
  } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión docente."); return null; }
}

function readPage(search: URLSearchParams): { offset: number; limit: number } | null {
  const offsetRaw = search.get("offset") ?? "0";
  const limitRaw = search.get("limit") ?? "20";
  if (!/^\d{1,6}$/.test(offsetRaw) || !/^\d{1,2}$/.test(limitRaw)) return null;
  const offset = Number(offsetRaw); const limit = Number(limitRaw);
  if (offset > 100_000 || limit < 1 || limit > 50) return null;
  return { offset, limit };
}

function readOwnerToken(request: IncomingMessage): string | null {
  const match = (request.headers.cookie ?? "").match(/(?:^|;\s*)fragments_proposal_owner=([A-Za-z0-9_-]{32,128})(?:;|$)/);
  return match?.[1] ?? null;
}
function hashOwnerToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function safeAvatar(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "avatars.githubusercontent.com" ? url.toString() : null; }
  catch { return null; }
}

async function readJson(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  try {
    for await (const chunk of request) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 8 * 1024) { sendError(response, 413, "INVALID_INPUT", "La solicitud supera el tamaño permitido."); return undefined; }
    }
    return JSON.parse(raw);
  } catch { sendError(response, 400, "INVALID_INPUT", "La solicitud no contiene JSON válido."); return undefined; }
}
function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}
function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}
