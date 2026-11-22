import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AdminTeacherPage, AdminTeachersQuery } from "./service.js";
import { parseAdminTeachersQuery } from "./service.js";

export type AdminTeachersStore = { list(query: AdminTeachersQuery): Promise<AdminTeacherPage> };
export type AdminTeachersCheck = (request: IncomingMessage) => Promise<boolean | null>;
export type AdminTeachersAuditEvent = { requestId: string; event: "admin.teachers.list"; occurredAt: string; adminActorId: string };
export type AdminTeachersAudit = {
  getActorId(request: IncomingMessage): Promise<string | null>;
  write(event: AdminTeachersAuditEvent): void | Promise<void>;
  id?: () => string;
  now?: () => Date;
};
type RouteResult = "handled" | "unhandled";

export function createAdminTeachersHttp(store: AdminTeachersStore, isAdmin: AdminTeachersCheck, audit: AdminTeachersAudit) {
  const newId = audit.id ?? randomUUID;
  const now = audit.now ?? (() => new Date());
  return async function handleAdminTeachers(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/teachers") return "unhandled";

    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, { ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudieron validar los permisos." } }); return "handled"; }
    if (allowed === null) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
    if (!allowed) { send(response, 403, { ok: false, error: { code: "FORBIDDEN", message: "No tienes permiso para consultar cuentas docentes." } }); return "handled"; }

    const parsed = parseAdminTeachersQuery(url.searchParams);
    if (!parsed.ok) { send(response, 400, { ok: false, error: { code: "INVALID_QUERY", message: "Revisa el filtro solicitado." } }); return "handled"; }

    let adminActorId: string | null;
    try { adminActorId = await audit.getActorId(request); }
    catch { adminActorId = null; }
    if (!adminActorId) { send(response, 503, { ok: false, error: { code: "AUDIT_IDENTITY_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } }); return "handled"; }

    const serverRequestId = response.getHeader("x-request-id");
    const requestId = typeof serverRequestId === "string" && serverRequestId.length > 0 ? serverRequestId : newId();
    try { await audit.write({ requestId, event: "admin.teachers.list", occurredAt: now().toISOString(), adminActorId }); }
    catch { send(response, 503, { ok: false, error: { code: "AUDIT_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } }); return "handled"; }

    try {
      const data = await store.list(parsed.value);
      send(response, 200, { ok: true, data });
    } catch {
      send(response, 503, { ok: false, error: { code: "DIRECTORY_UNAVAILABLE", message: "No se pudieron consultar las cuentas docentes." } });
    }
    return "handled";
  };
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
