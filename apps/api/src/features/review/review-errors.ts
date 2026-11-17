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
  | "AI_OUTCOME_UNCERTAIN"
  | "AI_OUTPUT_INVALID"
  | "RESULT_PERSIST_FAILED"
  | "REVIEW_UNCLASSIFIED"
  | "REVIEW_LEASE_EXPIRED"
  | "QUEUE_STORAGE_FAILED"
  | "QUEUE_POLL_FAILED";

export type ReviewFailure = {
  stage: ReviewStage;
  errorCode: ReviewErrorCode;
  retryClass: ReviewRetryClass;
  durationMs: number;
};

export class ReviewProcessingError extends Error {
  readonly stage: ReviewStage;
  readonly errorCode: ReviewErrorCode;
  readonly retryClass: ReviewRetryClass;

  constructor(stage: ReviewStage, errorCode: ReviewErrorCode, retryClass: ReviewRetryClass) {
    super("La revisión no pudo completar una etapa interna.");
    this.name = "ReviewProcessingError";
    this.stage = stage;
    this.errorCode = errorCode;
    this.retryClass = retryClass;
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
    return { stage: error.stage, errorCode: error.errorCode, retryClass: error.retryClass, durationMs };
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
};

/** Emit only allowlisted diagnostic fields; never serialize errors or job payloads. */
export function writeReviewOperationalEvent(event: ReviewOperationalEvent): void {
  process.stdout.write(`${JSON.stringify(event)}\n`);
}
