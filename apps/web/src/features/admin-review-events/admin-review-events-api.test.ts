import { describe, expect, it, vi } from "vitest";
import { createAdminReviewEventsApi, parseReviewOperationalEvent } from "./admin-review-events-api.js";

const event = {
  event: "review.attempt.finished", reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd", jobId: "00000000-0000-4000-8000-000000000001",
  stage: "ai_dispatch", errorCode: "AI_GATEWAY_RATE_LIMITED", durationMs: 1000, attempt: 2, finalStatus: "retry_wait", occurredAt: "2026-11-22T20:00:00.000Z",
  gatewayFailure: { gatewayHttpStatus: 429, gatewayCode: "rate_limit_exceeded", gatewayGenerationId: "gen_0123456789abcdef", providerHttpStatus: 503, providerCode: "upstream_unavailable", retryAfterMs: 2000, providerDispatchPossible: true },
};

describe("admin Review events API", () => {
  it("uses same-origin, uncached read and validates the complete event shape", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [event] } }), { status: 200 }));
    const api = createAdminReviewEventsApi(fetcher as unknown as typeof fetch);

    await expect(api.read()).resolves.toEqual({ ok: true, data: { events: [event] } });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/review-events?limit=50", expect.objectContaining({ credentials: "same-origin", cache: "no-store" }));
  });

  it("rejects unknown properties and opaque code strings", () => {
    expect(parseReviewOperationalEvent({ ...event, prompt: "FAKE_PRIVATE_PROMPT" })).toBeNull();
    expect(parseReviewOperationalEvent({ ...event, gatewayFailure: { ...event.gatewayFailure, providerCode: "sk_live_FAKE_SECRET_123" } })).toBeNull();
  });

  it("maps 401 and 403 without exposing response bodies", async () => {
    for (const [status, code] of [[401, "AUTH_REQUIRED"], [403, "FORBIDDEN"]] as const) {
      const api = createAdminReviewEventsApi(async () => new Response(JSON.stringify({ ok: false, error: { code: "PRIVATE_BACKEND_DETAIL", message: "PRIVATE_BACKEND_DETAIL" } }), { status }));
      const result = await api.read();
      expect(result).toMatchObject({ ok: false, error: { code } });
      expect(JSON.stringify(result)).not.toContain("PRIVATE_BACKEND_DETAIL");
    }
  });
});
