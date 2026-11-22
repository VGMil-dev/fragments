export const diagnosticMethods = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "OTHER"] as const;
export const diagnosticRouteFamilies = ["health", "auth", "classrooms", "assignments", "mentor", "review", "trainer", "inspector", "admin.diagnostics", "other"] as const;
export type DiagnosticMethod = (typeof diagnosticMethods)[number];
export type DiagnosticRouteFamily = (typeof diagnosticRouteFamilies)[number];
export type AdminRequestDiagnostic = {
  requestId: string;
  occurredAt: string;
  method: DiagnosticMethod;
  routeFamily: DiagnosticRouteFamily;
  statusCode: number;
  durationMs: number;
};
export type AdminDiagnosticsResult = { ok: true; data: { events: AdminRequestDiagnostic[] } } | { ok: false; error: { code: string; message: string } };
export type AdminDiagnosticsApi = { list: () => Promise<AdminDiagnosticsResult> };

const methods = new Set<string>(diagnosticMethods);
const families = new Set<string>(diagnosticRouteFamilies);

function parseEvent(value: unknown): AdminRequestDiagnostic | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (typeof raw.requestId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(raw.requestId)) return null;
  if (typeof raw.occurredAt !== "string" || Number.isNaN(Date.parse(raw.occurredAt))) return null;
  if (typeof raw.method !== "string" || !methods.has(raw.method)) return null;
  if (typeof raw.routeFamily !== "string" || !families.has(raw.routeFamily)) return null;
  if (!Number.isInteger(raw.statusCode) || (raw.statusCode as number) < 100 || (raw.statusCode as number) > 599) return null;
  if (!Number.isInteger(raw.durationMs) || (raw.durationMs as number) < 0) return null;
  return {
    requestId: raw.requestId,
    occurredAt: raw.occurredAt,
    method: raw.method as DiagnosticMethod,
    routeFamily: raw.routeFamily as DiagnosticRouteFamily,
    statusCode: raw.statusCode as number,
    durationMs: raw.durationMs as number,
  };
}

export function createAdminDiagnosticsApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminDiagnosticsApi {
  return {
    async list(): Promise<AdminDiagnosticsResult> {
      try {
        const response = await fetcher("/api/admin/diagnostics/requests?limit=50", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          return { ok: false, error: { code: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR", message: "No pudimos cargar los diagnósticos." } };
        }
        const data = (payload as Record<string, unknown>).data;
        if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).events)) return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
        const rawEvents = (data as { events: unknown[] }).events;
        if (rawEvents.length > 50) return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
        const events = rawEvents.map(parseEvent);
        if (events.some((event) => event === null)) return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
        return { ok: true, data: { events: events as AdminRequestDiagnostic[] } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No pudimos cargar los diagnósticos." } };
      }
    },
  };
}

export const adminDiagnosticsApi = createAdminDiagnosticsApi();
