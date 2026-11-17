import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { SqliteAiBudgetLedger } from "./budget-ledger.js";
import { executeWithGatewayPolicy } from "./gateway-dispatch-policy.js";
import { classifyGatewayFailure, hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

const databases: DatabaseSync[] = [];
function makeLedger() {
  const database = new DatabaseSync(":memory:");
  databases.push(database);
  migrate(database);
  return new SqliteAiBudgetLedger(database);
}
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

function rateLimitError(cause?: unknown, generation = true, providerDispatchPossible?: boolean) {
  return Object.assign(new Error("private gateway response"), {
    name: "GatewayRateLimitError",
    type: "rate_limit_exceeded",
    statusCode: 429,
    ...(generation ? { generationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7" } : {}),
    ...(providerDispatchPossible !== undefined ? { providerDispatchPossible } : {}),
    isRetryable: true,
    ...(cause ? { cause } : {}),
  });
}

describe("bounded shared Gateway dispatch policy", () => {
  it("stops after four confirmed no-charge rate limits and releases one reservation", async () => {
    const ledger = makeLedger();
    const operationKey = "9".repeat(64);
    const generate = vi.fn(async () => { throw rateLimitError(undefined, false, false); });
    const sleeps: number[] = [];
    let now = 1_000;

    const failure = await ledger.run({
      requestKind: "mentor",
      inputTokens: 1_000,
      outputTokens: 1_000,
      operationKey,
      rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 1 },
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, {
        now: () => now,
        random: () => 0.5,
        sleep: async (ms) => { sleeps.push(ms); now += ms; },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", statusCode: 429, safeNoCharge: true });
    expect(generate).toHaveBeenCalledTimes(4);
    expect(sleeps).toHaveLength(3);
    expect(ledger.summary()).toMatchObject({ blocked: false, settledMicroUsd: 0, reservedMicroUsd: 0 });
    expect(databases[0]!.prepare("SELECT status FROM ai_budget_reservations WHERE operation_key=?").get(operationKey)).toEqual({ status: "released" });
    expect(databases[0]!.prepare("SELECT COUNT(*) AS count FROM ai_budget_reservations WHERE operation_key=?").get(operationKey)).toEqual({ count: 1 });
  });

  it("does not retry before a Retry-After longer than the per-retry wait bound", async () => {
    const ledger = makeLedger();
    const generate = vi.fn(async () => {
      throw Object.assign(rateLimitError(undefined, false, false), { responseHeaders: { "Retry-After": "40" } });
    });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000, operationKey: "a".repeat(64),
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, {
        sleep: async () => { throw new Error("Retry-After beyond the retry bound must not be slept through"); },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", retryAfterMs: 40_000, safeNoCharge: true });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: false, reservedMicroUsd: 0, settledMicroUsd: 0 });
    expect(ledger.acquireDispatchSlot("next-operation", { now: Date.now() })).toMatchObject({ waitMs: expect.any(Number) });
  });

  it("keeps an ambiguous dispatched 429 reservation uncertain after wrapping", async () => {
    const ledger = makeLedger();
    const generate = vi.fn(async () => {
      throw Object.assign(rateLimitError(undefined, false), { providerDispatchPossible: true });
    });
    const failure = await ledger.run({
      requestKind: "mentor",
      inputTokens: 1_000,
      outputTokens: 1_000,
      operationKey: "8".repeat(64),
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, {
        sleep: async () => { throw new Error("ambiguous dispatched request must not be retried"); },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", safeNoCharge: false, providerDispatchPossible: true });
    expect(classifyGatewayFailure(failure)).toMatchObject({ gatewayHttpStatus: 429, providerDispatchPossible: true });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, settledMicroUsd: 0, reservedMicroUsd: 1 });
    expect(databases[0]!.prepare("SELECT status FROM ai_budget_reservations WHERE operation_key=?").get("8".repeat(64))).toEqual({ status: "uncertain" });
  });

  it("does not retry or release a bare 429 without affirmative pre-provider evidence", async () => {
    const ledger = makeLedger();
    const generate = vi.fn(async () => { throw rateLimitError(undefined, false); });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000,
      operationKey: "7".repeat(64),
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, {
        sleep: async () => { throw new Error("unconfirmed 429 must not be retried"); },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", safeNoCharge: false, providerDispatchPossible: true });
    expect(classifyGatewayFailure(failure)).toMatchObject({ gatewayHttpStatus: 429, providerDispatchPossible: true });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, settledMicroUsd: 0, reservedMicroUsd: 1 });
    expect(databases[0]!.prepare("SELECT status FROM ai_budget_reservations WHERE operation_key=?").get("7".repeat(64))).toEqual({ status: "uncertain" });
  });

  it("backs off with jitter, honors Retry-After, and settles one logical evaluation after recovery", async () => {
    const ledger = makeLedger();
    let now = 1_000;
    const sleeps: number[] = [];
    const generate = vi.fn(async () => {
      if (generate.mock.calls.length === 1) {
        throw Object.assign(rateLimitError(undefined, false, false), { responseHeaders: { "Retry-After": "2" } });
      }
      if (generate.mock.calls.length <= 3) throw rateLimitError(undefined, false, false);
      return { value: "ok", costUsd: 0.0001 };
    });

    const result = await ledger.run({
      requestKind: "mentor",
      inputTokens: 1_000,
      outputTokens: 1_000,
      operationKey: "b".repeat(64),
      rates: { inputUsdPerMillion: 1, outputUsdPerMillion: 1 },
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, {
        now: () => now,
        random: () => 0.5,
        sleep: async (ms) => { sleeps.push(ms); now += ms; },
      }),
    });

    expect(result).toBe("ok");
    expect(generate).toHaveBeenCalledTimes(4);
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
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, { sleep: async () => undefined }),
    }).catch((error: unknown) => error);
    expect(classifyGatewayFailure(failure)).toMatchObject({ gatewayHttpStatus: 429, providerHttpStatus: 503 });

    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });

  it("does not retry when safe-no-charge conflicts with provider response evidence", async () => {
    const ledger = makeLedger();
    const generate = vi.fn(async () => {
      throw Object.assign(rateLimitError(undefined, false, false), {
        safeNoCharge: true,
        providerHttpStatus: 503,
      });
    });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000, operationKey: "b".repeat(64),
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }, {
        sleep: async () => { throw new Error("conflicting provider evidence must not be retried"); },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", safeNoCharge: false, providerDispatchPossible: false });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });

  it("keeps a 429 without callback or explicit no-dispatch evidence uncertain", async () => {
    const ledger = makeLedger();
    const generate = vi.fn(async () => { throw rateLimitError(undefined, false); });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000, operationKey: "7".repeat(64),
      isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, () => generate(), {
        sleep: async () => undefined,
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", safeNoCharge: false });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });

  it("keeps a contradictory provider response uncertain when the dispatch callback never ran", async () => {
    const ledger = makeLedger();
    const response = Object.assign(new Error("private response"), { name: "APICallError", statusCode: 503 });
    const generate = vi.fn(async () => { throw rateLimitError(response, false, false); });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000, operationKey: "f".repeat(64),
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, () => generate(), {
        sleep: async () => { throw new Error("provider response must not retry"); },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toMatchObject({ name: "GatewayRateLimitError", safeNoCharge: false });
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });

  it("does not retry a timeout when provider response evidence contradicts pre-dispatch", async () => {
    const ledger = makeLedger();
    const response = Object.assign(new Error("private response"), { name: "APICallError", responseBody: "upstream response" });
    const timeout = Object.assign(new Error("timeout"), { name: "TimeoutError", cause: response });
    const generate = vi.fn(async () => { throw timeout; });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000, operationKey: "9".repeat(64),
      isConfirmedNoCharge: (error) => (error as Error & { safeNoCharge?: boolean }).safeNoCharge === true,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, () => generate(), {
        sleep: async () => { throw new Error("ambiguous timeout must not retry"); },
      }),
    }).catch((error: unknown) => error);

    expect(failure).toBe(timeout);
    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });

  it("does not release a Gateway 402 reservation when provider code evidence exists before the callback", async () => {
    const ledger = makeLedger();
    const error = Object.assign(new Error("private response"), {
      name: "GatewayInternalServerError", type: "quota_for_entity_exceeded", statusCode: 402,
      providerDispatchPossible: false, providerCode: "provider_response_seen",
    });
    const generate = vi.fn(async () => { throw error; });
    const failure = await ledger.run({
      requestKind: "mentor", inputTokens: 1_000, outputTokens: 1_000, operationKey: "8".repeat(64),
      isConfirmedNoCharge: hasConfirmedNoChargeGatewayRejection,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, () => generate()),
    }).catch((value: unknown) => value);

    expect(failure).toBe(error);
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
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, (onDispatch) => { onDispatch(); return generate(); }),
    })).rejects.toMatchObject({ statusCode: 402 });

    expect(generate).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: false, settledMicroUsd: 0, reservedMicroUsd: 0 });
  });

  it("retries a timeout only when the fetch boundary was never reached", async () => {
    const ledger = makeLedger();
    let now = 5_000;
    const sleeps: number[] = [];
    const invoke = vi.fn(async (onDispatch: () => void) => {
      if (invoke.mock.calls.length === 1) throw Object.assign(new Error("offline timeout"), { name: "TimeoutError" });
      onDispatch();
      return { value: "recovered", costUsd: 0.0001 };
    });

    await expect(ledger.run({
      requestKind: "mentor", inputTokens: 100, outputTokens: 100, operationKey: "f".repeat(64),
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, invoke, {
        now: () => now, random: () => 0.5, sleep: async (ms) => { sleeps.push(ms); now += ms; },
      }),
    })).resolves.toBe("recovered");

    expect(invoke).toHaveBeenCalledTimes(2);
    expect(sleeps[0]).toBeGreaterThanOrEqual(100);
    expect(ledger.summary()).toMatchObject({ blocked: false, settledMicroUsd: 100, reservedMicroUsd: 0 });
  });

  it("does not retry a timeout after the fetch boundary was reached", async () => {
    const ledger = makeLedger();
    const invoke = vi.fn(async (onDispatch: () => void) => {
      onDispatch();
      throw Object.assign(new Error("offline timeout"), { name: "TimeoutError" });
    });

    await expect(ledger.run({
      requestKind: "mentor", inputTokens: 100, outputTokens: 100,
      invoke: (signals) => executeWithGatewayPolicy(ledger, signals, invoke),
    })).rejects.toMatchObject({ name: "TimeoutError" });

    expect(invoke).toHaveBeenCalledOnce();
    expect(ledger.summary()).toMatchObject({ blocked: true, reservedMicroUsd: 1, settledMicroUsd: 0 });
  });
});
