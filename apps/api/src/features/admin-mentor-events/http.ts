import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AdminAuditSourceEvent } from "../admin-audit-log/store.js";
import type { MentorOperationalEvent } from "../mentor/operational-events.js";

type Store = { list(limit?: number): MentorOperationalEvent[] };
type AdminCheck = (request: IncomingMessage) => Promise<boolean | null>;
type Audit = {
  getActorId(request: IncomingMessage): Promise<string | null>;
  write(event: AdminAuditSourceEvent): Promise<void>;
  id?: () => string;
  now?: () => Date;
};

export function createAdminMentorEventsHttp(store: Store, isAdmin: AdminCheck, audit: Audit) {
  const newId = audit.id ?? randomUUID;
  const now = audit.now ?? (() => new Date());
  return async function handleAdminMentorEvents(request: IncomingMessage, response: ServerResponse): Promise<"handled" | "unhandled"> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/mentor-events") return "unhandled";

    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, "AUTH_UNAVAILABLE", "No se pudieron validar los permisos."); return "handled"; }
    if (allowed === null) { send(response, 401, "AUTH_REQUIRED", "Inicia sesión para continuar."); return "handled"; }
    if (!allowed) { send(response, 403, "FORBIDDEN", "No tienes permiso para consultar estos eventos."); return "handled"; }

    const rawLimit = url.searchParams.get("limit") ?? "50";
    if (url.searchParams.getAll("limit").length > 1 || !/^\d{1,2}$/.test(rawLimit) || Number(rawLimit) < 1 || Number(rawLimit) > 50) {
      send(response, 400, "INVALID_QUERY", "El límite solicitado debe estar entre 1 y 50.");
      return "handled";
    }

    let adminActorId: string | null;
    try { adminActorId = await audit.getActorId(request); }
    catch { adminActorId = null; }
    if (!adminActorId) { send(response, 503, "AUDIT_IDENTITY_UNAVAILABLE", "No se pudo registrar la consulta administrativa."); return "handled"; }
    const responseRequestId = response.getHeader("x-request-id");
    const requestId = typeof responseRequestId === "string" && responseRequestId.length > 0 ? responseRequestId : newId();
    try {
      await audit.write({ requestId, event: "admin.mentor_events.read", occurredAt: now().toISOString(), adminActorId });
    } catch {
      send(response, 503, "AUDIT_UNAVAILABLE", "No se pudo registrar la consulta administrativa.");
      return "handled";
    }

    try { sendSuccess(response, { events: store.list(Number(rawLimit)) }); }
    catch { send(response, 503, "EVENTS_UNAVAILABLE", "No se pudieron consultar los eventos de Mentor."); }
    return "handled";
  };
}

function send(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify({ ok: false, error: { code, message } }));
}

function sendSuccess(response: ServerResponse, data: { events: MentorOperationalEvent[] }): void {
  response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify({ ok: true, data }));
}
