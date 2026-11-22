import type { IncomingMessage, ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import type { AdminQueueSummary, AdminQueueSummaryStore } from "./repository.js";

export type AdminQueueSummaryCheck = (request: IncomingMessage) => Promise<boolean | null>;
export type AdminQueueAuditEvent = { requestId: string; event: "admin.queue_summary.read"; occurredAt: string; adminActorId: string };
export type AdminQueueAudit = {
  getActorId(request: IncomingMessage): Promise<string | null>;
  write(event: AdminQueueAuditEvent): void | Promise<void>;
  id?: () => string;
  now?: () => Date;
};
type RouteResult = "handled" | "unhandled";

export function createAdminQueueSummaryHttp(store: AdminQueueSummaryStore, isAdmin: AdminQueueSummaryCheck, audit: AdminQueueAudit) {
  const newId = audit.id ?? randomUUID;
  const now = audit.now ?? (() => new Date());
  return async function handleAdminQueueSummary(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/queue/summary") return "unhandled";
    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, { ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudieron validar los permisos." } }); return "handled"; }
    if (allowed === null) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
    if (!allowed) { send(response, 403, { ok: false, error: { code: "FORBIDDEN", message: "No tienes permiso para consultar el estado de la cola." } }); return "handled"; }
    let summary: AdminQueueSummary;
    try { summary = await store.read(); }
    catch { send(response, 503, { ok: false, error: { code: "QUEUE_UNAVAILABLE", message: "No se pudo consultar el estado de la cola." } }); return "handled"; }
    let adminActorId: string | null;
    try { adminActorId = await audit.getActorId(request); }
    catch { adminActorId = null; }
    if (!adminActorId) {
      send(response, 503, { ok: false, error: { code: "AUDIT_IDENTITY_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } });
      return "handled";
    }
    const serverRequestId = response.getHeader("x-request-id");
    const requestId = typeof serverRequestId === "string" && serverRequestId.length > 0 ? serverRequestId : newId();
    try { await audit.write({ requestId, event: "admin.queue_summary.read", occurredAt: now().toISOString(), adminActorId }); }
    catch { send(response, 503, { ok: false, error: { code: "AUDIT_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } }); return "handled"; }
    send(response, 200, { ok: true, data: summary });
    return "handled";
  };
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
