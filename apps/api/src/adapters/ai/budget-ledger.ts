import { randomUUID } from "node:crypto";
import type { PrismaClient } from "../../generated/prisma/client.js";

const RESERVATION_MARGIN = 2;
const STALE_RESERVATION_MS = 5 * 60_000;

export type AiGatewayRateCard = { inputUsdPerMillion: number; outputUsdPerMillion: number };
type CostReceipt<T> = { value: T; costUsd?: number };
export type AiBudgetRunner = {
  run<T>(input: {
    requestKind: string;
    inputTokens: number;
    outputTokens: number;
    rates?: AiGatewayRateCard;
    operationKey: string;
    isConfirmedNoCharge?: (error: unknown) => boolean;
    onReceipt?: (value: T) => void | Promise<void>;
    invoke: () => Promise<CostReceipt<T>>;
  }): Promise<T>;
};

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

export class PrismaAiBudgetLedger {
  constructor(private readonly database: PrismaClient) {}

  async reserve(input: { id?: string; requestKind: string; estimateMicroUsd: number; operationKey: string; now?: number }): Promise<string> {
    const id = input.id ?? randomUUID();
    const now = input.now ?? Date.now();
    if (!/^[a-z][a-z0-9_-]{0,39}$/i.test(input.requestKind) || !Number.isSafeInteger(input.estimateMicroUsd)
      || input.estimateMicroUsd < 1 || !/^[a-f0-9]{64}$/.test(input.operationKey)) throw new AiBudgetUnavailableError();
    try {
      await this.database.$transaction(async (tx) => {
        const timestamp = new Date(now);
        // Long-lived reservations are ambiguous after a process crash; never release or reuse them automatically.
        await tx.aiBudgetReservation.updateMany({ where: { status: "reserved", updatedAt: { lte: new Date(now - STALE_RESERVATION_MS) } }, data: { status: "uncertain", updatedAt: timestamp } });
        const previous = await tx.aiBudgetReservation.findFirst({ where: { operationKey: input.operationKey }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], select: { status: true } });
        if (previous && previous.status !== "released") throw new AiEvaluationInProgressError();
        await tx.aiBudgetReservation.create({ data: {
          id, requestKind: input.requestKind, reservedMicrousd: BigInt(input.estimateMicroUsd), actualMicrousd: null,
          status: "reserved", createdAt: timestamp, updatedAt: timestamp, operationKey: input.operationKey,
        } });
      });
      return id;
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new AiEvaluationInProgressError();
      throw error;
    }
  }

  async settle(id: string, costUsd: number | null, now = Date.now()): Promise<"settled" | "overrun" | "uncertain"> {
    const actual = costUsd === null ? null : toMicroUsd(costUsd);
    const row = await this.database.aiBudgetReservation.findFirst({ where: { id, status: "reserved" }, select: { reservedMicrousd: true } });
    if (!row) throw new AiBudgetUnavailableError();
    const changed = await this.database.aiBudgetReservation.updateMany({
      where: { id, status: "reserved" },
      data: { status: costUsd === null ? "uncertain" : "settled", actualMicrousd: actual === null ? null : BigInt(actual), updatedAt: new Date(now) },
    });
    if (changed.count !== 1) throw new AiBudgetUnavailableError();
    if (costUsd === null) {
      return "uncertain";
    }
    return BigInt(actual!) > row.reservedMicrousd ? "overrun" : "settled";
  }

  async releaseBeforeDispatch(id: string, now = Date.now()): Promise<boolean> {
    const result = await this.database.aiBudgetReservation.updateMany({ where: { id, status: "reserved" }, data: { status: "released", updatedAt: new Date(now) } });
    return result.count === 1;
  }

  async summary(): Promise<AiBudgetSummary> {
    const rows = await this.database.aiBudgetReservation.groupBy({ by: ["status"], _sum: { reservedMicrousd: true, actualMicrousd: true } });
    const totals = new Map(rows.map((row) => [row.status, row._sum]));
    return {
      settledMicroUsd: Number(totals.get("settled")?.actualMicrousd ?? 0n),
      reservedMicroUsd: Number(totals.get("reserved")?.reservedMicrousd ?? 0n),
      uncertainMicroUsd: Number(totals.get("uncertain")?.reservedMicrousd ?? 0n),
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
    const reservationId = await this.reserve({ requestKind: input.requestKind, estimateMicroUsd, operationKey: input.operationKey });
    try {
      const receipt = await input.invoke();
      await input.onReceipt?.(receipt.value);
      const settlement = await this.settle(reservationId, receipt.costUsd ?? null);
      if (settlement === "uncertain") throw new AiBudgetUnavailableError("El proveedor no confirmó el costo de la solicitud.");
      return receipt.value;
    } catch (error) {
      const row = await this.database.aiBudgetReservation.findUnique({ where: { id: reservationId }, select: { status: true } });
      if (row?.status === "reserved") {
        if (input.isConfirmedNoCharge?.(error)) await this.releaseBeforeDispatch(reservationId);
        else await this.settle(reservationId, null);
      }
      throw error;
    }
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
