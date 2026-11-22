export const reviewStages = ["repository", "snapshot_validation", "packing", "ai_dispatch", "analysis_validation", "result_persistence", "queue_claim", "queue_completion", "lease_heartbeat", "queue_poll"] as const;
export const reviewErrorCodes = ["GITHUB_NOT_FOUND", "GITHUB_ACCESS_DENIED", "GITHUB_RATE_LIMITED", "GITHUB_SERVER_ERROR", "GITHUB_UNAVAILABLE", "GITHUB_RESPONSE_INVALID", "SNAPSHOT_INVALID", "PACK_REJECTED", "PACK_RUNNER_FAILED", "AI_NOT_CONFIGURED", "AI_BUDGET_BLOCKED", "AI_GATEWAY_RATE_LIMITED", "AI_GATEWAY_UPSTREAM_UNAVAILABLE", "AI_OUTCOME_UNCERTAIN", "AI_OUTPUT_INVALID", "RESULT_PERSIST_FAILED", "REVIEW_UNCLASSIFIED", "REVIEW_LEASE_EXPIRED", "QUEUE_STORAGE_FAILED", "QUEUE_POLL_FAILED"] as const;
export const reviewEventNames = ["review.attempt.finished", "review.queue.poll_failed", "review.lease.recovered"] as const;
export const reviewStatuses = ["completed", "failed", "retry_wait", "lease_lost", "degraded"] as const;

export type ReviewOperationalEvent = {
  occurredAt: string;
  event: (typeof reviewEventNames)[number];
  reviewId: string | null;
  jobId: string | null;
  stage: (typeof reviewStages)[number];
  errorCode: (typeof reviewErrorCodes)[number] | null;
  durationMs: number;
  attempt: number;
  finalStatus: (typeof reviewStatuses)[number];
  gatewayFailure?: {
    gatewayHttpStatus: number | null;
    gatewayCode: string | null;
    gatewayGenerationId: string | null;
    providerHttpStatus: number | null;
    providerCode: string | null;
    retryAfterMs: number | null;
    providerDispatchPossible: boolean;
  };
};
export type AdminReviewEventsResult = { ok: true; data: { events: ReviewOperationalEvent[] } } | { ok: false; error: { code: string; message: string } };
export type AdminReviewEventsApi = { read(): Promise<AdminReviewEventsResult> };

const eventSet = new Set<string>(reviewEventNames);
const stageSet = new Set<string>(reviewStages);
const errorCodeSet = new Set<string>(reviewErrorCodes);
const statusSet = new Set<string>(reviewStatuses);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const gatewayCodeSet = new Set(["quota_for_entity_exceeded", "rate_limit_exceeded"]);
const providerCodeSet = new Set(["rate_limited", "rate_limit_exceeded", "upstream_unavailable", "overloaded", "server_error", "internal_server_error", "invalid_request_error", "authentication_error", "permission_error", "not_found_error", "insufficient_quota", "context_length_exceeded"]);

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parseGatewayFailure(value: unknown): ReviewOperationalEvent["gatewayFailure"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (!exactKeys(raw, ["gatewayHttpStatus", "gatewayCode", "gatewayGenerationId", "providerHttpStatus", "providerCode", "retryAfterMs", "providerDispatchPossible"])) return null;
  const validStatus = (status: unknown) => status === null || (typeof status === "number" && Number.isInteger(status) && status >= 100 && status <= 599);
  const validNullable = (field: unknown, allowed: Set<string>) => field === null || (typeof field === "string" && allowed.has(field));
  if (!validStatus(raw.gatewayHttpStatus) || !validStatus(raw.providerHttpStatus)) return null;
  if (!validNullable(raw.gatewayCode, gatewayCodeSet) || !validNullable(raw.providerCode, providerCodeSet)) return null;
  if (!(raw.gatewayGenerationId === null || (typeof raw.gatewayGenerationId === "string" && /^gen_[A-Za-z0-9]{16,64}$/.test(raw.gatewayGenerationId)))) return null;
  if (!(raw.retryAfterMs === null || (typeof raw.retryAfterMs === "number" && Number.isInteger(raw.retryAfterMs) && raw.retryAfterMs >= 0 && raw.retryAfterMs <= 86_400_000))) return null;
  if (typeof raw.providerDispatchPossible !== "boolean") return null;
  return raw as ReviewOperationalEvent["gatewayFailure"];
}

export function parseReviewOperationalEvent(value: unknown): ReviewOperationalEvent | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const keys = ["event", "reviewId", "jobId", "stage", "errorCode", "durationMs", "attempt", "finalStatus", "occurredAt"];
  if (!exactKeys(raw, Object.hasOwn(raw, "gatewayFailure") ? [...keys, "gatewayFailure"] : keys)) return null;
  if (typeof raw.event !== "string" || !eventSet.has(raw.event) || typeof raw.stage !== "string" || !stageSet.has(raw.stage)) return null;
  if (!(raw.errorCode === null || (typeof raw.errorCode === "string" && errorCodeSet.has(raw.errorCode)))) return null;
  if (typeof raw.finalStatus !== "string" || !statusSet.has(raw.finalStatus)) return null;
  if (typeof raw.occurredAt !== "string" || Number.isNaN(Date.parse(raw.occurredAt)) || new Date(raw.occurredAt).toISOString() !== raw.occurredAt) return null;
  if (!(raw.reviewId === null || (typeof raw.reviewId === "string" && uuidPattern.test(raw.reviewId)))) return null;
  if (!(raw.jobId === null || (typeof raw.jobId === "string" && uuidPattern.test(raw.jobId)))) return null;
  if (typeof raw.durationMs !== "number" || !Number.isInteger(raw.durationMs) || raw.durationMs < 0 || raw.durationMs > 86_400_000) return null;
  if (typeof raw.attempt !== "number" || !Number.isInteger(raw.attempt) || raw.attempt < 0 || raw.attempt > 1000) return null;
  const gatewayFailure = Object.hasOwn(raw, "gatewayFailure") ? parseGatewayFailure(raw.gatewayFailure) : undefined;
  if (gatewayFailure === null) return null;
  return {
    event: raw.event as ReviewOperationalEvent["event"], reviewId: raw.reviewId as string | null,
    jobId: raw.jobId as string | null, stage: raw.stage as ReviewOperationalEvent["stage"],
    errorCode: raw.errorCode as ReviewOperationalEvent["errorCode"], durationMs: raw.durationMs,
    attempt: raw.attempt, finalStatus: raw.finalStatus as ReviewOperationalEvent["finalStatus"],
    occurredAt: raw.occurredAt,
    ...(gatewayFailure ? { gatewayFailure } : {}),
  };
}

export function createAdminReviewEventsApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminReviewEventsApi {
  return {
    async read() {
      try {
        const response = await fetcher("/api/admin/review-events?limit=50", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          const code = response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR";
          return { ok: false, error: { code, message: "No se pudieron cargar los eventos de Review." } };
        }
        const data = (payload as Record<string, unknown>).data;
        if (!data || typeof data !== "object" || !Array.isArray((data as Record<string, unknown>).events)) return invalidResponse();
        const rawEvents = (data as { events: unknown[] }).events;
        if (rawEvents.length > 50) return invalidResponse();
        const events = rawEvents.map(parseReviewOperationalEvent);
        if (events.some((event) => event === null)) return invalidResponse();
        return { ok: true, data: { events: events as ReviewOperationalEvent[] } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No se pudieron cargar los eventos de Review." } };
      }
    },
  };
}

function invalidResponse(): AdminReviewEventsResult {
  return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
}

export const adminReviewEventsApi = createAdminReviewEventsApi();
