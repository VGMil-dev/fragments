import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { SqliteAiBudgetLedger } from "./budget-ledger.js";
import { executeWithGatewayPolicy } from "./gateway-dispatch-policy.js";
import { classifyGatewayFailure } from "./gateway-error.js";

const databases: DatabaseSync[] = [];
function makeLedger() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  migrate(database);
  return new SqliteAiBudgetLedger(database);
}
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

function rateLimitError(cause?: unknown, generation = true) {
  return Object.assign(new Error("private gateway response"), {
    name: "GatewayRateLimitError",
    type: "rate_limit_exceeded",
    statusCode: 429,
    ...(generation ? { generationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7" } : {}),
    isRetryable: true,
    ...(cause ? { cause } : {}),
  });
}

describe("bounded shared Gateway dispatch policy", () => {
  it("backs off with jitter, honors Retry-After, and settles one logical evaluation after recovery", async () => {
    const ledger = makeLedger();
    let now = 1_000;
    const sleeps: number[] = [];
    const generate = vi.fn(async () => {
      if (generate.mock.calls.length === 1) {
        throw Object.assign(rateLimitError(undefined, false), { responseHeaders: { "Retry-After": "2" } });
      }
      if (generate.mock.calls.length === 2) throw rateLimitError(undefined, false);
      return { value: "ok", costUsd: 0.0001 };
    });

    const result = await ledger.run({
      requestKind: "mentor",
      inputTokens: 1_000,
      outputTokens: 1_000,
      operationKey: "b".repeat(64),
      rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 1 },
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, generate, {
        now: () => now,
        random: () => 0.5,
        sleep: async (ms) => { sleeps.push(ms); now += ms; },
      }),
    });

    expect(result).toBe("ok");
    expect(generate).toHaveBeenCalledTimes(3);
    expect(sleeps[0]).toBeGreaterThanOrEqual(2_000);
    expect(ledger.summary()).toMatchObject({ settledMicroUsd: 100, reservedMicroUsd: 0, blocked: false });
    expect(databases[0]!.prepare("SELECT COUNT(*) AS count FROM ai_budget_reservations WHERE operation_key=?").get("b".repeat(64))).toEqual({ count: 1 });
  });

  it("does not retry when the rate-limited Gateway error contains a provider response", async () => {
    const ledger = makeLedger();
    const generate = vi.fn(async () => {
      throw rateLimitError(Object.assign(new Error("private provider response"), { name: "APICallError", statusCode: 503 }), false);
    });

    const failure = await ledger.run({
      requestKind: "mentor",
      inputTokens: 1_000,
      outputTokens: 1_000,
      operationKey: "c".repeat(64),
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, generate, { sleep: async () => undefined }),
    }).catch((error: unknown) => error);
    expect(classifyGatewayFailure(failure)).toMatchObject({ gatewayHttpStatus: 429, providerHttpStatus: 503 });

    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });

  it("settles a confirmed no-charge 402 without retrying or blocking the ledger", async () => {
    const ledger = makeLedger();
    const error = Object.assign(new Error("private budget response"), {
      name: "GatewayInternalServerError", type: "quota_for_entity_exceeded", statusCode: 402,
    });
    const generate = vi.fn(async () => { throw error; });

    await expect(ledger.run({
      requestKind: "mentor",
      inputTokens: 1,
      outputTokens: 1,
      operationKey: "d".repeat(64),
      isConfirmedNoCharge: (value) => (value as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, generate),
    })).rejects.toMatchObject({ statusCode: 402 });

    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: false, settledMicroUsd: 0, reservedMicroUsd: 0 });
  });
});
