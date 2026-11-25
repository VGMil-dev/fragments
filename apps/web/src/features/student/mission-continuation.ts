import type { MissionDeliveryHistory } from "@fragments/contracts";

export type MissionContinuationDestination = "/student/mentor" | "/student/review" | "/student/trainer";

export function missionContinuationDestination(hasMentorEvaluation: boolean, history?: MissionDeliveryHistory): MissionContinuationDestination {
  if (!hasMentorEvaluation) return "/student/mentor";
  if (history && history.deliveries.length > 0 && history.nextDeliverableId === null
    && history.deliveries.every((delivery) => delivery.status === "completed")) return "/student/trainer";
  return "/student/review";
}
