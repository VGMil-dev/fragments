import type { ReviewRequest } from "@fragments/contracts";
import type { ReviewContext, createReviewService } from "./review.service.js";
import type { createPrismaReviewStore } from "./prisma-store.js";
import { reviewFailure, ReviewProcessingError, writeReviewOperationalEvent, type ReviewOperationalEvent, type ReviewStage } from "./review-errors.js";

type Store = ReturnType<typeof createPrismaReviewStore>;
type Service = ReturnType<typeof createReviewService>;

export type ReviewWorkerOptions = {
  store: Store;
  service: Service;
  workerId: string;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
  now?: () => number;
  logEvent?: (event: ReviewOperationalEvent) => void;
};

/** One leased review job per call; the caller owns the long-running polling loop. */
export function createReviewWorker(options: ReviewWorkerOptions) {
  const leaseDurationMs = options.leaseDurationMs ?? 30_000;
  if (!Number.isSafeInteger(leaseDurationMs) || leaseDurationMs < 3) throw new Error("La duración del lease debe ser de al menos 3 ms.");
  const heartbeatIntervalMs = options.heartbeatIntervalMs ?? Math.max(1, Math.floor(leaseDurationMs / 3));
  if (!Number.isSafeInteger(heartbeatIntervalMs) || heartbeatIntervalMs < 1 || heartbeatIntervalMs >= leaseDurationMs) {
    throw new Error("El intervalo heartbeat debe ser menor que la duración del lease.");
  }
  const now = options.now ?? Date.now;
  const logEvent = options.logEvent ?? writeReviewOperationalEvent;

  return {
    async runOnce(): Promise<boolean> {
      const recovered = await options.store.reconcileExpiredLeases(now());
      for (const result of recovered) {
        logEvent({
          event: "review.lease.recovered", reviewId: result.id, jobId: result.id, stage: result.stage,
          errorCode: result.errorCode as ReviewOperationalEvent["errorCode"], durationMs: result.durationMs,
          attempt: result.attempt, finalStatus: result.finalStatus,
        });
      }
      const startedAt = now();
      let job;
      try {
        job = await options.store.claim(options.workerId, startedAt, leaseDurationMs);
      } catch {
        throw new ReviewProcessingError("queue_claim", "QUEUE_STORAGE_FAILED", "manual");
      }
      if (!job) return false;

      const controller = new AbortController();
      let leaseLost = false;
      let stage: ReviewStage = "repository";
      let leaseErrorCode: ReviewOperationalEvent["errorCode"] = "REVIEW_LEASE_EXPIRED";
      let heartbeatRunning = false;
      const heartbeat = setInterval(() => {
        if (heartbeatRunning) return;
        heartbeatRunning = true;
        void (async () => {
          try {
            if (await options.store.heartbeat(job.id, options.workerId, now(), leaseDurationMs)) return;
            leaseLost = true;
            controller.abort(new Error("La reserva del trabajo Review expiró."));
          } catch {
            leaseLost = true;
            leaseErrorCode = "QUEUE_STORAGE_FAILED";
            controller.abort(new Error("No se pudo renovar la reserva del trabajo Review."));
          } finally { heartbeatRunning = false; }
        })();
      }, heartbeatIntervalMs);
      heartbeat.unref?.();

      try {
        const result = await options.service.review(job.request satisfies ReviewRequest, job.context satisfies ReviewContext, {
          signal: controller.signal, reviewId: job.id, leaseOwner: options.workerId,
          async onStage(nextStage) {
            stage = nextStage;
            try {
              if (await options.store.setStage(job.id, options.workerId, nextStage, now())) return;
              leaseLost = true;
              leaseErrorCode = "REVIEW_LEASE_EXPIRED";
              throw new ReviewProcessingError("lease_heartbeat", "REVIEW_LEASE_EXPIRED", "manual");
            } catch (error) {
              if (error instanceof ReviewProcessingError) throw error;
              leaseLost = true;
              leaseErrorCode = "QUEUE_STORAGE_FAILED";
              throw new ReviewProcessingError("lease_heartbeat", "QUEUE_STORAGE_FAILED", "manual");
            }
          },
        });
        if (result.status !== "completed") throw new ReviewProcessingError("analysis_validation", "AI_OUTPUT_INVALID", "manual");
        if (!await options.store.complete(job.id, options.workerId, now())) {
          logEvent({ event: "review.attempt.finished", reviewId: job.id, jobId: job.id, stage: "queue_completion", errorCode: "REVIEW_LEASE_EXPIRED", durationMs: Math.max(0, now() - startedAt), attempt: job.attempts, finalStatus: "lease_lost" });
          return true;
        }
        logEvent({ event: "review.attempt.finished", reviewId: job.id, jobId: job.id, stage: "result_persistence", errorCode: null, durationMs: Math.max(0, now() - startedAt), attempt: job.attempts, finalStatus: "completed" });
      } catch (error) {
        const failure = reviewFailure(error, stage, Math.max(0, now() - startedAt));
        if (leaseLost) {
          logEvent({ event: "review.attempt.finished", reviewId: job.id, jobId: job.id, stage: "lease_heartbeat", errorCode: leaseErrorCode, durationMs: failure.durationMs, attempt: job.attempts, finalStatus: "lease_lost" });
          return true;
        }
        try {
          const failed = await options.store.fail(job.id, options.workerId, failure, now());
          logEvent({
            event: "review.attempt.finished", reviewId: job.id, jobId: job.id, stage: failure.stage,
            errorCode: failure.errorCode, durationMs: failure.durationMs, attempt: job.attempts,
            ...(failure.gatewayFailure ? { gatewayFailure: failure.gatewayFailure } : {}),
            finalStatus: failed && failure.retryClass === "transient" && job.attempts < 3 ? "retry_wait" : failed ? "failed" : "lease_lost",
          });
        } catch {
          logEvent({ event: "review.attempt.finished", reviewId: job.id, jobId: job.id, stage: "queue_completion", errorCode: "QUEUE_STORAGE_FAILED", durationMs: failure.durationMs, attempt: job.attempts, finalStatus: "degraded" });
          throw new ReviewProcessingError("queue_completion", "QUEUE_STORAGE_FAILED", "manual");
        }
      } finally {
        clearInterval(heartbeat);
      }
      return true;
    },
  };
}
