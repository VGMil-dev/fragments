export type ReviewStage =
  | "repository"
  | "snapshot_validation"
  | "packing"
  | "ai_dispatch"
  | "analysis_validation"
  | "result_persistence"
  | "queue_claim"
  | "queue_completion"
  | "lease_heartbeat"
  | "queue_poll";

export type ReviewRetryClass = "transient" | "permanent" | "manual";

export type ReviewErrorCode =
  | "GITHUB_NOT_FOUND"
  | "GITHUB_ACCESS_DENIED"
  | "GITHUB_RATE_LIMITED"
  | "GITHUB_SERVER_ERROR"
  | "GITHUB_UNAVAILABLE"
  | "GITHUB_RESPONSE_INVALID"
  | "SNAPSHOT_INVALID"
  | "PACK_REJECTED"
  | "PACK_RUNNER_FAILED"
  | "AI_NOT_CONFIGURED"
  | "AI_BUDGET_BLOCKED"
  | "AI_GATEWAY_RATE_LIMITED"
  | "AI_GATEWAY_UPSTREAM_UNAVAILABLE"
  | "AI_OUTCOME_UNCERTAIN"
  | "AI_OUTPUT_INVALID"
  | "RESULT_PERSIST_FAILED"
  | "REVIEW_UNCLASSIFIED"
  | "REVIEW_LEASE_EXPIRED"
  | "QUEUE_STORAGE_FAILED"
  | "QUEUE_POLL_FAILED";

export type GatewayFailureSummary = {
  gatewayHttpStatus: number | null;
  gatewayCode: string | null;
  gatewayGenerationId: string | null;
  providerHttpStatus: number | null;
  providerCode: string | null;
  retryAfterMs: number | null;
  providerDispatchPossible: boolean;
};

export type ReviewFailure = {
  stage: ReviewStage;
  errorCode: ReviewErrorCode;
  retryClass: ReviewRetryClass;
  durationMs: number;
  gatewayFailure?: GatewayFailureSummary;
};

export class ReviewProcessingError extends Error {
  readonly stage: ReviewStage;
  readonly errorCode: ReviewErrorCode;
  readonly retryClass: ReviewRetryClass;
  readonly gatewayFailure: GatewayFailureSummary | undefined;

  constructor(stage: ReviewStage, errorCode: ReviewErrorCode, retryClass: ReviewRetryClass, gatewayFailure?: GatewayFailureSummary) {
    super("La revisión no pudo completar una etapa interna.");
    this.name = "ReviewProcessingError";
    this.stage = stage;
    this.errorCode = errorCode;
    this.retryClass = retryClass;
    this.gatewayFailure = gatewayFailure;
  }
}

const stageFallback: Record<ReviewStage, ReviewErrorCode> = {
  repository: "GITHUB_UNAVAILABLE",
  snapshot_validation: "SNAPSHOT_INVALID",
  packing: "PACK_RUNNER_FAILED",
  ai_dispatch: "AI_OUTCOME_UNCERTAIN",
  analysis_validation: "AI_OUTPUT_INVALID",
  result_persistence: "RESULT_PERSIST_FAILED",
  queue_claim: "QUEUE_STORAGE_FAILED",
  queue_completion: "QUEUE_STORAGE_FAILED",
  lease_heartbeat: "REVIEW_LEASE_EXPIRED",
  queue_poll: "QUEUE_POLL_FAILED",
};

export function reviewFailure(error: unknown, fallbackStage: ReviewStage, durationMs: number): ReviewFailure {
  if (error instanceof ReviewProcessingError) {
    return {
      stage: error.stage, errorCode: error.errorCode, retryClass: error.retryClass, durationMs,
      ...(error.gatewayFailure ? { gatewayFailure: error.gatewayFailure } : {}),
    };
  }
  return { stage: fallbackStage, errorCode: stageFallback[fallbackStage], retryClass: "manual", durationMs };
}

export type ReviewOperationalEvent = {
  event: "review.attempt.finished" | "review.queue.poll_failed" | "review.lease.recovered";
  reviewId: string | null;
  jobId: string | null;
  stage: ReviewStage;
  errorCode: ReviewErrorCode | null;
  durationMs: number;
  attempt: number;
  finalStatus: "completed" | "failed" | "retry_wait" | "lease_lost" | "degraded";
  gatewayFailure?: GatewayFailureSummary;
};

