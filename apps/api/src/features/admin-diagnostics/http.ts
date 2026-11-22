import type { IncomingMessage, ServerResponse } from "node:http";
import type { RequestDiagnosticEvent } from "./diagnostics.js";
import { REQUEST_DIAGNOSTICS_MAX_PAGE_SIZE } from "./diagnostics.js";

export type AdminDiagnosticsStore = { list(limit?: number): RequestDiagnosticEvent[] };
export type AdminCheck = (request: IncomingMessage) => Promise<boolean | null>;
type RouteResult = "handled" | "unhandled";

export function createAdminDiagnosticsHttp(store: AdminDiagnosticsStore, isAdmin: AdminCheck) {
  return async function handleAdminDiagnostics(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/diagnostics/requests") return "unhandled";

    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, { ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudieron validar los permisos." } }); return "handled"; }
    if (allowed === null) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
    if (!allowed) { send(response, 403, { ok: false, error: { code: "FORBIDDEN", message: "No tienes permiso para consultar diagnósticos." } }); return "handled"; }

    const rawLimit = url.searchParams.get("limit");
    if (rawLimit !== null && !/^\d{1,3}$/.test(rawLimit)) {
      send(response, 400, { ok: false, error: { code: "INVALID_QUERY", message: "Revisa el límite solicitado." } });
      return "handled";
    }
    const requested = rawLimit === null ? REQUEST_DIAGNOSTICS_MAX_PAGE_SIZE : Number(rawLimit);
    const limit = Math.max(1, Math.min(REQUEST_DIAGNOSTICS_MAX_PAGE_SIZE, requested));
    send(response, 200, { ok: true, data: { events: store.list(limit) } });
    return "handled";
  };
}

function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
