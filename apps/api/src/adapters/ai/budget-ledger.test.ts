import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../../db/migrate.js";
import { AiBudgetUnavailableError, AiEvaluationInProgressError, estimateAiCallCostMicroUsd, parseGatewayCostUsd, SqliteAiBudgetLedger } from "./budget-ledger.js";
import { hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

const databases: DatabaseSync[] = [];
const temporaryDirectories: string[] = [];
function ledger(limit = 1_000_000) { const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db); return new SqliteAiBudgetLedger(db, limit); }
afterEach(() => { for (const db of databases.splice(0)) db.close(); for (const dir of temporaryDirectories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe("SqliteAiBudgetLedger", () => {
  it("normalizes Gateway receipts returned as finite decimal strings", () => {
    expect(parseGatewayCostUsd("0.0000123")).toBe(0.0000123);
    expect(parseGatewayCostUsd(0)).toBe(0);
    expect(parseGatewayCostUsd("Infinity")).toBeUndefined();
    expect(parseGatewayCostUsd("-0.1")).toBeUndefined();
  });

  it("requires a verified rate card before estimating a dispatch", () => {
    expect(estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 } })).toBe(14_000);
    expect(() => estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000 })).toThrow(AiBudgetUnavailableError);
  });

  it("enforces the local ceiling for concurrent commitments and releases only before dispatch", () => {
    const budget = ledger(1_000_000);
    const first = budget.reserve({ requestKind: "review", estimateMicroUsd: 600_000, id: "call-one", operationKey: "1".repeat(64) });
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 600_000, availableMicroUsd: 400_000, blocked: false });
    expect(() => budget.reserve({ requestKind: "review", estimateMicroUsd: 500_000, id: "call-two", operationKey: "2".repeat(64) })).toThrow(AiBudgetUnavailableError);
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 600_000, availableMicroUsd: 400_000, blocked: false });
    expect(budget.releaseBeforeDispatch(first)).toBe(true);
    expect(() => budget.reserve({ requestKind: "review", estimateMicroUsd: 500_000, id: "call-two", operationKey: "2".repeat(64) })).not.toThrow();
    expect(budget.summary().availableMicroUsd).toBe(500_000);
  });

  it("reconciles a known orphaned pre-dispatch cap without changing settled history", () => {
    const budget = ledger(1_000_000);
    const historicalId = budget.reserve({ requestKind: "mentor", estimateMicroUsd: 870, id: "mentor-history", operationKey: "3".repeat(64) });
    budget.settle(historicalId, 0.000127, 10);
    const orphanId = budget.reserve({ requestKind: "release_cap", estimateMicroUsd: 970_249, id: "orphan-release-cap", operationKey: "4".repeat(64), now: 20 });

    expect(budget.releaseBeforeDispatch(orphanId, 30)).toBe(true);
    expect(budget.releaseBeforeDispatch(orphanId, 40)).toBe(false);
    expect(budget.summary()).toMatchObject({ settledMicroUsd: 127, reservedMicroUsd: 0, availableMicroUsd: 999_873, blocked: false });
    expect(databases.at(-1)!.prepare("SELECT id, request_kind, reserved_microusd, actual_microusd, status, updated_at FROM ai_budget_reservations ORDER BY id").all()).toEqual([
      { id: "mentor-history", request_kind: "mentor", reserved_microusd: 870, actual_microusd: 127, status: "settled", updated_at: 10 },
      { id: "orphan-release-cap", request_kind: "release_cap", reserved_microusd: 970_249, actual_microusd: null, status: "released", updated_at: 30 },
    ]);
  });

  it("accounts confirmed costs and permits independent calls alongside an uncertain one", async () => {
    const budget = ledger(1_000_000);
    const rates = { inputUsdPerMillion: 100, outputUsdPerMillion: 100 };
    await expect(budget.run({ requestKind: "review", inputTokens: 1_000, outputTokens: 1_000, rates, operationKey: "5".repeat(64), invoke: async () => ({ value: "ok", costUsd: 0.1 }) })).resolves.toBe("ok");
    expect(budget.summary().settledMicroUsd).toBe(100_000);

    await expect(budget.run({ requestKind: "review", inputTokens: 1_000, outputTokens: 1_000, rates, operationKey: "6".repeat(64), invoke: async () => ({ value: "unknown" }) })).rejects.toThrow(AiBudgetUnavailableError);
    expect(budget.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 400_000 });
    expect(() => budget.reserve({ requestKind: "mentor", estimateMicroUsd: 1, operationKey: "7".repeat(64) })).not.toThrow();
  });

  it("preserves an expired uncertain reservation without blocking an independent operation", () => {
    const budget = ledger(1_000_000);
    budget.reserve({ requestKind: "mentor", estimateMicroUsd: 870, id: "historic-mentor", operationKey: "8".repeat(64), now: 1_000 });
    expect(budget.reserve({ requestKind: "review", estimateMicroUsd: 500, id: "later-review", operationKey: "b".repeat(64), now: 301_001 })).toBe("later-review");
    expect(databases.at(-1)!.prepare("SELECT id, reserved_microusd, status FROM ai_budget_reservations WHERE id='historic-mentor'").get()).toEqual({ id: "historic-mentor", reserved_microusd: 870, status: "uncertain" });
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 1_370, blocked: true });
  });

  it("serializes two workers and blocks a duplicate uncertain operation while permitting a different operation", async () => {
    const firstWorker = ledger();
    const database = databases.at(-1)!;
    const secondWorker = new SqliteAiBudgetLedger(database);
    const operationKey = "c".repeat(64);
    const concurrent = await Promise.allSettled([
      Promise.resolve().then(() => firstWorker.reserve({ requestKind: "review", estimateMicroUsd: 500, id: "worker-a", operationKey })),
      Promise.resolve().then(() => secondWorker.reserve({ requestKind: "review", estimateMicroUsd: 500, id: "worker-b", operationKey })),
    ]);
    expect(concurrent.filter((value) => value.status === "fulfilled")).toHaveLength(1);
    expect(() => secondWorker.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey })).toThrow(AiEvaluationInProgressError);
    const reservationId = database.prepare("SELECT id FROM ai_budget_reservations WHERE operation_key=?").get(operationKey) as { id: string };
    expect(firstWorker.settle(reservationId.id, null)).toBe("uncertain");
    expect(() => secondWorker.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey })).toThrow(AiEvaluationInProgressError);
    expect(secondWorker.reserve({ requestKind: "mentor", estimateMicroUsd: 500, operationKey: "d".repeat(64) })).toBeTruthy();
  });

  it("persists the operation identity across a process restart", () => {
    const directory = mkdtempSync(join(tmpdir(), "fragments-ledger-"));
    temporaryDirectories.push(directory);
    const path = join(directory, "budget.sqlite");
    const firstDatabase = new DatabaseSync(path);
    databases.push(firstDatabase);
    migrate(firstDatabase);
    const first = new SqliteAiBudgetLedger(firstDatabase);
    const operationKey = "f".repeat(64);
    const reservationId = first.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey });
    first.settle(reservationId, null);
    firstDatabase.close();
    databases.splice(databases.indexOf(firstDatabase), 1);
    const restartedDatabase = new DatabaseSync(path);
    databases.push(restartedDatabase);
    migrate(restartedDatabase);
    const restarted = new SqliteAiBudgetLedger(restartedDatabase);
    expect(() => restarted.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey })).toThrow(AiEvaluationInProgressError);
  });

  it("allows a retry only after a confirmed pre-dispatch release", () => {
    const budget = ledger();
    const operationKey = "a".repeat(64);
    const first = budget.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey });
    expect(budget.releaseBeforeDispatch(first)).toBe(true);
    expect(budget.reserve({ requestKind: "review", estimateMicroUsd: 500, operationKey })).toBeTruthy();
  });

  it("releases only an explicitly confirmed Gateway quota rejection before dispatch", async () => {
    const budget = ledger();
    const operationKey = "0".repeat(64);
    const quotaRejection = Object.assign(new Error("Gateway rejected before provider dispatch"), {
      name: "GatewayError", statusCode: 402, type: "quota_for_entity_exceeded",
    });
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => { throw quotaRejection; },
    })).rejects.toBe(quotaRejection);
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 0, blocked: false });
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => ({ value: "ok", costUsd: 0 }),
    })).resolves.toBe("ok");
  });

  it("keeps a 429 with provider response evidence uncertain and prevents a second dispatch", async () => {
    const budget = ledger();
    const operationKey = "e".repeat(64);
    let dispatches = 0;
    const ambiguous429 = Object.assign(new Error("Gateway returned an upstream response"), {
      name: "GatewayError", statusCode: 429, type: "rate_limit_exceeded",
      cause: Object.assign(new Error("upstream unavailable"), { name: "APICallError", statusCode: 503, responseBody: "{}" }),
    });
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => { dispatches += 1; throw ambiguous429; },
    })).rejects.toBe(ambiguous429);
    await expect(budget.run({
      requestKind: "review", inputTokens: 10, outputTokens: 2, rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      operationKey, isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: async () => { dispatches += 1; return { value: "duplicate", costUsd: 0 }; },
    })).rejects.toThrow(AiEvaluationInProgressError);
    expect(dispatches).toBe(1);
  });

  it("persists a known overrun and blocks further dispatches", async () => {
    const budget = ledger(1_000_000);
    const rates = { inputUsdPerMillion: 1, outputUsdPerMillion: 1 };
    await expect(budget.run({ requestKind: "mentor", inputTokens: 1, outputTokens: 1, rates, operationKey: "9".repeat(64), invoke: async () => ({ value: null, costUsd: 1.1 }) })).resolves.toBeNull();
    expect(budget.summary()).toMatchObject({ settledMicroUsd: 1_100_000, availableMicroUsd: 0 });
    expect(() => budget.reserve({ requestKind: "review", estimateMicroUsd: 1, operationKey: "a".repeat(64) })).toThrow(AiBudgetUnavailableError);
  });
});
