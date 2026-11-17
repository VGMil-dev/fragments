import { describe, expect, it } from "vitest";
import { classifyGatewayFailure, hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

function gatewayError(input: Record<string, unknown>): Error {
  return Object.assign(new Error("private provider response"), input);
}

describe("safe AI Gateway error classification", () => {
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

  it("recognizes a Gateway-side 429 with no provider response as a bounded retry candidate", () => {
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
      providerDispatchPossible: false,
    });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(true);
  });

  it("does not classify a Gateway 429 as safe to retry when its cause contains a provider response", () => {
    const error = gatewayError({
      name: "GatewayRateLimitError", type: "rate_limit_exceeded", statusCode: 429, isRetryable: true,
      cause: Object.assign(new Error("private"), { name: "APICallError", statusCode: 503 }),
    });
    expect(classifyGatewayFailure(error)).toMatchObject({ gatewayHttpStatus: 429, providerHttpStatus: 503, providerDispatchPossible: true });
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
