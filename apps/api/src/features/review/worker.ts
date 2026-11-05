import type { ReviewRequest } from "@fragments/contracts";
import type { ReviewContext, createReviewService } from "./review.service.js";
import type { createSqliteReviewStore } from "./sqlite-store.js";

type Store = ReturnType<typeof createSqliteReviewStore>;
type Service = ReturnType<typeof createReviewService>;

export type ReviewWorkerOptions = {
  store: Store;
  service: Service;
  workerId: string;
  leaseDurationMs?: number;
  heartbeatIntervalMs?: number;
  now?: () => number;
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

  return {
    async runOnce(): Promise<boolean> {
      const job = options.store.claim(options.workerId, now(), leaseDurationMs);
      if (!job) return false;

      const controller = new AbortController();
      let leaseLost = false;
      const heartbeat = setInterval(() => {
        try {
          if (options.store.heartbeat(job.id, options.workerId, now(), leaseDurationMs)) return;
          leaseLost = true;
          controller.abort(new Error("La reserva del trabajo Review expiró."));
        } catch {
          leaseLost = true;
          controller.abort(new Error("No se pudo renovar la reserva del trabajo Review."));
        }
      }, heartbeatIntervalMs);
      heartbeat.unref?.();

      try {
        const result = await options.service.review(job.request satisfies ReviewRequest, job.context satisfies ReviewContext, { signal: controller.signal, reviewId: job.id, leaseOwner: options.workerId });
        if (result.status !== "completed") throw new Error("El worker no recibió un resultado completo.");
        if (!options.store.complete(job.id, options.workerId, now())) throw new Error("La reserva del trabajo Review ya no pertenece a este worker.");
      } catch {
        if (!leaseLost) options.store.fail(job.id, options.workerId, undefined, now());
      } finally {
        clearInterval(heartbeat);
      }
      return true;
    },
  };
}