const reviewStages = new Set<ReviewStage>([
  "repository", "snapshot_validation", "packing", "ai_dispatch", "analysis_validation",
  "result_persistence", "queue_claim", "queue_completion", "lease_heartbeat", "queue_poll",
]);
const reviewErrorCodes = new Set<ReviewErrorCode>([
  "GITHUB_NOT_FOUND", "GITHUB_ACCESS_DENIED", "GITHUB_RATE_LIMITED", "GITHUB_SERVER_ERROR", "GITHUB_UNAVAILABLE",
  "GITHUB_RESPONSE_INVALID", "SNAPSHOT_INVALID", "PACK_REJECTED", "PACK_RUNNER_FAILED", "AI_NOT_CONFIGURED",
  "AI_BUDGET_BLOCKED", "AI_GATEWAY_RATE_LIMITED", "AI_GATEWAY_UPSTREAM_UNAVAILABLE", "AI_OUTCOME_UNCERTAIN",
  "AI_OUTPUT_INVALID", "RESULT_PERSIST_FAILED", "REVIEW_UNCLASSIFIED", "REVIEW_LEASE_EXPIRED",
  "QUEUE_STORAGE_FAILED", "QUEUE_POLL_FAILED",
]);
const reviewEventNames = new Set<ReviewOperationalEvent["event"]>([
  "review.attempt.finished", "review.queue.poll_failed", "review.lease.recovered",
]);
const reviewStatuses = new Set<ReviewOperationalEvent["finalStatus"]>([
  "completed", "failed", "retry_wait", "lease_lost", "degraded",
]);
const safeIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const safeGatewayGenerationIdPattern = /^gen_[A-Za-z0-9]{16,64}$/;
const safeGatewayCodes = new Set(["quota_for_entity_exceeded", "rate_limit_exceeded"]);
const safeProviderCodes = new Set([
  "rate_limited", "rate_limit_exceeded", "upstream_unavailable", "overloaded", "server_error",
  "internal_server_error", "invalid_request_error", "authentication_error", "permission_error",
  "not_found_error", "insufficient_quota", "context_length_exceeded",
]);

type OperationalWriter = (line: string) => unknown;

function writeToStdout(line: string): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      process.stdout.off("error", finish);
      resolve();
    };
    process.stdout.once("error", finish);
    try { process.stdout.write(`${line}\n`, finish); } catch { finish(); }
  });
}

/** Emit a bounded diagnostic projection; never serialize errors or job payloads. */
export function writeReviewOperationalEvent(event: ReviewOperationalEvent, write: OperationalWriter = writeToStdout): void {
  const safeEvent = safeOperationalProjection(event);
  if (!safeEvent) return;
  try {
    const result = write(JSON.stringify(safeEvent));
    if (result && typeof (result as PromiseLike<unknown>).then === "function") {
      void Promise.resolve(result).catch(() => { /* Operational logging must not change queue work results. */ });
    }
  } catch { /* Operational logging must not change queue work results. */ }
}

function safeOperationalProjection(input: ReviewOperationalEvent): ReviewOperationalEvent | null {
  if (!input || typeof input !== "object" || !reviewEventNames.has(input.event)
    || !reviewStages.has(input.stage) || !reviewStatuses.has(input.finalStatus)
    || (input.errorCode !== null && !reviewErrorCodes.has(input.errorCode))) return null;

  const gatewayFailure = safeGatewayFailure(input.gatewayFailure);
  const event: ReviewOperationalEvent = {
    event: input.event,
    reviewId: safeReviewId(input.reviewId),
    jobId: safeReviewId(input.jobId),
    stage: input.stage,
    errorCode: input.errorCode,
    durationMs: safeInteger(input.durationMs, 0, 86_400_000),
    attempt: safeInteger(input.attempt, 0, 1000),
    finalStatus: input.finalStatus,
    ...(gatewayFailure ? { gatewayFailure } : {}),
  };
  return event;
}

function safeReviewId(value: unknown): string | null {
  return typeof value === "string" && safeIdPattern.test(value) ? value : null;
}

function safeInteger(value: unknown, minimum: number, maximum: number): number {
  return typeof value === "number" && Number.isSafeInteger(value) ? Math.max(minimum, Math.min(maximum, value)) : 0;
}

function safeGatewayFailure(value: GatewayFailureSummary | undefined): GatewayFailureSummary | undefined {
  if (!value || typeof value !== "object") return undefined;
  const status = (input: unknown): number | null => typeof input === "number" && Number.isInteger(input) && input >= 100 && input <= 599 ? input : null;
  const gatewayCode = (input: unknown): string | null => typeof input === "string" && safeGatewayCodes.has(input) ? input : null;
  const providerCode = (input: unknown): string | null => typeof input === "string" && safeProviderCodes.has(input) ? input : null;
  const generationId = typeof value.gatewayGenerationId === "string" && safeGatewayGenerationIdPattern.test(value.gatewayGenerationId)
    ? value.gatewayGenerationId
    : null;
  return {
    gatewayHttpStatus: status(value.gatewayHttpStatus),
    gatewayCode: gatewayCode(value.gatewayCode),
    gatewayGenerationId: generationId,
    providerHttpStatus: status(value.providerHttpStatus),
    providerCode: providerCode(value.providerCode),
    retryAfterMs: typeof value.retryAfterMs === "number" && Number.isSafeInteger(value.retryAfterMs)
      ? Math.max(0, Math.min(86_400_000, value.retryAfterMs))
      : null,
    providerDispatchPossible: value.providerDispatchPossible === true,
  };
}
