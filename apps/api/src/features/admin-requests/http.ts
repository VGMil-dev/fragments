import type { IncomingMessage, ServerResponse } from "node:http";
import { adminEnrollmentStatuses, type AdminEnrollmentRequestPage, type AdminRequestListQuery, type AdminEnrollmentStatus } from "./repository.js";

export type AdminClassroomRequestsStore = { list(query: AdminRequestListQuery): Promise<AdminEnrollmentRequestPage> };
export type AdminClassroomRequestsCheck = (request: IncomingMessage) => Promise<boolean | null>;
type RouteResult = "handled" | "unhandled";
const maxPageSize = 50;
const maxOffset = 100_000;

export function createAdminClassroomRequestsHttp(store: AdminClassroomRequestsStore, isAdmin: AdminClassroomRequestsCheck) {
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
    try {
      const result = await store.list({ limit, offset, ...(status ? { status } : {}) });
      send(response, 200, { ok: true, data: { ...result, limit, offset, status } });
    } catch {
      send(response, 500, { ok: false, error: { code: "READ_FAILED", message: "No se pudieron cargar las solicitudes académicas." } });
    }
    return "handled";
  };
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
