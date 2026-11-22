import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { adminEnrollmentStatuses, type AdminEnrollmentRequestPage, type AdminRequestListQuery, type AdminEnrollmentStatus } from "./repository.js";

export type AdminClassroomRequestsStore = { list(query: AdminRequestListQuery): Promise<AdminEnrollmentRequestPage> };
export type AdminClassroomRequestsCheck = (request: IncomingMessage) => Promise<boolean | null>;
export type AdminClassroomRequestsAuditEvent = { requestId: string; event: "admin.classroom_requests.read"; occurredAt: string; adminActorId: string };
export type AdminClassroomRequestsAudit = {
  getActorId(request: IncomingMessage): Promise<string | null>;
  write(event: AdminClassroomRequestsAuditEvent): void | Promise<void>;
  id?: () => string;
  now?: () => Date;
};
type RouteResult = "handled" | "unhandled";
const maxPageSize = 50;
const maxOffset = 100_000;

export function createAdminClassroomRequestsHttp(store: AdminClassroomRequestsStore, isAdmin: AdminClassroomRequestsCheck, audit: AdminClassroomRequestsAudit) {
  const newId = audit.id ?? randomUUID;
  const now = audit.now ?? (() => new Date());
  return async function handleAdminClassroomRequests(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/classroom-requests") return "unhandled";

    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, { ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudieron validar los permisos." } }); return "handled"; }
    if (allowed === null) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
    if (!allowed) { send(response, 403, { ok: false, error: { code: "FORBIDDEN", message: "No tienes permiso para consultar solicitudes académicas." } }); return "handled"; }

    const rawLimit = url.searchParams.get("limit") ?? "50";
    const rawOffset = url.searchParams.get("offset") ?? "0";
    const rawStatus = url.searchParams.get("status");
    if (!/^\d{1,3}$/.test(rawLimit) || !/^\d{1,6}$/.test(rawOffset)) {
      send(response, 400, { ok: false, error: { code: "INVALID_QUERY", message: "Revisa los límites de la página solicitada." } });
      return "handled";
    }
    if (rawStatus !== null && !(adminEnrollmentStatuses as readonly string[]).includes(rawStatus)) {
      send(response, 400, { ok: false, error: { code: "INVALID_STATUS", message: "El filtro de estado no es válido." } });
      return "handled";
    }
    const limit = Math.max(1, Math.min(maxPageSize, Number(rawLimit)));
    const offset = Number(rawOffset);
    if (offset > maxOffset) {
      send(response, 400, { ok: false, error: { code: "INVALID_QUERY", message: "El desplazamiento supera el máximo permitido." } });
      return "handled";
    }
    const status = rawStatus as AdminEnrollmentStatus | null;
    let result: AdminEnrollmentRequestPage;
    try { result = await store.list({ limit, offset, ...(status ? { status } : {}) }); }
    catch {
      send(response, 500, { ok: false, error: { code: "READ_FAILED", message: "No se pudieron cargar las solicitudes académicas." } });
      return "handled";
    }
    let adminActorId: string | null;
    try { adminActorId = await audit.getActorId(request); }
    catch { adminActorId = null; }
    if (!adminActorId) {
      send(response, 503, { ok: false, error: { code: "AUDIT_IDENTITY_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } });
      return "handled";
    }
    const serverRequestId = response.getHeader("x-request-id");
    const requestId = typeof serverRequestId === "string" && serverRequestId.length > 0 ? serverRequestId : newId();
    try {
      await audit.write({ requestId, event: "admin.classroom_requests.read", occurredAt: now().toISOString(), adminActorId });
    } catch {
      send(response, 503, { ok: false, error: { code: "AUDIT_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } });
      return "handled";
    }
    send(response, 200, { ok: true, data: { ...result, limit, offset, status } });
    return "handled";
  };
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
