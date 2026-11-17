import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

const DEFAULT_LIMIT_MICROUSD = 1_000_000;
const RESERVATION_MARGIN = 2;
const STALE_RESERVATION_MS = 5 * 60_000;

export type AiGatewayRateCard = { inputUsdPerMillion: number; outputUsdPerMillion: number };
export type CostReceipt<T> = { value: T; costUsd?: number };

export function parseGatewayCostUsd(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export type AiBudgetSummary = { limitMicroUsd: number; settledMicroUsd: number; reservedMicroUsd: number; availableMicroUsd: number; blocked: boolean };

export class AiBudgetUnavailableError extends Error {
  constructor(message = "La barrera de consumo de IA no puede garantizar una reserva válida.") { super(message); this.name = "AiBudgetUnavailableError"; }
}

export class AiEvaluationInProgressError extends Error {
  constructor() { super("La evaluación ya tiene una operación activa o un costo confirmado pendiente de recuperación."); this.name = "AiEvaluationInProgressError"; }
}

export class AiDispatchUnavailableError extends Error {
  readonly retryAfterMs: number;
  constructor(retryAfterMs: number) { super("No hay un turno disponible para iniciar la evaluación."); this.name = "AiDispatchUnavailableError"; this.retryAfterMs = retryAfterMs; }
}

export type DispatchSlotResult = { leaseId: string } | { waitMs: number } | { blocked: true };

function toMicroUsd(costUsd: number): number {
  const microUsd = Math.ceil(costUsd * 1_000_000);
  if (!Number.isFinite(costUsd) || costUsd < 0 || !Number.isSafeInteger(microUsd)) throw new AiBudgetUnavailableError();
  return microUsd;
}

export function estimateAiCallCostMicroUsd(input: { inputTokens: number; outputTokens: number; rates?: AiGatewayRateCard }): number {
  const { rates } = input;
  if (!rates || !Number.isFinite(rates.inputUsdPerMillion) || !Number.isFinite(rates.outputUsdPerMillion)
    || rates.inputUsdPerMillion <= 0 || rates.outputUsdPerMillion <= 0
    || !Number.isSafeInteger(input.inputTokens) || input.inputTokens < 1
    || !Number.isSafeInteger(input.outputTokens) || input.outputTokens < 1) return 1;
  const estimatedUsd = ((input.inputTokens * rates.inputUsdPerMillion) + (input.outputTokens * rates.outputUsdPerMillion)) / 1_000_000;
  return Math.max(1, toMicroUsd(estimatedUsd * RESERVATION_MARGIN));
}

export class SqliteAiBudgetLedger {
  constructor(private readonly database: DatabaseSync, readonly limitMicroUsd = DEFAULT_LIMIT_MICROUSD) {
    if (!Number.isSafeInteger(limitMicroUsd) || limitMicroUsd < 1) throw new Error("El límite local de IA debe ser un entero positivo en microdólares.");
  }

  reserve(input: { id?: string; requestKind: string; estimateMicroUsd: number; operationKey?: string; now?: number }): string {
    const id = input.id ?? randomUUID();
    const now = input.now ?? Date.now();
    if (!/^[a-z][a-z0-9_-]{0,39}$/i.test(input.requestKind) || !Number.isSafeInteger(input.estimateMicroUsd)
      || input.estimateMicroUsd < 1) throw new AiBudgetUnavailableError();
    if (input.operationKey !== undefined && !/^[a-f0-9]{64}$/.test(input.operationKey)) throw new AiBudgetUnavailableError();
    this.database.exec("BEGIN IMMEDIATE");
    let committed = false;
    try {
      // Long-lived reservations are ambiguous after a process crash; never release or reuse them automatically.
      this.database.prepare("UPDATE ai_budget_reservations SET status='uncertain', updated_at=? WHERE status='reserved' AND updated_at<=?")
        .run(now, now - STALE_RESERVATION_MS);
      const uncertain = this.database.prepare("SELECT 1 FROM ai_budget_reservations WHERE status='uncertain' LIMIT 1").get();
      if (uncertain) {
        this.database.exec("COMMIT");
        committed = true;
        throw new AiBudgetUnavailableError("Hay un despacho de IA con costo incierto; no se enviarán solicitudes facturables hasta reconciliarlo.");
      }
      if (input.operationKey) {
        const previous = this.database.prepare(`SELECT status FROM ai_budget_reservations
          WHERE operation_key=? ORDER BY created_at DESC, rowid DESC LIMIT 1`).get(input.operationKey) as { status: string } | undefined;
        if (previous && (previous.status === "reserved" || previous.status === "uncertain"
          || previous.status === "settled")) {
          throw new AiEvaluationInProgressError();
        }
      }
      this.database.prepare(`INSERT INTO ai_budget_reservations
        (id, request_kind, reserved_microusd, actual_microusd, status, created_at, updated_at, operation_key)
        VALUES (?, ?, ?, NULL, 'reserved', ?, ?, ?)`)
        .run(id, input.requestKind, input.estimateMicroUsd, now, now, input.operationKey ?? null);
      this.database.exec("COMMIT");
      return id;
    } catch (error) {
      if (!committed) this.database.exec("ROLLBACK");
      throw error;
    }
  }

  acquireDispatchSlot(reservationId: string, input: { now?: number; leaseMs?: number } = {}): DispatchSlotResult {
    const now = input.now ?? Date.now();
    const leaseMs = input.leaseMs ?? 35_000;
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const uncertain = this.database.prepare("SELECT 1 FROM ai_budget_reservations WHERE status='uncertain' LIMIT 1").get();
      if (uncertain) {
        this.database.exec("COMMIT");
        return { blocked: true };
      }
      const row = this.database.prepare(`SELECT lease_id, reservation_id, lease_until, cooldown_until
        FROM ai_gateway_dispatch_control WHERE id=1`).get() as { lease_id: string | null; reservation_id: string | null; lease_until: number; cooldown_until: number };
      if (row.lease_id && row.lease_until > now) {
        this.database.exec("COMMIT");
        return { waitMs: Math.max(1, Number(row.lease_until) - now) };
      }
      if (row.lease_id && row.lease_until <= now && row.reservation_id) {
        this.database.prepare("UPDATE ai_budget_reservations SET status='uncertain', updated_at=? WHERE id=? AND status='reserved'")
          .run(now, row.reservation_id);
        this.database.prepare(`UPDATE ai_gateway_dispatch_control SET lease_id=NULL, reservation_id=NULL,
          lease_until=0, updated_at=? WHERE id=1`).run(now);
        this.database.exec("COMMIT");
        return { blocked: true };
      }
      if (row.cooldown_until > now) {
        this.database.exec("COMMIT");
        return { waitMs: Math.max(1, Number(row.cooldown_until) - now) };
      }
      const leaseId = randomUUID();
      this.database.prepare(`UPDATE ai_gateway_dispatch_control SET lease_id=?, reservation_id=?, lease_until=?, updated_at=? WHERE id=1`)
        .run(leaseId, reservationId, now + leaseMs, now);
      this.database.exec("COMMIT");
      return { leaseId };
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  releaseDispatchSlot(leaseId: string, input: { now?: number; success?: boolean; rateLimitRetryAfterMs?: number | null; transientFailure?: boolean; random?: () => number } = {}): number {
    const now = input.now ?? Date.now();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = this.database.prepare("SELECT transient_failure_streak FROM ai_gateway_dispatch_control WHERE id=1 AND lease_id=?")
        .get(leaseId) as { transient_failure_streak: number } | undefined;
      if (!row) {
        this.database.exec("COMMIT");
        return 0;
      }
      if (input.success) {
        this.database.prepare(`UPDATE ai_gateway_dispatch_control SET lease_id=NULL, reservation_id=NULL, lease_until=0,
          cooldown_until=0, transient_failure_streak=0, updated_at=? WHERE id=1 AND lease_id=?`).run(now, leaseId);
        this.database.exec("COMMIT");
        return 0;
      }
      if (input.rateLimitRetryAfterMs !== undefined || input.transientFailure === true) {
        const streak = Number(row.transient_failure_streak) + 1;
        const exponentialCap = Math.min(30_000, 1_000 * 2 ** Math.min(streak - 1, 5));
        const jitter = Math.round(Math.max(0, Math.min(1, (input.random ?? Math.random)())) * exponentialCap);
        const retryAfterMs = typeof input.rateLimitRetryAfterMs === "number" && Number.isFinite(input.rateLimitRetryAfterMs)
          ? Math.max(0, Math.min(input.rateLimitRetryAfterMs, 86_400_000))
          : 0;
        const delayMs = Math.max(100, retryAfterMs, jitter);
        this.database.prepare(`UPDATE ai_gateway_dispatch_control SET lease_id=NULL, reservation_id=NULL, lease_until=0,
          cooldown_until=MAX(cooldown_until, ?), transient_failure_streak=?, updated_at=? WHERE id=1 AND lease_id=?`)
          .run(now + delayMs, streak, now, leaseId);
        this.database.exec("COMMIT");
        return delayMs;
      }
      this.database.prepare(`UPDATE ai_gateway_dispatch_control SET lease_id=NULL, reservation_id=NULL, lease_until=0, updated_at=?
        WHERE id=1 AND lease_id=?`).run(now, leaseId);
      this.database.exec("COMMIT");
      return 0;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }

  settle(id: string, costUsd: number | null, now = Date.now()): "settled" | "overrun" | "uncertain" {
    if (costUsd === null) {
      const changed = this.database.prepare("UPDATE ai_budget_reservations SET status='uncertain', updated_at=? WHERE id=? AND status='reserved'").run(now, id).changes;
      if (changed !== 1) throw new AiBudgetUnavailableError();
      return "uncertain";
    }
    const actual = toMicroUsd(costUsd);
    const row = this.database.prepare("SELECT reserved_microusd FROM ai_budget_reservations WHERE id=? AND status='reserved'").get(id) as { reserved_microusd: number } | undefined;
    if (!row) throw new AiBudgetUnavailableError();
    this.database.prepare("UPDATE ai_budget_reservations SET status='settled', actual_microusd=?, updated_at=? WHERE id=? AND status='reserved'")
      .run(actual, now, id);
    return actual > Number(row.reserved_microusd) ? "overrun" : "settled";
  }

  releaseBeforeDispatch(id: string, now = Date.now()): boolean {
    return this.database.prepare("UPDATE ai_budget_reservations SET status='released', updated_at=? WHERE id=? AND status='reserved'")
      .run(now, id).changes === 1;
  }

  summary(): AiBudgetSummary {
    const row = this.database.prepare(`SELECT
      COALESCE(SUM(CASE WHEN status='settled' THEN actual_microusd ELSE 0 END),0) AS settled,
      COALESCE(SUM(CASE WHEN status IN ('reserved','uncertain') THEN reserved_microusd ELSE 0 END),0) AS reserved,
      MAX(CASE WHEN status='uncertain' THEN 1 ELSE 0 END) AS blocked
      FROM ai_budget_reservations`).get() as { settled: number; reserved: number; blocked: number | null };
    return {
      limitMicroUsd: this.limitMicroUsd,
      settledMicroUsd: Number(row.settled),
      reservedMicroUsd: Number(row.reserved),
      availableMicroUsd: Math.max(0, this.limitMicroUsd - Number(row.settled) - Number(row.reserved)),
      blocked: row.blocked === 1,
    };
  }

  async run<T>(input: {
    requestKind: string;
    inputTokens: number;
    outputTokens: number;
    rates?: AiGatewayRateCard;
    operationKey?: string;
    isConfirmedNoCharge?: (error: unknown) => boolean;
    invoke: (signals: { reservationId: string; onDispatch: () => void; onConfirmedNoCharge: () => void }) => Promise<CostReceipt<T>>;
  }): Promise<T> {
    const estimateMicroUsd = estimateAiCallCostMicroUsd({ inputTokens: input.inputTokens, outputTokens: input.outputTokens, ...(input.rates ? { rates: input.rates } : {}) });
    const reservationId = this.reserve({ requestKind: input.requestKind, estimateMicroUsd, ...(input.operationKey ? { operationKey: input.operationKey } : {}) });
    let dispatchPossible = false;
    try {
      const receipt = await input.invoke({ reservationId, onDispatch: () => { dispatchPossible = true; }, onConfirmedNoCharge: () => { dispatchPossible = false; } });
      const settlement = this.settle(reservationId, receipt.costUsd ?? null);
      if (settlement === "uncertain") throw new AiBudgetUnavailableError("El proveedor no confirmó el costo de la solicitud.");
      return receipt.value;
    } catch (error) {
      const row = this.database.prepare("SELECT status FROM ai_budget_reservations WHERE id=?").get(reservationId) as { status: string } | undefined;
      if (row?.status === "reserved") {
        if (!dispatchPossible || input.isConfirmedNoCharge?.(error)) this.releaseBeforeDispatch(reservationId);
        else this.settle(reservationId, null);
      }
      throw error;
    }
  }
}
