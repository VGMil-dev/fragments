import {
  AiBudgetUnavailableError,
  AiDispatchUnavailableError,
  type CostReceipt,
  type SqliteAiBudgetLedger,
} from "./budget-ledger.js";
import { classifyGatewayFailure, hasConfirmedNoChargeGatewayRejection, hasProviderResponseEvidence } from "./gateway-error.js";

type DispatchSignals = { reservationId: string; onDispatch: () => void; onConfirmedNoCharge: () => void };
type PolicyOptions = {
  maxRetries?: number;
  maxDispatchWaitMs?: number;
  maxRetryWaitMs?: number;
  leaseMs?: number;
  now?: () => number;
  random?: () => number;
  sleep?: (ms: number) => Promise<void>;
};

class GatewayRetryExhaustedError extends Error {
  readonly statusCode = 429;
  readonly type = "rate_limit_exceeded";
  readonly isRetryable = true;
  readonly safeNoCharge: boolean;
  readonly generationId?: string;
  readonly retryAfterMs: number;
  readonly gatewayHttpStatus = 429;
  readonly gatewayCode = "rate_limit_exceeded";
  readonly providerHttpStatus: number | null;
  readonly providerCode: string | null;
  readonly providerDispatchPossible: boolean;

  constructor(original: unknown, retryAfterMs: number, safeNoCharge: boolean) {
    const details = classifyGatewayFailure(original);
    super("AI Gateway rate limit response could not be safely retried or exceeded the retry bound.", { cause: original });
    this.name = "GatewayRateLimitError";
    this.safeNoCharge = safeNoCharge;
    this.retryAfterMs = retryAfterMs;
    this.providerHttpStatus = details.providerHttpStatus;
    this.providerCode = details.providerCode;
    this.providerDispatchPossible = details.providerDispatchPossible;
    if (details.gatewayGenerationId) this.generationId = details.gatewayGenerationId;
  }
}

class GatewayPreDispatchTimeoutError extends Error {
  readonly safeNoCharge = true;
  readonly isRetryable = true;
  readonly retryAfterMs: number;
  constructor(original: unknown, retryAfterMs: number) {
    super("AI Gateway request timed out before network dispatch.", { cause: original });
    this.name = "TimeoutError";
    this.retryAfterMs = retryAfterMs;
  }
}

function isTimeoutFailure(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    if (!current || typeof current !== "object") return false;
    const item = current as { name?: unknown; cause?: unknown };
    if (item.name === "TimeoutError" || item.name === "AbortError") return true;
    if (!item.cause || item.cause === current) return false;
    current = item.cause;
  }
  return false;
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeWithGatewayPolicy<T>(
  ledger: SqliteAiBudgetLedger,
  signals: DispatchSignals,
  invoke: (onDispatch: () => void) => Promise<CostReceipt<T>>,
  options: PolicyOptions = {},
): Promise<CostReceipt<T>> {
  const maxAttempts = (options.maxRetries ?? 3) + 1;
  const maxDispatchWaitMs = options.maxDispatchWaitMs ?? 30_000;
  const maxRetryWaitMs = options.maxRetryWaitMs ?? 30_000;
  const leaseMs = options.leaseMs ?? 35_000;
  const now = options.now ?? Date.now;
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;
  const startedAt = now();
  let attempt = 0;

  while (attempt < maxAttempts) {
    const acquired = ledger.acquireDispatchSlot(signals.reservationId, { now: now(), leaseMs });
    if ("blocked" in acquired) throw new AiBudgetUnavailableError("Hay una evaluación incierta pendiente de conciliación.");
    if ("waitMs" in acquired) {
      const jitter = Math.floor(Math.max(0, Math.min(1 - Number.EPSILON, random())) * 101);
      const delay = acquired.waitMs + jitter;
      if (now() - startedAt + delay > maxDispatchWaitMs) throw new AiDispatchUnavailableError(acquired.waitMs);
      await sleep(delay);
      continue;
    }

    attempt += 1;
    let dispatched = false;
    try {
      const result = await invoke(() => {
        if (dispatched) return;
        dispatched = true;
        signals.onDispatch();
      });
      ledger.releaseDispatchSlot(acquired.leaseId, { now: now(), success: true });
      return result;
    } catch (error) {
      const details = classifyGatewayFailure(error);
      const preDispatchTimeout = !dispatched && isTimeoutFailure(error);
      const providerEvidence = hasProviderResponseEvidence(error);
      const explicitPossibleDispatch = (error as { providerDispatchPossible?: unknown } | null)?.providerDispatchPossible === true;
      if (!dispatched && (providerEvidence || explicitPossibleDispatch)) {
        dispatched = true;
        signals.onDispatch();
      }
      const safeNoCharge = hasConfirmedNoChargeGatewayRejection(error)
        || (!dispatched && !providerEvidence && !explicitPossibleDispatch);
      if (safeNoCharge) signals.onConfirmedNoCharge();
      if (details.gatewayHttpStatus !== 429) {
        const delay = ledger.releaseDispatchSlot(acquired.leaseId, {
          now: now(), ...(preDispatchTimeout ? { transientFailure: true, random } : {}),
        });
        if (preDispatchTimeout && attempt < maxAttempts && delay <= maxRetryWaitMs
          && now() - startedAt + delay <= maxDispatchWaitMs + maxRetryWaitMs) {
          await sleep(delay);
          continue;
        }
        if (preDispatchTimeout) throw new GatewayPreDispatchTimeoutError(error, delay);
        throw error;
      }

      const delay = ledger.releaseDispatchSlot(acquired.leaseId, {
        now: now(),
        rateLimitRetryAfterMs: details.retryAfterMs,
        random,
      });
      const canRetry = safeNoCharge && details.retryable && attempt < maxAttempts
        && delay <= maxRetryWaitMs && now() - startedAt + delay <= maxDispatchWaitMs + maxRetryWaitMs;
      if (canRetry) {
        await sleep(delay);
        continue;
      }
      throw new GatewayRetryExhaustedError(error, delay, safeNoCharge);
    }
  }
  throw new AiDispatchUnavailableError(1_000);
}
