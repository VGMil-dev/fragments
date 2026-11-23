import { safeOperationalEvent, type MentorOperationalEvent } from "./operational-events.js";

export const MENTOR_OPERATIONAL_LOG_CAPACITY = 100;
export const MENTOR_OPERATIONAL_LOG_PAGE_SIZE = 50;

export function createMentorOperationalLog(capacity = MENTOR_OPERATIONAL_LOG_CAPACITY) {
  const safeLimit = Number.isInteger(capacity) ? Math.min(MENTOR_OPERATIONAL_LOG_CAPACITY, Math.max(1, capacity)) : MENTOR_OPERATIONAL_LOG_CAPACITY;
  const entries: MentorOperationalEvent[] = [];

  return {
    record(event: MentorOperationalEvent): void {
      const safeEvent = safeOperationalEvent({
        event: event.event,
        stage: event.stage,
        result: event.result,
        error_code: event.error_code,
        duration_ms: event.duration_ms,
        occurred_at: event.occurred_at,
      });
      entries.unshift(safeEvent);
      if (entries.length > safeLimit) entries.length = safeLimit;
    },
    list(limit = MENTOR_OPERATIONAL_LOG_PAGE_SIZE): MentorOperationalEvent[] {
      const safePageSize = Number.isInteger(limit) ? Math.min(MENTOR_OPERATIONAL_LOG_PAGE_SIZE, Math.max(1, limit)) : MENTOR_OPERATIONAL_LOG_PAGE_SIZE;
      return entries.slice(0, safePageSize).map((event) => ({ ...event }));
    },
  };
}
