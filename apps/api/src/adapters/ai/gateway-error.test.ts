import { afterEach, describe, expect, it, vi } from "vitest";
import { classifyGatewayFailure, hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

function gatewayError(input: Record<string, unknown>): Error {
  return Object.assign(new Error("private provider response"), input);
}

describe("safe AI Gateway error classification", () => {
  afterEach(() => vi.useRealTimers());

  it("distinguishes gateway 429 from an upstream 503 and retains only safe identifiers", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError",
      type: "rate_limit_exceeded",
      statusCode: 429,
      generationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7",
      isRetryable: true,
      cause: Object.assign(new Error("private response"), {
        name: "APICallError",
        statusCode: 503,
        responseHeaders: { "Retry-After": "2" },
        responseBody: JSON.stringify({ error: { code: "service_unavailable", message: "private detail" } }),
      }),
    });

    expect(classifyGatewayFailure(error)).toEqual({
      gatewayHttpStatus: 429,
      gatewayCode: "rate_limit_exceeded",
      gatewayGenerationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7",
      providerHttpStatus: 503,
      providerCode: "service_unavailable",
      retryAfterMs: 2_000,
      retryable: true,
      providerDispatchPossible: true,
    });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
    expect(JSON.stringify(classifyGatewayFailure(error))).not.toMatch(/private|detail/);
  });

  it("keeps a bare Gateway 429 ambiguous without positive no-dispatch evidence", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError",
      type: "rate_limit_exceeded",
      statusCode: 429,
      isRetryable: true,
    });

    expect(classifyGatewayFailure(error)).toMatchObject({
      gatewayHttpStatus: 429,
      providerHttpStatus: null,
      retryable: true,
      providerDispatchPossible: true,
    });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
  });

  it("accepts an explicit pre-provider rejection signal as confirmed no-charge", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError", type: "rate_limit_exceeded", statusCode: 429,
      providerDispatchPossible: false, isRetryable: true,
    });

    expect(classifyGatewayFailure(error)).toMatchObject({ gatewayHttpStatus: 429, providerDispatchPossible: false });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(true);
  });

  it("preserves dispatch evidence after the evaluator wraps a Gateway failure", () => {
    const wrapped = Object.assign(new Error("Mentor evaluation failed"), {
      name: "MentorEvaluationFailure",
      gatewayHttpStatus: 429,
      gatewayCode: "rate_limit_exceeded",
      gatewayGenerationId: null,
      providerHttpStatus: null,
      providerCode: null,
      retryAfterMs: 2_000,
      providerDispatchPossible: false,
    });

    expect(classifyGatewayFailure(wrapped)).toMatchObject({
      gatewayHttpStatus: 429,
      gatewayCode: "rate_limit_exceeded",
      providerHttpStatus: null,
      retryAfterMs: 2_000,
      providerDispatchPossible: false,
    });
    expect(hasConfirmedNoChargeGatewayRejection(wrapped)).toBe(true);
  });

  it("does not lose provider dispatch evidence after wrapping a Gateway 429", () => {
    const wrapped = Object.assign(new Error("Mentor evaluation failed"), {
      name: "MentorEvaluationFailure",
      gatewayHttpStatus: 429,
      gatewayCode: "rate_limit_exceeded",
      gatewayGenerationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7",
      providerHttpStatus: 503,
      providerCode: "service_unavailable",
      providerDispatchPossible: true,
    });

    expect(classifyGatewayFailure(wrapped)).toMatchObject({
      gatewayHttpStatus: 429,
      gatewayGenerationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7",
      providerHttpStatus: 503,
      providerDispatchPossible: true,
    });
    expect(hasConfirmedNoChargeGatewayRejection(wrapped)).toBe(false);
  });

  it("does not classify a Gateway 429 as safe to retry when its cause contains a provider response", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError", type: "rate_limit_exceeded", statusCode: 429, isRetryable: true,
      cause: Object.assign(new Error("private"), { name: "APICallError", statusCode: 503 }),
    });
    expect(classifyGatewayFailure(error)).toMatchObject({ gatewayHttpStatus: 429, providerHttpStatus: 503, providerDispatchPossible: true });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
  });

  it("does not let a safe-no-charge marker override contradictory provider evidence", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError", type: "rate_limit_exceeded", statusCode: 429,
      safeNoCharge: true, providerDispatchPossible: false, providerHttpStatus: 503,
      isRetryable: true,
    });

    expect(classifyGatewayFailure(error)).toMatchObject({
      gatewayHttpStatus: 429, providerHttpStatus: 503, providerDispatchPossible: false,
    });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
  });

  it("detects provider response bodies even without an upstream status", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError", type: "rate_limit_exceeded", statusCode: 429,
      cause: Object.assign(new Error("private"), { name: "APICallError", responseBody: "provider response body" }),
    });
    expect(classifyGatewayFailure(error).providerDispatchPossible).toBe(true);
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
  });

  it("treats a confirmed Gateway 402 as a no-usage rejection", () => {
    const error = gatewayError({
      name: "GatewayInternalServerError",
      type: "quota_for_entity_exceeded",
      statusCode: 402,
      generationId: "gen_01M7K1YVAMRVX1VXNKJ1E661T7",
    });

    expect(classifyGatewayFailure(error)).toMatchObject({ gatewayHttpStatus: 402, gatewayCode: "quota_for_entity_exceeded" });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(true);
  });

  it("parses an HTTP-date Retry-After and ignores malformed values", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    const makeError = (retryAfter: string) => gatewayError({
      name: "GatewayRateLimitError", type: "rate_limit_exceeded", statusCode: 429,
      responseHeaders: { "Retry-After": retryAfter },
    });

    expect(classifyGatewayFailure(makeError("Thu, 01 Jan 2026 00:00:05 GMT")).retryAfterMs).toBe(5_000);
    expect(classifyGatewayFailure(makeError("not-a-date")).retryAfterMs).toBeNull();
  });

  it("keeps timeouts and unknown failures ambiguous", () => {
    expect(classifyGatewayFailure(new Error("timeout"))).toMatchObject({
      gatewayHttpStatus: null,
      providerHttpStatus: null,
      providerDispatchPossible: true,
      retryable: false,
    });
    expect(hasConfirmedNoChargeGatewayRejection(new Error("timeout"))).toBe(false);
  });
});
