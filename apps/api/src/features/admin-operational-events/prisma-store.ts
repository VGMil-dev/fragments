import { randomUUID } from "node:crypto";
import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { MentorOperationalEvent } from "../mentor/operational-events.js";
import { safeOperationalEvent } from "../mentor/operational-events.js";
import { projectReviewOperationalEvent, type ReviewOperationalEvent, type StoredReviewOperationalEvent } from "../review/review-errors.js";

export const ADMIN_OPERATIONAL_EVENT_RETENTION_DAYS = 30;
export const ADMIN_OPERATIONAL_EVENT_MAX_ROWS = 10_000;
const PAGE_MAX = 50;
const retentionQueues = new WeakMap<object, Promise<void>>();

type Source = "mentor" | "review";
type Database = Pick<PrismaClient, "operationalEvent">;
type StoredEvent = MentorOperationalEvent | StoredReviewOperationalEvent;
type Projector<T extends StoredEvent> = (input: unknown) => T | null;

/** Persists only domain-projected events; write failures never escape into academic work. */
export function createPrismaAdminOperationalLog<T extends StoredEvent>(options: {
  database: Database;
  source: Source;
  project: Projector<T>;
  now?: () => Date;
  id?: () => string;
}) {
  const now = options.now ?? (() => new Date());
  const newId = options.id ?? randomUUID;

  return {
    record(event: unknown): void {
      const projected = options.project(event);
      if (!projected) return;
      const persistable = redactForStorage(options.source, projected);
      const recordedAt = now();
      try {
        void options.database.operationalEvent.create({
          data: {
            id: newId(),
            source: options.source,
            occurredAt: new Date(persistedOccurredAt(persistable)),
            eventJson: persistable as Prisma.InputJsonValue,
            recordedAt,
          },
        }).then(async () => {
          await scheduleRetention(options.database, recordedAt);
        }).catch(() => {
          // Operational storage is best-effort and cannot change evaluation results.
        });
      } catch {
        // Also isolate synchronous adapter failures.
      }
    },

    async list(limit = PAGE_MAX): Promise<T[]> {
      const bounded = Number.isSafeInteger(limit) ? Math.min(PAGE_MAX, Math.max(1, limit)) : PAGE_MAX;
      const rows = await options.database.operationalEvent.findMany({
        where: { source: options.source, recordedAt: { gte: retentionCutoff(now()) } },
        orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
        take: bounded,
        select: { eventJson: true },
      });
      const events: T[] = [];
      for (const row of rows) {
        const projected = options.project(row.eventJson);
        if (projected) events.push(redactForStorage(options.source, projected));
      }
      return events;
    },

    async prune(): Promise<void> {
      try { await scheduleRetention(options.database, now()); }
      catch { /* Retention housekeeping must not affect the service. */ }
    },
  };
}

export function createPrismaMentorOperationalLog(database: Database, options: { now?: () => Date; id?: () => string } = {}) {
  return createPrismaAdminOperationalLog<MentorOperationalEvent>({
    database,
    source: "mentor",
    project: (input) => {
      if (!input || typeof input !== "object") return null;
      const event = input as Partial<MentorOperationalEvent>;
      if (event.result !== "success" && event.result !== "failure") return null;
      return safeOperationalEvent({
        event: event.event as MentorOperationalEvent["event"],
        stage: event.stage as MentorOperationalEvent["stage"],
        result: event.result,
        error_code: event.error_code as MentorOperationalEvent["error_code"],
        duration_ms: event.duration_ms ?? Number.NaN,
        ...(event.occurred_at !== undefined ? { occurred_at: event.occurred_at } : {}),
      });
    },
    ...options,
  });
}

export function createPrismaReviewOperationalLog(database: Database, options: { now?: () => Date; id?: () => string } = {}) {
  return createPrismaAdminOperationalLog<StoredReviewOperationalEvent>({
    database,
    source: "review",
    project: (input) => input && typeof input === "object"
      ? projectReviewOperationalEvent(input as ReviewOperationalEvent)
      : null,
    ...options,
  });
}

function persistedOccurredAt(event: StoredEvent): string {
  return "occurredAt" in event ? event.occurredAt : event.occurred_at;
}

function redactForStorage<T extends StoredEvent>(source: Source, event: T): T {
  return source === "review"
    ? { ...(event as StoredReviewOperationalEvent), reviewId: null, jobId: null } as T
    : event;
}

function retentionCutoff(now: Date): Date {
  return new Date(now.getTime() - ADMIN_OPERATIONAL_EVENT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
}

async function purgeExpired(database: Database, now: Date): Promise<void> {
  await database.operationalEvent.deleteMany({ where: { recordedAt: { lt: retentionCutoff(now) } } });
}

async function purgeOverflow(database: Database): Promise<void> {
  const overflow = await database.operationalEvent.findMany({
    orderBy: [{ recordedAt: "desc" }, { id: "desc" }],
    skip: ADMIN_OPERATIONAL_EVENT_MAX_ROWS,
    select: { id: true },
  });
  if (overflow.length) await database.operationalEvent.deleteMany({ where: { id: { in: overflow.map(({ id }) => id) } } });
}

function scheduleRetention(database: Database, now: Date): Promise<void> {
  const key = database as object;
  const previous = retentionQueues.get(key) ?? Promise.resolve();
  const current = previous.catch(() => undefined).then(async () => {
    await purgeExpired(database, now);
    await purgeOverflow(database);
  });
  retentionQueues.set(key, current);
  void current.finally(() => {
    if (retentionQueues.get(key) === current) retentionQueues.delete(key);
  }).catch(() => undefined);
  return current;
}
