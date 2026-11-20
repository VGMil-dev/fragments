import { createHash, randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { AiBudgetUnavailableError, AiEvaluationInProgressError, estimateAiCallCostMicroUsd, parseGatewayCostUsd, PrismaAiBudgetLedger } from "./budget-ledger.js";
import { hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

describe("AI budget cost helpers", () => {
  it("normalizes finite Gateway receipts and rejects invalid values", () => {
    expect(parseGatewayCostUsd("0.0000123")).toBe(0.0000123);
    expect(parseGatewayCostUsd(0)).toBe(0);
    expect(parseGatewayCostUsd("Infinity")).toBeUndefined();
    expect(parseGatewayCostUsd("-0.1")).toBeUndefined();
  });

  it("requires a verified rate card and estimates a conservative reservation", () => {
    expect(estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 } })).toBe(14_000);
    expect(() => estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000 })).toThrow(AiBudgetUnavailableError);
  });
});

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar la integración Prisma.");
const describePostgres = databaseUrl ? describe : describe.skip;
const prefix = `f21_${randomUUID().replaceAll("-", "")}_`;
const operationKey = (suffix: string) => createHash("sha256").update(`${prefix}${suffix}`).digest("hex");
let database: PrismaClient | undefined;
const ledger = () => new PrismaAiBudgetLedger(database!);

beforeAll(async () => {
  if (!databaseUrl) return;
  database = openDatabase(databaseUrl);
  await database.$connect();
});
beforeEach(async () => { if (database) await database.aiBudgetReservation.deleteMany(); });
afterEach(async () => { if (database) await database.aiBudgetReservation.deleteMany(); });
afterAll(async () => { await database?.$disconnect(); });

describePostgres("Prisma AI budget ledger (fragments_test)", () => {
  it("tracks reservations, settled charges and pre-dispatch releases", async () => {
    const budget = ledger();
    const first = await budget.reserve({ requestKind: "review", estimateMicroUsd: 600_000, id: `${prefix}one`, operationKey: operationKey("one") });
    await budget.reserve({ requestKind: "review", estimateMicroUsd: 500_000, id: `${prefix}two`, operationKey: operationKey("two") });
    expect(await budget.summary()).toMatchObject({ reservedMicroUsd: 1_100_000, uncertainMicroUsd: 0 });
    expect(await budget.releaseBeforeDispatch(first)).toBe(true);
    expect(await budget.releaseBeforeDispatch(first)).toBe(false);
    expect(await budget.summary()).toMatchObject({ reservedMicroUsd: 500_000, uncertainMicroUsd: 0 });
  });

  it("settles confirmed provider cost and keeps an unknown receipt uncertain", async () => {
    const budget = ledger();
    await expect(budget.run({
      requestKind: "review", inputTokens: 1_000, outputTokens: 1_000,
      rates: { inputUsdPerMillion: 100, outputUsdPerMillion: 100 }, operationKey: operationKey("confirmed"),
      invoke: async () => ({ value: "ok", costUsd: 0.1 }),
    })).resolves.toBe("ok");
    expect((await budget.summary()).settledMicroUsd).toBe(100_000);

    await expect(budget.run({
      requestKind: "review", inputTokens: 1_000, outputTokens: 1_000,
      rates: { inputUsdPerMillion: 100, outputUsdPerMillion: 100 }, operationKey: operationKey("unknown"),
      invoke: async () => ({ value: "unknown" }),
    })).rejects.toThrow(AiBudgetUnavailableError);
    expect(await budget.summary()).toMatchObject({ reservedMicroUsd: 0, uncertainMicroUsd: 400_000 });
  });

  it("marks expired reservations uncertain without blocking independent work", async () => {
    const budget = ledger();
    await budget.reserve({ requestKind: "mentor", estimateMicroUsd: 870, id: `${prefix}old`, operationKey: operationKey("old"), now: 1_000 });
    await budget.reserve({ requestKind: "review", estimateMicroUsd: 500, id: `${prefix}new`, operationKey: operationKey("new"), now: 301_001 });
    const old = await database!.aiBudgetReservation.findUniqueOrThrow({ where: { id: `${prefix}old` } });
    expect(old.status).toBe("uncertain");
    expect(await budget.summary()).toMatchObject({ reservedMicroUsd: 500, uncertainMicroUsd: 870 });
  });

  it("serializes concurrent reservations for the same operation identity", async () => {
    const first = ledger(); const second = ledger(); const key = operationKey("concurrent");
    const concurrent = await Promise.allSettled([
      first.reserve({ requestKind: "review", estimateMicroUsd: 500, id: `${prefix}worker_a`, operationKey: key }),
      second.reserve({ requestKind: "review", estimateMicroUsd: 500, id: `${prefix}worker_b`, operationKey: key }),
    ]);
    expect(concurrent.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(concurrent.filter((result) => result.status === "rejected")).toHaveLength(1);
    await expect(second.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey: key })).rejects.toBeInstanceOf(AiEvaluationInProgressError);
    const row = await database!.aiBudgetReservation.findFirstOrThrow({ where: { operationKey: key } });
    expect(await first.settle(row.id, null)).toBe("uncertain");
    await expect(second.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey: key })).rejects.toBeInstanceOf(AiEvaluationInProgressError);
    await second.reserve({ requestKind: "mentor", estimateMicroUsd: 500, id: `${prefix}independent`, operationKey: operationKey("independent") });
    expect(await first.summary()).toMatchObject({ uncertainMicroUsd: 500, reservedMicroUsd: 500 });
  });

  it("persists uncertain operation identity across Prisma clients", async () => {
    const first = ledger(); const key = operationKey("restart");
    const id = await first.reserve({ requestKind: "review", estimateMicroUsd: 500, id: `${prefix}restart`, operationKey: key });
    expect(await first.settle(id, null)).toBe("uncertain");
    const restartedDatabase = openDatabase(databaseUrl!);
    try {
      const restarted = new PrismaAiBudgetLedger(restartedDatabase);
      await expect(restarted.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey: key })).rejects.toBeInstanceOf(AiEvaluationInProgressError);
    } finally { await restartedDatabase.$disconnect(); }
  });

  it("releases only an explicit no-charge rejection and prevents ambiguous duplicate dispatch", async () => {
    const budget = ledger(); const key = operationKey("retry");
    const quota = Object.assign(new Error("quota"), { name: "GatewayError", statusCode: 402, type: "quota_for_entity_exceeded" });
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey: key, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => { throw quota; },
    })).rejects.toBe(quota);
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey: key, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => ({ value: "retry", costUsd: 0 }),
    })).resolves.toBe("retry");

    const ambiguousKey = operationKey("ambiguous"); let dispatches = 0;
    const ambiguous = Object.assign(new Error("upstream response"), {
      name: "GatewayError", statusCode: 429, type: "rate_limit_exceeded",
      cause: Object.assign(new Error("upstream unavailable"), { name: "APICallError", statusCode: 503, responseBody: "{}" }),
    });
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey: ambiguousKey, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => { dispatches += 1; throw ambiguous; },
    })).rejects.toBe(ambiguous);
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey: ambiguousKey, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => { dispatches += 1; return { value: "duplicate", costUsd: 0 }; },
    })).rejects.toBeInstanceOf(AiEvaluationInProgressError);
    expect(dispatches).toBe(1);
  });
});
