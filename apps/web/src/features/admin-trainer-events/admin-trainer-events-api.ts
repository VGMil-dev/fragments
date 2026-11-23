import type { AdminTrainerEventsApi, TrainerOperationalEvent } from "./admin-trainer-events-types.js";

const allowed = new Set(["trainer.attempt.finished", "trainer.attempt.failed"]);
export function createAdminTrainerEventsApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminTrainerEventsApi {
  return { async read() {
    try {
      const response = await fetcher("/api/admin/trainer-events?limit=50", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) return { ok: false, error: { code: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR" } };
      const data = (payload as Record<string, unknown>).data;
      if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).events)) return invalid();
      const events = (data as { events: unknown[] }).events;
      if (events.length > 50 || events.some((item) => !valid(item))) return invalid();
      return { ok: true, data: { events: events as TrainerOperationalEvent[] } };
    } catch { return { ok: false, error: { code: "NETWORK_ERROR" } }; }
  } };
}
function valid(value: unknown): value is TrainerOperationalEvent {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const event = value as Record<string, unknown>;
  return Object.keys(event).length === 6 && ["event", "stage", "result", "error_code", "duration_ms", "occurredAt"].every((key) => Object.hasOwn(event, key))
    && typeof event.event === "string" && allowed.has(event.event) && event.stage === "attempt_record"
    && (event.result === "success" || event.result === "failure")
    && (event.error_code === "none" || event.error_code === "attempt_failed")
    && ((event.result === "success") === (event.error_code === "none"))
    && typeof event.duration_ms === "number" && Number.isInteger(event.duration_ms) && event.duration_ms >= 0 && event.duration_ms <= 300_000
    && typeof event.occurredAt === "string" && !Number.isNaN(Date.parse(event.occurredAt)) && new Date(event.occurredAt).toISOString() === event.occurredAt;
}
function invalid() { return { ok: false as const, error: { code: "INVALID_RESPONSE" } }; }
export const adminTrainerEventsApi = createAdminTrainerEventsApi();
