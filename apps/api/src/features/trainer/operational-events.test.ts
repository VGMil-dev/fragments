import { describe, expect, it } from "vitest";
import { projectTrainerOperationalEvent } from "./operational-events.js";

const base = {
  event: "trainer.attempt.finished",
  stage: "attempt_record",
  result: "success",
  error_code: "none",
  duration_ms: 87,
  occurredAt: "2026-11-23T08:00:00.000Z",
} as const;

describe("Trainer operational event projection", () => {
  it("retains only bounded allowlisted attempt outcome fields", () => {
    expect(projectTrainerOperationalEvent({ ...base, studentId: "private-student", sessionHash: "secret", challengeTitle: "private challenge", error: "raw" })).toEqual(base);
  });

  it("rejects inconsistent event outcomes and unknown event names", () => {
    expect(projectTrainerOperationalEvent({ ...base, result: "failure" })).toBeNull();
    expect(projectTrainerOperationalEvent({ ...base, event: "trainer.attempt.created" })).toBeNull();
  });

  it("normalizes invalid timestamps and clamps invalid durations", () => {
    const event = projectTrainerOperationalEvent({ ...base, duration_ms: -1, occurredAt: "not-a-date" });
    expect(event).toMatchObject({ duration_ms: 0 });
    expect(event?.occurredAt).toMatch(/^\d{4}-\d\d-\d\dT/);
  });
});
