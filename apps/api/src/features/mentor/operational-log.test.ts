import { describe, expect, it } from "vitest";
import { createMentorOperationalLog } from "./operational-log.js";
import type { MentorOperationalEvent } from "./operational-events.js";

const event: MentorOperationalEvent = {
  event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none",
  duration_ms: 125, occurred_at: "2026-11-22T20:00:00.000Z",
};

describe("Mentor operational event buffer", () => {
  it("stores newest events first, enforces its capacity and returns a copy", () => {
    const log = createMentorOperationalLog(2);
    log.record(event);
    log.record({ ...event, duration_ms: 250 });
    log.record({ ...event, duration_ms: 375 });

    const result = log.list(2);
    expect(result.map((entry) => entry.duration_ms)).toEqual([375, 250]);
    expect(result[0]?.occurred_at).toBe(event.occurred_at);
    result[0]!.duration_ms = 1;
    expect(log.list(2)[0]!.duration_ms).toBe(375);
  });

  it("reprojects every field through the operational allowlist", () => {
    const log = createMentorOperationalLog();
    log.record({ ...event, duration_ms: 900_000, studentId: "student-secret", score: 99, prompt: "private prompt" } as never);

    expect(log.list(1)[0]).toMatchObject({ event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none", duration_ms: 300_000 });
    expect(Object.keys(log.list(1)[0]!).sort()).toEqual(["duration_ms", "error_code", "event", "occurred_at", "result", "stage"]);
    expect(JSON.stringify(log.list(1))).not.toMatch(/student-secret|private prompt|99/);
  });
});
