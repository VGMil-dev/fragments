import { projectReviewOperationalEvent, type ReviewOperationalEvent, type StoredReviewOperationalEvent } from "./review-errors.js";

export const REVIEW_OPERATIONAL_LOG_CAPACITY = 100;
export const REVIEW_OPERATIONAL_LOG_PAGE_SIZE = 50;

/** Short in-process feed of the same redacted events emitted to stdout. */
export function createReviewOperationalLog(capacity = REVIEW_OPERATIONAL_LOG_CAPACITY) {
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > REVIEW_OPERATIONAL_LOG_CAPACITY) {
    throw new Error(`Review operational log capacity must be between 1 and ${REVIEW_OPERATIONAL_LOG_CAPACITY}`);
  }
  const entries: StoredReviewOperationalEvent[] = [];

  return {
    record(event: ReviewOperationalEvent): void {
      const safeEvent = projectReviewOperationalEvent(event);
      if (!safeEvent) return;
      entries.unshift(copyEvent(safeEvent));
      if (entries.length > capacity) entries.length = capacity;
    },

    list(limit = REVIEW_OPERATIONAL_LOG_PAGE_SIZE): StoredReviewOperationalEvent[] {
      const bounded = Math.max(1, Math.min(REVIEW_OPERATIONAL_LOG_PAGE_SIZE, Math.trunc(limit) || 1));
      return entries.slice(0, bounded).map(copyEvent);
    },
  };
}

function copyEvent(event: StoredReviewOperationalEvent): StoredReviewOperationalEvent {
  return {
    ...event,
    ...(event.gatewayFailure ? { gatewayFailure: { ...event.gatewayFailure } } : {}),
  };
}
