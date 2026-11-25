import { describe, expect, it } from "vitest";
import type { MissionDeliveryHistory } from "@fragments/contracts";
import { missionContinuationDestination } from "./mission-continuation.js";

const base: MissionDeliveryHistory = {
  proposalId: "proposal-1", assignmentVersionId: "mission-v1", nextDeliverableId: "delivery-2",
  deliveries: [
    { deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: [], dueDate: null, criterionIds: [] }, status: "completed", attempts: [] },
    { deliverable: { id: "delivery-2", order: 2, title: "Avance", type: "progress", requirements: [], dueDate: null, criterionIds: [] }, status: "not_started", attempts: [] },
  ],
};

describe("missionContinuationDestination", () => {
  it("keeps unevaluated proposals in Mentor", () => expect(missionContinuationDestination(false, base)).toBe("/student/mentor"));
  it("continues in Review while an ordered delivery remains", () => expect(missionContinuationDestination(true, base)).toBe("/student/review"));
  it("falls back to Review when delivery state is unavailable", () => expect(missionContinuationDestination(true)).toBe("/student/review"));
  it("opens Trainer only after every published delivery has a completed Review", () => {
    const complete = { ...base, nextDeliverableId: null, deliveries: base.deliveries.map((delivery) => ({ ...delivery, status: "completed" as const })) };
    expect(missionContinuationDestination(true, complete)).toBe("/student/trainer");
    expect(missionContinuationDestination(true, { ...complete, deliveries: [{ ...complete.deliveries[0]!, status: "failed" }] })).toBe("/student/review");
  });
});
