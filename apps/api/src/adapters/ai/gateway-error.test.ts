import { describe, expect, it } from "vitest";
import { classifyGatewayFailure, hasConfirmedNoChargeGatewayRejection } from "./gateway-error.js";

describe("Gateway failure classification", () => {
  it("recognizes a confirmed 402 account quota rejection without provider dispatch", () => {
    const error = Object.assign(new Error("quota"), { name: "GatewayError", statusCode: 402, type: "quota_for_entity_exceeded" });
    expect(classifyGatewayFailure(error)).toMatchObject({ gatewayHttpStatus: 402, gatewayCode: "quota_for_entity_exceeded", providerDispatchPossible: false });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(true);
  });

  it("keeps an upstream 503 behind a Gateway 429 ambiguous and carries safe correlation fields", () => {
    const error = Object.assign(new Error("rate limited"), {
      name: "GatewayError", statusCode: 429, type: "rate_limit_exceeded", generationId: "gen_0123456789abcdef",
      responseHeaders: { "retry-after": "2" },
      cause: Object.assign(new Error("upstream failure"), { name: "APICallError", statusCode: 503, responseBody: "{}" }),
    });
    expect(classifyGatewayFailure(error)).toMatchObject({
      gatewayHttpStatus: 429, providerHttpStatus: 503, gatewayGenerationId: "gen_0123456789abcdef",
      retryAfterMs: 2_000, retryable: true, providerDispatchPossible: true,
    });
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
  });

  it("does not treat a bare Gateway 429 as proof that the provider was not called", () => {
    const error = Object.assign(new Error("rate limited"), { name: "GatewayError", statusCode: 429, type: "rate_limit_exceeded" });
    expect(classifyGatewayFailure(error).providerDispatchPossible).toBe(true);
    expect(hasConfirmedNoChargeGatewayRejection(error)).toBe(false);
  });
});
