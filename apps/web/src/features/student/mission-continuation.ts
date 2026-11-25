import type { MissionDeliveryHistory } from "@fragments/contracts";

export type MissionContinuation =
  | { destination: "/student/mentor" }
  | { destination: "/student/review" }
  | { destination: "/student/trainer"; reviewId: string };

export function missionContinuationUrl(proposalId: string, continuation: MissionContinuation): string {
  if (continuation.destination === "/student/trainer") {
    return `${continuation.destination}?reviewId=${encodeURIComponent(continuation.reviewId)}`;
  }
  return `${continuation.destination}?proposalId=${encodeURIComponent(proposalId)}`;
}

export function missionContinuationDestination(hasMentorEvaluation: boolean, history?: MissionDeliveryHistory): MissionContinuation {
  if (!hasMentorEvaluation) return { destination: "/student/mentor" };
  if (history && history.deliveries.length > 0 && history.nextDeliverableId === null
    && history.deliveries.every((delivery) => delivery.status === "completed")) {
    const finalDelivery = history.deliveries[history.deliveries.length - 1];
    const finalReview = finalDelivery?.attempts.filter((attempt) => attempt.status === "completed")
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)
        || Date.parse(right.createdAt) - Date.parse(left.createdAt))[0];
    if (finalReview) return { destination: "/student/trainer", reviewId: finalReview.reviewId };
  }
  return { destination: "/student/review" };
}
