import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../../db/migrate.js";
import { AiBudgetUnavailableError, estimateAiCallCostMicroUsd, parseGatewayCostUsd, SqliteAiBudgetLedger } from "./budget-ledger.js";

const databases: DatabaseSync[] = [];
function ledger(limit = 1_000_000) { const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db); return new SqliteAiBudgetLedger(db, limit); }
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

describe("SqliteAiBudgetLedger", () => {
  it("normalizes Gateway receipts returned as finite decimal strings", () => {
    expect(parseGatewayCostUsd("0.0000123")).toBe(0.0000123);
    expect(parseGatewayCostUsd(0)).toBe(0);
    expect(parseGatewayCostUsd("Infinity")).toBeUndefined();
    expect(parseGatewayCostUsd("-0.1")).toBeUndefined();
  });

  it("uses the configured upper rate card or a minimum reservation when rates are unavailable", () => {
    expect(estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 } })).toBe(14_000);
    expect(estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000 })).toBe(1);
  });

  it("records reservations above the old local ceiling and releases only before dispatch", () => {
    const budget = ledger(1_000_000);
    const first = budget.reserve({ requestKind: "review", estimateMicroUsd: 600_000, id: "call-one" });
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 600_000, availableMicroUsd: 400_000, blocked: false });
    budget.reserve({ requestKind: "review", estimateMicroUsd: 500_000, id: "call-two" });
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 1_100_000, availableMicroUsd: 0, blocked: false });
    expect(budget.releaseBeforeDispatch(first)).toBe(true);
    expect(budget.summary().availableMicroUsd).toBe(500_000);
  });

  it("reconciles a known orphaned pre-dispatch cap without changing settled history", () => {
    const budget = ledger(1_000_000);
    const historicalId = budget.reserve({ requestKind: "mentor", estimateMicroUsd: 870, id: "mentor-history" });
    budget.settle(historicalId, 0.000127, 10);
    const orphanId = budget.reserve({ requestKind: "release_cap", estimateMicroUsd: 970_249, id: "orphan-release-cap", now: 20 });

    expect(budget.releaseBeforeDispatch(orphanId, 30)).toBe(true);
    expect(budget.releaseBeforeDispatch(orphanId, 40)).toBe(false);
    expect(budget.summary()).toMatchObject({ settledMicroUsd: 127, reservedMicroUsd: 0, availableMicroUsd: 999_873, blocked: false });
    expect(databases.at(-1)!.prepare("SELECT id, request_kind, reserved_microusd, actual_microusd, status, updated_at FROM ai_budget_reservations ORDER BY id").all()).toEqual([
      { id: "mentor-history", request_kind: "mentor", reserved_microusd: 870, actual_microusd: 127, status: "settled", updated_at: 10 },
      { id: "orphan-release-cap", request_kind: "release_cap", reserved_microusd: 970_249, actual_microusd: null, status: "released", updated_at: 30 },
    ]);
  });

  it("accounts provider cost and blocks future calls when the receipt is absent or overruns its reservation", async () => {
    const budget = ledger(1_000_000);
    const rates = { inputUsdPerMillion: 100, outputUsdPerMillion: 100 };
    await expect(budget.run({ requestKind: "review", inputTokens: 1_000, outputTokens: 1_000, rates, invoke: async () => ({ value: "ok", costUsd: 0.1 }) })).resolves.toBe("ok");
    expect(budget.summary().settledMicroUsd).toBe(100_000);

    await expect(budget.run({ requestKind: "review", inputTokens: 1_000, outputTokens: 1_000, rates, invoke: async () => ({ value: "unknown" }) })).rejects.toThrow(AiBudgetUnavailableError);
    expect(budget.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 400_000 });
    expect(() => budget.reserve({ requestKind: "mentor", estimateMicroUsd: 1 })).toThrow(AiBudgetUnavailableError);
  });

  it("persists a known overrun without enforcing the old local ceiling", async () => {
    const budget = ledger(1_000_000);
    const rates = { inputUsdPerMillion: 1, outputUsdPerMillion: 1 };
    await expect(budget.run({ requestKind: "mentor", inputTokens: 1, outputTokens: 1, rates, invoke: async () => ({ value: null, costUsd: 1.1 }) })).resolves.toBeNull();
    expect(budget.summary()).toMatchObject({ settledMicroUsd: 1_100_000, availableMicroUsd: 0 });
    expect(() => budget.reserve({ requestKind: "review", estimateMicroUsd: 1 })).not.toThrow();
  });
});
