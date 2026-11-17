import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

const RESERVATION_MARGIN = 2;
const STALE_RESERVATION_MS = 5 * 60_000;

export type AiGatewayRateCard = { inputUsdPerMillion: number; outputUsdPerMillion: number };
type CostReceipt<T> = { value: T; costUsd?: number };

export function parseGatewayCostUsd(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : undefined;
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/** Conservative character-based estimate for the complete prompt, including system instructions. */
export function estimateAiInputTokens(prompt: string): number {
  return Math.ceil(new TextEncoder().encode(prompt).byteLength / 4);
}

export type AiBudgetSummary = { settledMicroUsd: number; reservedMicroUsd: number; uncertainMicroUsd: number };

export class AiBudgetUnavailableError extends Error {
  constructor(message = "No se pudo validar el costo ni registrar esta operación de IA.") { super(message); this.name = "AiBudgetUnavailableError"; }
}

export class AiEvaluationInProgressError extends Error {
  constructor() { super("Esta operación de IA ya tiene un resultado, una reserva activa o un costo incierto."); this.name = "AiEvaluationInProgressError"; }
}

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
    || !Number.isSafeInteger(input.outputTokens) || input.outputTokens < 1) throw new AiBudgetUnavailableError("Falta una tarifa verificada o un límite de tokens válido para estimar la solicitud.");
  const estimatedUsd = ((input.inputTokens * rates.inputUsdPerMillion) + (input.outputTokens * rates.outputUsdPerMillion)) / 1_000_000;
  return Math.max(1, toMicroUsd(estimatedUsd * RESERVATION_MARGIN));
}

export class SqliteAiBudgetLedger {
  constructor(private readonly database: DatabaseSync) {}

  reserve(input: { id?: string; requestKind: string; estimateMicroUsd: number; operationKey: string; now?: number }): string {
    const id = input.id ?? randomUUID();
    const now = input.now ?? Date.now();
    if (!/^[a-z][a-z0-9_-]{0,39}$/i.test(input.requestKind) || !Number.isSafeInteger(input.estimateMicroUsd)
      || input.estimateMicroUsd < 1 || !/^[a-f0-9]{64}$/.test(input.operationKey)) throw new AiBudgetUnavailableError();
    this.database.exec("BEGIN IMMEDIATE");
    let committed = false;
    try {
      // Long-lived reservations are ambiguous after a process crash; never release or reuse them automatically.
      this.database.prepare("UPDATE ai_budget_reservations SET status='uncertain', updated_at=? WHERE status='reserved' AND updated_at<=?")
        .run(now, now - STALE_RESERVATION_MS);
      const previous = this.database.prepare(`SELECT status FROM ai_budget_reservations
        WHERE operation_key=? ORDER BY created_at DESC, rowid DESC LIMIT 1`).get(input.operationKey) as { status: string } | undefined;
      if (previous && previous.status !== "released") {
        throw new AiEvaluationInProgressError();
      }
      this.database.prepare(`INSERT INTO ai_budget_reservations
        (id, request_kind, reserved_microusd, actual_microusd, status, created_at, updated_at, operation_key)
        VALUES (?, ?, ?, NULL, 'reserved', ?, ?, ?)`)
        .run(id, input.requestKind, input.estimateMicroUsd, now, now, input.operationKey);
      this.database.exec("COMMIT");
      return id;
    } catch (error) {
      if (!committed) this.database.exec("ROLLBACK");
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
      COALESCE(SUM(CASE WHEN status='reserved' THEN reserved_microusd ELSE 0 END),0) AS reserved,
      COALESCE(SUM(CASE WHEN status='uncertain' THEN reserved_microusd ELSE 0 END),0) AS uncertain
      FROM ai_budget_reservations`).get() as { settled: number; reserved: number; uncertain: number };
    return {
      settledMicroUsd: Number(row.settled),
      reservedMicroUsd: Number(row.reserved),
      uncertainMicroUsd: Number(row.uncertain),
    };
  }

  async run<T>(input: {
    requestKind: string;
    inputTokens: number;
    outputTokens: number;
    rates?: AiGatewayRateCard;
    operationKey: string;
    isConfirmedNoCharge?: (error: unknown) => boolean;
    onReceipt?: (value: T) => void | Promise<void>;
    invoke: () => Promise<CostReceipt<T>>;
  }): Promise<T> {
    const estimateMicroUsd = estimateAiCallCostMicroUsd({ inputTokens: input.inputTokens, outputTokens: input.outputTokens, ...(input.rates ? { rates: input.rates } : {}) });
    const reservationId = this.reserve({ requestKind: input.requestKind, estimateMicroUsd, operationKey: input.operationKey });
    try {
      const receipt = await input.invoke();
      await input.onReceipt?.(receipt.value);
      const settlement = this.settle(reservationId, receipt.costUsd ?? null);
      if (settlement === "uncertain") throw new AiBudgetUnavailableError("El proveedor no confirmó el costo de la solicitud.");
      return receipt.value;
    } catch (error) {
      const row = this.database.prepare("SELECT status FROM ai_budget_reservations WHERE id=?").get(reservationId) as { status: string } | undefined;
      if (row?.status === "reserved") {
        if (input.isConfirmedNoCharge?.(error)) this.releaseBeforeDispatch(reservationId);
        else this.settle(reservationId, null);
      }
      throw error;
    }
  }
}
