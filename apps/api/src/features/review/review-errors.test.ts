import { describe, expect, it, vi } from "vitest";
import { writeReviewOperationalEvent } from "./review-errors.js";

const validEvent = {
  event: "review.attempt.finished" as const,
  reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd",
  jobId: "00000000-0000-4000-8000-000000000001",
  stage: "ai_dispatch" as const,
  errorCode: "AI_GATEWAY_RATE_LIMITED" as const,
  durationMs: 1234,
  attempt: 2,
  finalStatus: "retry_wait" as const,
  gatewayFailure: {
    gatewayHttpStatus: 429,
    gatewayCode: "rate_limit_exceeded",
    gatewayGenerationId: "gen_0123456789abcdef",
    providerHttpStatus: 503,
    providerCode: "upstream_unavailable",
    retryAfterMs: 2000,
    providerDispatchPossible: true,
  },
};

describe("safe Review operational events", () => {
  it("writes only normalized allowlisted fields", () => {
    const write = vi.fn();
    writeReviewOperationalEvent({ ...validEvent, privatePrompt: "FAKE_SECRET_PROMPT" } as never, write);

    expect(write).toHaveBeenCalledOnce();
    const output = JSON.parse(write.mock.calls[0]![0] as string);
    expect(output).toEqual(validEvent);
    expect(JSON.stringify(output)).not.toContain("FAKE_SECRET_PROMPT");
  });

  it("drops unsafe identifiers and provider details without logging their values", () => {
    const write = vi.fn();
    writeReviewOperationalEvent({
      ...validEvent,
      reviewId: "student@example.test",
      jobId: "job\nFAKE_TOKEN",
      gatewayFailure: { ...validEvent.gatewayFailure, providerCode: "FAKE_TOKEN\nAuthorization" },
    } as never, write);

    const output = JSON.parse(write.mock.calls[0]![0] as string);
    expect(output.reviewId).toBeNull();
    expect(output.jobId).toBeNull();
    expect(output.gatewayFailure.providerCode).toBeNull();
    expect(JSON.stringify(output)).not.toContain("FAKE_TOKEN");
    expect(JSON.stringify(output)).not.toContain("student@example.test");
  });

  it("drops opaque provider codes even when they use log-safe characters", () => {
    const write = vi.fn();
    writeReviewOperationalEvent({
      ...validEvent,
      gatewayFailure: { ...validEvent.gatewayFailure, providerCode: "sk_live_FAKE_SECRET_123" },
    } as never, write);

    const output = JSON.parse(write.mock.calls[0]![0] as string);
    expect(output.gatewayFailure.providerCode).toBeNull();
    expect(JSON.stringify(output)).not.toContain("FAKE_SECRET");
  });

  it("does not let sink errors affect the worker", () => {
    const write = vi.fn(() => { throw new Error("FAKE_SINK_FAILURE"); });

    expect(() => writeReviewOperationalEvent(validEvent, write)).not.toThrow();
    expect(write).toHaveBeenCalledOnce();
  });

  it("contains asynchronous writer failures", async () => {
    const write = vi.fn(async () => { throw new Error("FAKE_ASYNC_SINK_FAILURE"); });

    expect(() => writeReviewOperationalEvent(validEvent, write)).not.toThrow();
    await Promise.resolve();
    expect(write).toHaveBeenCalledOnce();
  });
});
