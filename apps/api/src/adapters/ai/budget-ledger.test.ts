import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../../db/migrate.js";
import { AiBudgetUnavailableError, estimateAiCallCostMicroUsd, SqliteAiBudgetLedger } from "./budget-ledger.js";

const databases: DatabaseSync[] = [];
function ledger(limit = 1_000_000) { const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db); return new SqliteAiBudgetLedger(db, limit); }
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

describe("SqliteAiBudgetLedger", () => {
  it("estimates with a configured upper rate card and fails closed without one", () => {
    expect(estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000, rates: { inputUsdPerMillion: 0.5, outputUsdPerMillion: 2 } })).toBe(14_000);
    expect(() => estimateAiCallCostMicroUsd({ inputTokens: 10_000, outputTokens: 1_000 })).toThrow(AiBudgetUnavailableError);
  });

  it("reserves in-flight amount, releases it only before dispatch, and enforces the shared ceiling", () => {
    const budget = ledger(1_000_000);
    const first = budget.reserve({ requestKind: "review", estimateMicroUsd: 600_000, id: "call-one" });
    expect(budget.summary()).toMatchObject({ reservedMicroUsd: 600_000, availableMicroUsd: 400_000, blocked: false });
    expect(() => budget.reserve({ requestKind: "review", estimateMicroUsd: 500_000, id: "call-two" })).toThrow(AiBudgetUnavailableError);
    expect(budget.releaseBeforeDispatch(first)).toBe(true);
    expect(budget.summary().availableMicroUsd).toBe(1_000_000);
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

  it("persists a known overrun and prevents further reservations", async () => {
    const budget = ledger(1_000_000);
    const rates = { inputUsdPerMillion: 1, outputUsdPerMillion: 1 };
    await expect(budget.run({ requestKind: "mentor", inputTokens: 1, outputTokens: 1, rates, invoke: async () => ({ value: null, costUsd: 1.1 }) })).rejects.toThrow(AiBudgetUnavailableError);
    expect(budget.summary()).toMatchObject({ settledMicroUsd: 1_100_000, availableMicroUsd: 0 });
    expect(() => budget.reserve({ requestKind: "review", estimateMicroUsd: 1 })).toThrow(AiBudgetUnavailableError);
  });
});
