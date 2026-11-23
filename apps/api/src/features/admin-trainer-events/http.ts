import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AdminAuditSourceEvent } from "../admin-audit-log/store.js";
import type { TrainerOperationalEvent } from "../trainer/operational-events.js";

type Store = { list(limit?: number): TrainerOperationalEvent[] | Promise<TrainerOperationalEvent[]> };
type Audit = { getActorId(request: IncomingMessage): Promise<string | null>; write(event: AdminAuditSourceEvent): Promise<void>; id?: () => string; now?: () => Date };
export function createAdminTrainerEventsHttp(store: Store, isAdmin: (request: IncomingMessage) => Promise<boolean | null>, audit: Audit) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<"handled" | "unhandled"> => {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/trainer-events") return "unhandled";
    let allowed: boolean | null;
    try { allowed = await isAdmin(request); } catch { return send(response, 503, "AUTH_UNAVAILABLE"); }
    if (allowed === null) return send(response, 401, "AUTH_REQUIRED");
    if (!allowed) return send(response, 403, "FORBIDDEN");
    const raw = url.searchParams.get("limit") ?? "50";
    if (url.searchParams.getAll("limit").length > 1 || !/^\d{1,2}$/.test(raw) || Number(raw) < 1 || Number(raw) > 50) return send(response, 400, "INVALID_QUERY");
    let actor: string | null;
    try { actor = await audit.getActorId(request); } catch { actor = null; }
    if (!actor) return send(response, 503, "AUDIT_IDENTITY_UNAVAILABLE");
    const requestId = response.getHeader("x-request-id");
    try { await audit.write({ requestId: typeof requestId === "string" && requestId ? requestId : (audit.id ?? randomUUID)(), event: "admin.trainer_events.read", occurredAt: (audit.now ?? (() => new Date()))().toISOString(), adminActorId: actor }); }
    catch { return send(response, 503, "AUDIT_UNAVAILABLE"); }
    let events: TrainerOperationalEvent[];
    try { events = await store.list(Number(raw)); }
    catch { return send(response, 503, "EVENTS_UNAVAILABLE"); }
    try {
      response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
      response.end(JSON.stringify({ ok: true, data: { events } }));
    } catch { return "handled"; }
    return "handled";
  };
}
function send(response: ServerResponse, status: number, code: string): "handled" {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  const messages: Record<string, string> = {
    AUTH_UNAVAILABLE: "No se pudieron validar los permisos.", AUTH_REQUIRED: "Inicia sesión para continuar.", FORBIDDEN: "No tienes permiso para consultar estos eventos.",
    INVALID_QUERY: "El límite solicitado debe estar entre 1 y 50.", AUDIT_IDENTITY_UNAVAILABLE: "No se pudo registrar la consulta administrativa.",
    AUDIT_UNAVAILABLE: "No se pudo registrar la consulta administrativa.", EVENTS_UNAVAILABLE: "No se pudieron consultar los eventos de Trainer.",
  };
  response.end(JSON.stringify({ ok: false, error: { code, message: messages[code] ?? "No se pudo completar la consulta." } }));
  return "handled";
}
