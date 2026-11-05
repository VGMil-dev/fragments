import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";

const DEFAULT_LIMIT_MICROUSD = 1_000_000;
const RESERVATION_MARGIN = 2;

export type AiGatewayRateCard = { inputUsdPerMillion: number; outputUsdPerMillion: number };
type CostReceipt<T> = { value: T; costUsd?: number };

export type AiBudgetSummary = { limitMicroUsd: number; settledMicroUsd: number; reservedMicroUsd: number; availableMicroUsd: number; blocked: boolean };

export class AiBudgetUnavailableError extends Error {
  constructor(message = "La barrera de consumo de IA no puede garantizar una reserva válida.") { super(message); this.name = "AiBudgetUnavailableError"; }
}

function toMicroUsd(costUsd: number): number {
  if (!Number.isFinite(costUsd) || costUsd < 0 || costUsd > 1_000_000) throw new AiBudgetUnavailableError();
  return Math.ceil(costUsd * 1_000_000);
}

export function estimateAiCallCostMicroUsd(input: { inputTokens: number; outputTokens: number; rates?: AiGatewayRateCard }): number {
  const { rates } = input;
  if (!rates || !Number.isFinite(rates.inputUsdPerMillion) || !Number.isFinite(rates.outputUsdPerMillion)
    || rates.inputUsdPerMillion <= 0 || rates.outputUsdPerMillion <= 0
    || !Number.isSafeInteger(input.inputTokens) || input.inputTokens < 1
    || !Number.isSafeInteger(input.outputTokens) || input.outputTokens < 1) throw new AiBudgetUnavailableError();
  const estimatedUsd = ((input.inputTokens * rates.inputUsdPerMillion) + (input.outputTokens * rates.outputUsdPerMillion)) / 1_000_000;
  return Math.max(1, toMicroUsd(estimatedUsd * RESERVATION_MARGIN));
}

export class SqliteAiBudgetLedger {
  constructor(private readonly database: DatabaseSync, readonly limitMicroUsd = DEFAULT_LIMIT_MICROUSD) {
    if (!Number.isSafeInteger(limitMicroUsd) || limitMicroUsd < 1) throw new Error("El límite local de IA debe ser un entero positivo en microdólares.");
  }

  reserve(input: { id?: string; requestKind: string; estimateMicroUsd: number; now?: number }): string {
    const id = input.id ?? randomUUID();
    const now = input.now ?? Date.now();
    if (!/^[a-z][a-z0-9_-]{0,39}$/i.test(input.requestKind) || !Number.isSafeInteger(input.estimateMicroUsd)
      || input.estimateMicroUsd < 1 || input.estimateMicroUsd > this.limitMicroUsd) throw new AiBudgetUnavailableError();
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const uncertain = this.database.prepare("SELECT 1 FROM ai_budget_reservations WHERE status='uncertain' LIMIT 1").get();
      const totals = this.database.prepare(`SELECT
        COALESCE(SUM(CASE WHEN status='settled' THEN actual_microusd ELSE 0 END),0) AS settled,
        COALESCE(SUM(CASE WHEN status IN ('reserved','uncertain') THEN reserved_microusd ELSE 0 END),0) AS reserved
        FROM ai_budget_reservations`).get() as { settled: number; reserved: number };
      if (uncertain || Number(totals.settled) + Number(totals.reserved) + input.estimateMicroUsd > this.limitMicroUsd) {
        throw new AiBudgetUnavailableError();
      }
      this.database.prepare(`INSERT INTO ai_budget_reservations
        (id, request_kind, reserved_microusd, actual_microusd, status, created_at, updated_at)
        VALUES (?, ?, ?, NULL, 'reserved', ?, ?)`)
        .run(id, input.requestKind, input.estimateMicroUsd, now, now);
      this.database.exec("COMMIT");
      return id;
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

  async run<T>(input: { requestKind: string; inputTokens: number; outputTokens: number; rates?: AiGatewayRateCard; invoke: () => Promise<CostReceipt<T>> }): Promise<T> {
    const estimateMicroUsd = estimateAiCallCostMicroUsd({ inputTokens: input.inputTokens, outputTokens: input.outputTokens, ...(input.rates ? { rates: input.rates } : {}) });
    const reservationId = this.reserve({ requestKind: input.requestKind, estimateMicroUsd });
    try {
      const receipt = await input.invoke();
      const settlement = this.settle(reservationId, receipt.costUsd ?? null);
      if (settlement !== "settled") throw new AiBudgetUnavailableError("El proveedor no confirmó un coste dentro de la reserva.");
      return receipt.value;
    } catch (error) {
      const row = this.database.prepare("SELECT status FROM ai_budget_reservations WHERE id=?").get(reservationId) as { status: string } | undefined;
      if (row?.status === "reserved") this.settle(reservationId, null);
      throw error;
    }
  }
}
