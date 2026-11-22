import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AdminAuditLogEntry, AdminAuditSourceEvent } from "./store.js";

export type AdminAuditLogStore = {
  write(event: AdminAuditSourceEvent): Promise<void>;
  listExcluding(requestId: string, limit?: number): AdminAuditLogEntry[];
};
export type AdminAuditLogCheck = (request: IncomingMessage) => Promise<boolean | null>;
export type AdminAuditLogAudit = {
  getActorId(request: IncomingMessage): Promise<string | null>;
  write(event: AdminAuditSourceEvent): Promise<void>;
  id?: () => string;
  now?: () => Date;
};
type RouteResult = "handled" | "unhandled";
const maxPageSize = 50;

export function createAdminAuditLogHttp(store: AdminAuditLogStore, isAdmin: AdminAuditLogCheck, audit: AdminAuditLogAudit) {
  const newId = audit.id ?? randomUUID;
  const now = audit.now ?? (() => new Date());
  return async function handleAdminAuditLog(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/audit-log") return "unhandled";

    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, { ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudieron validar los permisos." } }); return "handled"; }
    if (allowed === null) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
    if (!allowed) { send(response, 403, { ok: false, error: { code: "FORBIDDEN", message: "No tienes permiso para consultar el registro." } }); return "handled"; }

    const rawLimit = url.searchParams.get("limit") ?? "50";
    if (url.searchParams.getAll("limit").length > 1 || !/^\d{1,2}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > maxPageSize) {
      send(response, 400, { ok: false, error: { code: "INVALID_QUERY", message: "El límite solicitado debe estar entre 1 y 50." } });
      return "handled";
    }

    let adminActorId: string | null;
    try { adminActorId = await audit.getActorId(request); }
    catch { adminActorId = null; }
    if (!adminActorId) { send(response, 503, { ok: false, error: { code: "AUDIT_IDENTITY_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } }); return "handled"; }
    const serverRequestId = response.getHeader("x-request-id");
    const requestId = typeof serverRequestId === "string" && serverRequestId.length > 0 ? serverRequestId : newId();
    try {
      await audit.write({ requestId, event: "admin.audit_log.read", occurredAt: now().toISOString(), adminActorId });
    } catch {
      send(response, 503, { ok: false, error: { code: "AUDIT_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } });
      return "handled";
    }

    const events = store.listExcluding(requestId, Number(rawLimit));
    send(response, 200, { ok: true, data: { events } });
    return "handled";
  };
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
