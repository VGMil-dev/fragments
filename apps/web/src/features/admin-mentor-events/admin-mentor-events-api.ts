export type MentorOperationalEvent = {
  event: "mentor_evaluation_completed" | "mentor_evaluation_failed";
  stage: "configuration" | "input_validation" | "budget_reservation" | "budget_settlement" | "provider_request" | "provider_response" | "response_validation" | "evaluation";
  result: "success" | "failure";
  error_code: "none" | "evaluation_failed" | "invalid_input" | "configuration_unavailable" | "budget_unavailable" | "budget_exceeded" | "budget_settlement_failed" | "provider_response_invalid" | "response_validation_failed";
  duration_ms: number;
  occurred_at: string;
};

export type AdminMentorEventsResult = { ok: true; data: { events: MentorOperationalEvent[] } } | { ok: false; error: { code: string; message: string } };
export type AdminMentorEventsApi = { read(): Promise<AdminMentorEventsResult> };

const allowedEvents = new Set<MentorOperationalEvent["event"]>(["mentor_evaluation_completed", "mentor_evaluation_failed"]);
const allowedStages = new Set<MentorOperationalEvent["stage"]>(["configuration", "input_validation", "budget_reservation", "budget_settlement", "provider_request", "provider_response", "response_validation", "evaluation"]);
const allowedCodes = new Set<MentorOperationalEvent["error_code"]>(["none", "evaluation_failed", "invalid_input", "configuration_unavailable", "budget_unavailable", "budget_exceeded", "budget_settlement_failed", "provider_response_invalid", "response_validation_failed"]);

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function parseMentorOperationalEvent(value: unknown): MentorOperationalEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, ["event", "stage", "result", "error_code", "duration_ms", "occurred_at"])) return null;
  if (typeof raw.event !== "string" || !allowedEvents.has(raw.event as MentorOperationalEvent["event"])) return null;
  if (typeof raw.stage !== "string" || !allowedStages.has(raw.stage as MentorOperationalEvent["stage"])) return null;
  if (typeof raw.result !== "string" || (raw.result !== "success" && raw.result !== "failure")) return null;
  if (typeof raw.error_code !== "string" || !allowedCodes.has(raw.error_code as MentorOperationalEvent["error_code"])) return null;
  if ((raw.result === "success") !== (raw.event === "mentor_evaluation_completed")) return null;
  if ((raw.result === "success") !== (raw.error_code === "none")) return null;
  if (typeof raw.duration_ms !== "number" || !Number.isInteger(raw.duration_ms) || raw.duration_ms < 0 || raw.duration_ms > 300_000) return null;
  if (typeof raw.occurred_at !== "string" || Number.isNaN(Date.parse(raw.occurred_at)) || new Date(raw.occurred_at).toISOString() !== raw.occurred_at) return null;
  return {
    event: raw.event as MentorOperationalEvent["event"], stage: raw.stage as MentorOperationalEvent["stage"],
    result: raw.result as MentorOperationalEvent["result"], error_code: raw.error_code as MentorOperationalEvent["error_code"],
    duration_ms: raw.duration_ms, occurred_at: raw.occurred_at,
  };
}

export function createAdminMentorEventsApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminMentorEventsApi {
  return {
    async read() {
      try {
        const response = await fetcher("/api/admin/mentor-events?limit=50", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          const code = response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR";
          return { ok: false, error: { code, message: "No se pudieron cargar los eventos de Mentor." } };
        }
        const data = (payload as Record<string, unknown>).data;
        if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).events)) return invalidResponse();
        const rawEvents = (data as { events: unknown[] }).events;
        if (rawEvents.length > 50) return invalidResponse();
        const events = rawEvents.map(parseMentorOperationalEvent);
        if (events.some((event) => event === null)) return invalidResponse();
        return { ok: true, data: { events: events as MentorOperationalEvent[] } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No se pudieron cargar los eventos de Mentor." } };
      }
    },
  };
}

function invalidResponse(): AdminMentorEventsResult {
  return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
}

export const adminMentorEventsApi = createAdminMentorEventsApi();
