import { describe, expect, it } from "vitest";
import type { MissionDeliveryHistory } from "@fragments/contracts";
import { missionContinuationDestination, missionContinuationUrl } from "./mission-continuation.js";

const base: MissionDeliveryHistory = {
  proposalId: "proposal-1", assignmentVersionId: "mission-v1", nextDeliverableId: "delivery-2",
  deliveries: [
    { deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: [], dueDate: null, criterionIds: [] }, status: "completed", attempts: [] },
    { deliverable: { id: "delivery-2", order: 2, title: "Avance", type: "progress", requirements: [], dueDate: null, criterionIds: [] }, status: "not_started", attempts: [] },
  ],
};

const completed = (
  reviewId: string,
  status: "completed" | "failed" = "completed",
  createdAt = "2026-11-25T10:00:00.000Z",
  updatedAt = "2026-11-25T10:00:00.000Z",
) => ({
  reviewId,
  commitSha: "c".repeat(40),
  status,
  createdAt,
  updatedAt,
});

describe("missionContinuationDestination", () => {
  it("keeps unevaluated proposals in Mentor", () => expect(missionContinuationDestination(false, base)).toEqual({ destination: "/student/mentor" }));
  it("continues in Review while an ordered delivery remains", () => expect(missionContinuationDestination(true, base)).toEqual({ destination: "/student/review" }));
  it("falls back to Review when delivery state is unavailable", () => expect(missionContinuationDestination(true)).toEqual({ destination: "/student/review" }));
  it("opens Trainer on the latest completed Review for the final delivery", () => {
    const complete = {
      ...base,
      nextDeliverableId: null,
      deliveries: base.deliveries.map((delivery, index) => ({
        ...delivery,
        status: "completed" as const,
        attempts: index === 1 ? [
          completed("review-old", "completed", "2026-11-25T10:00:00.000Z", "2026-11-25T10:10:00.000Z"),
          completed("review-final", "completed", "2026-11-25T10:01:00.000Z", "2026-11-25T10:20:00.000Z"),
          completed("review-retry", "failed", "2026-11-25T10:02:00.000Z", "2026-11-25T10:30:00.000Z"),
        ] : [completed("review-proposal")],
      })),
    };
    expect(missionContinuationDestination(true, complete)).toEqual({ destination: "/student/trainer", reviewId: "review-final" });
  });
  it("uses completion time rather than creation order when Reviews finish out of order", () => {
    const complete = {
      ...base,
      nextDeliverableId: null,
      deliveries: base.deliveries.map((delivery, index) => ({
        ...delivery,
        status: "completed" as const,
        attempts: index === 1 ? [
          completed("review-finished-last", "completed", "2026-11-25T10:00:00.000Z", "2026-11-25T10:30:00.000Z"),
          completed("review-created-last", "completed", "2026-11-25T10:10:00.000Z", "2026-11-25T10:20:00.000Z"),
          completed("review-later-failed", "failed", "2026-11-25T10:40:00.000Z", "2026-11-25T10:50:00.000Z"),
        ] : [completed("review-proposal")],
      })),
    };
    expect(missionContinuationDestination(true, complete)).toEqual({ destination: "/student/trainer", reviewId: "review-finished-last" });
  });
  it("does not open Trainer if completed history has no completed Review ID for the final delivery", () => {
    const complete = { ...base, nextDeliverableId: null, deliveries: base.deliveries.map((delivery) => ({ ...delivery, status: "completed" as const, attempts: [] })) };
    expect(missionContinuationDestination(true, complete)).toEqual({ destination: "/student/review" });
  });
  it("keeps failed or unfinished deliveries in Review", () => {
    expect(missionContinuationDestination(true, { ...base, nextDeliverableId: null, deliveries: [{ ...base.deliveries[0]!, status: "failed" }] })).toEqual({ destination: "/student/review" });
  });
  it("puts the exact final Review in Trainer's URL and the project in other destinations", () => {
    expect(missionContinuationUrl("project / 1", { destination: "/student/trainer", reviewId: "review / final" }))
      .toBe("/student/trainer?reviewId=review%20%2F%20final");
    expect(missionContinuationUrl("project / 1", { destination: "/student/review" }))
      .toBe("/student/review?proposalId=project%20%2F%201");
  });
});
