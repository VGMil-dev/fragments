import { describe, expect, it } from "vitest";
import { createReviewOperationalLog } from "./operational-log.js";
import type { ReviewOperationalEvent } from "./review-errors.js";

const event: ReviewOperationalEvent = {
  event: "review.attempt.finished",
  reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd",
  jobId: "00000000-0000-4000-8000-000000000001",
  stage: "analysis_validation",
  errorCode: "AI_OUTPUT_INVALID",
  durationMs: 123,
  attempt: 1,
  finalStatus: "failed",
};

describe("Review operational log", () => {
  it("keeps a bounded newest-first sample of redacted event copies", () => {
    const log = createReviewOperationalLog(2);
    log.record(event);
    log.record({ ...event, jobId: "00000000-0000-4000-8000-000000000002" });
    log.record({ ...event, jobId: "00000000-0000-4000-8000-000000000003" });

    const firstRead = log.list();
    expect(firstRead.map((item) => item.jobId)).toEqual([
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000002",
    ]);
    (firstRead[0] as { jobId: string }).jobId = "mutated-fake-id";
    expect(log.list()[0]?.jobId).toBe("00000000-0000-4000-8000-000000000003");
  });

  it("does not retain properties outside the safe Review projection", () => {
    const log = createReviewOperationalLog();
    log.record({ ...event, privatePrompt: "FAKE_PRIVATE_PROMPT" } as never);

    expect(log.list()).toEqual([{ ...event, occurredAt: expect.any(String) }]);
    expect(JSON.stringify(log.list())).not.toContain("FAKE_PRIVATE_PROMPT");
  });
});
