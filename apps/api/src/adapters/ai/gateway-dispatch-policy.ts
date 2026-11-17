import {
  AiBudgetUnavailableError,
  AiDispatchUnavailableError,
  type CostReceipt,
  type SqliteAiBudgetLedger,
} from "./budget-ledger.js";
import { classifyGatewayFailure, hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

type DispatchSignals = { reservationId: string; onDispatch: () => void; onConfirmedNoCharge: () => void };
type PolicyOptions = {
  maxAttempts?: number;
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

  constructor(original: unknown, retryAfterMs: number, safeNoCharge: boolean) {
    const details = classifyGatewayFailure(original);
    super("AI Gateway rate limit persisted after bounded retries.", { cause: original });
    this.name = "GatewayRateLimitError";
    this.safeNoCharge = safeNoCharge;
    this.retryAfterMs = retryAfterMs;
    this.providerHttpStatus = details.providerHttpStatus;
    this.providerCode = details.providerCode;
    if (details.gatewayGenerationId) this.generationId = details.gatewayGenerationId;
  }
}

const defaultSleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export async function executeWithGatewayPolicy<T>(
  ledger: SqliteAiBudgetLedger,
  signals: DispatchSignals,
  invoke: () => Promise<CostReceipt<T>>,
  options: PolicyOptions = {},
): Promise<CostReceipt<T>> {
  const maxAttempts = options.maxAttempts ?? 3;
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
      const jitter = Math.round(Math.max(0, Math.min(1, random())) * 100);
      const delay = acquired.waitMs + jitter;
      if (now() - startedAt + delay > maxDispatchWaitMs) throw new AiDispatchUnavailableError(acquired.waitMs);
      await sleep(delay);
      continue;
    }

    attempt += 1;
    try {
      signals.onDispatch();
      const result = await invoke();
      ledger.releaseDispatchSlot(acquired.leaseId, { now: now(), success: true });
      return result;
    } catch (error) {
      const details = classifyGatewayFailure(error);
      const safeNoCharge = hasConfirmedNoChargeGatewayRejection(error);
      if (safeNoCharge) signals.onConfirmedNoCharge();
      if (details.gatewayHttpStatus !== 429) {
        ledger.releaseDispatchSlot(acquired.leaseId, { now: now() });
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
