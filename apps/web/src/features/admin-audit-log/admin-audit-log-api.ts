export const adminAuditEvents = ["admin.classroom_requests.read", "admin.queue_summary.read", "admin.audit_log.read", "admin.teachers.list"] as const;
export type AdminAuditEventName = (typeof adminAuditEvents)[number];
export type AdminAuditEvent = { requestId: string; event: AdminAuditEventName; occurredAt: string; actorType: "admin" };
export type AdminAuditLogResult = { ok: true; data: { events: AdminAuditEvent[] } } | { ok: false; error: { code: string; message: string } };
export type AdminAuditLogApi = { read(): Promise<AdminAuditLogResult> };

const eventNames = new Set<string>(adminAuditEvents);
const requestIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseEvent(value: unknown): AdminAuditEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (Object.keys(raw).length !== 4 || Object.keys(raw).some((key) => !["requestId", "event", "occurredAt", "actorType"].includes(key))) return null;
  if (typeof raw.requestId !== "string" || !requestIdPattern.test(raw.requestId)) return null;
  if (typeof raw.event !== "string" || !eventNames.has(raw.event)) return null;
  if (typeof raw.occurredAt !== "string" || Number.isNaN(Date.parse(raw.occurredAt))) return null;
  if (raw.actorType !== "admin") return null;
  return { requestId: raw.requestId, event: raw.event as AdminAuditEventName, occurredAt: raw.occurredAt, actorType: "admin" };
}

export function createAdminAuditLogApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminAuditLogApi {
  return {
    async read() {
      try {
        const response = await fetcher("/api/admin/audit-log?limit=50", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          return { ok: false, error: { code: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR", message: "No se pudo cargar el registro de actividad." } };
        }
        const data = (payload as Record<string, unknown>).data;
        if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).events)) return invalidResponse();
        const rawEvents = (data as { events: unknown[] }).events;
        if (rawEvents.length > 50) return invalidResponse();
        const events = rawEvents.map(parseEvent);
        if (events.some((event) => event === null)) return invalidResponse();
        return { ok: true, data: { events: events as AdminAuditEvent[] } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No se pudo cargar el registro de actividad." } };
      }
    },
  };
}

function invalidResponse(): AdminAuditLogResult {
  return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
}

export const adminAuditLogApi = createAdminAuditLogApi();
