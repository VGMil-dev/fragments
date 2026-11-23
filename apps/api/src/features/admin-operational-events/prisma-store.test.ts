import { describe, expect, it, vi } from "vitest";
import { createPrismaMentorOperationalLog, createPrismaReviewOperationalLog, createPrismaTrainerOperationalLog } from "./prisma-store.js";

const mentorEvent = {
  event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none", duration_ms: 321,
  occurred_at: "2026-11-23T08:00:00.000Z",
} as const;
const reviewEvent = {
  event: "review.attempt.finished", reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd", jobId: "00000000-0000-4000-8000-000000000001",
  stage: "ai_dispatch", errorCode: "AI_GATEWAY_RATE_LIMITED", durationMs: 54, attempt: 1, finalStatus: "retry_wait",
  occurredAt: "2026-11-23T08:00:00.000Z",
};
const trainerEvent = {
  event: "trainer.attempt.finished", stage: "attempt_record", result: "success", error_code: "none", duration_ms: 87,
  occurredAt: "2026-11-23T08:00:00.000Z",
} as const;

function fakeDatabase() {
  const rows: Array<{ id: string; source: string; occurredAt: Date; eventJson: unknown; recordedAt: Date }> = [];
  const operationalEvent = {
    create: vi.fn(async ({ data }: { data: typeof rows[number] }) => { rows.push(data); return data; }),
    findMany: vi.fn(async (query: { where?: { source?: string; recordedAt?: { gte?: Date } }; skip?: number; take?: number; orderBy?: unknown; select?: { id?: boolean; eventJson?: boolean } }) => {
      let result = [...rows];
      if (query.where?.source) result = result.filter((row) => row.source === query.where?.source);
      if (query.where?.recordedAt?.gte) result = result.filter((row) => row.recordedAt >= query.where!.recordedAt!.gte!);
      result.sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime() || b.id.localeCompare(a.id));
      return result.slice(query.skip ?? 0, (query.skip ?? 0) + (query.take ?? Number.MAX_SAFE_INTEGER)).map((row) => query.select?.id ? { id: row.id } : { eventJson: row.eventJson });
    }),
    deleteMany: vi.fn(async ({ where }: { where: { recordedAt?: { lt: Date }; id?: { in: string[] } } }) => {
      const before = rows.length;
      for (let i = rows.length - 1; i >= 0; i--) {
        const row = rows[i]!;
        if ((where.recordedAt?.lt && row.recordedAt < where.recordedAt.lt) || where.id?.in.includes(row.id)) rows.splice(i, 1);
      }
      return { count: before - rows.length };
    }),
  };
  return { database: { operationalEvent } as never, rows, operationalEvent };
}

describe("Prisma admin operational logs", () => {
  it("persists a projected Mentor event and reads it from the durable store", async () => {
    const { database, operationalEvent } = fakeDatabase();
    const log = createPrismaMentorOperationalLog(database, { now: () => new Date("2026-11-23T08:00:01.000Z"), id: () => "event-mentor-1" });
    log.record({ ...mentorEvent, privatePrompt: "must-not-persist" });
    await vi.waitFor(() => expect(operationalEvent.create).toHaveBeenCalledOnce());

    await expect(log.list()).resolves.toEqual([mentorEvent]);
    expect(operationalEvent.create.mock.calls[0]![0].data.eventJson).not.toHaveProperty("privatePrompt");
  });

  it("drops Review IDs before persistence and reprojects corrupted JSON on read", async () => {
    const { database, operationalEvent, rows } = fakeDatabase();
    const log = createPrismaReviewOperationalLog(database, { now: () => new Date("2026-11-23T08:00:01.000Z"), id: () => "event-review-1" });
    log.record(reviewEvent);
    await vi.waitFor(() => expect(operationalEvent.create).toHaveBeenCalledOnce());
    expect(operationalEvent.create.mock.calls[0]![0].data.eventJson).toMatchObject({ reviewId: null, jobId: null });
    rows.push({ id: "event-corrupt", source: "review", occurredAt: new Date(), eventJson: { ...reviewEvent, privatePrompt: "unsafe" }, recordedAt: new Date("2026-11-23T08:00:02.000Z") });

    const events = await log.list(2);
    expect(events).toEqual([
      { ...reviewEvent, reviewId: null, jobId: null },
      { ...reviewEvent, reviewId: null, jobId: null },
    ]);
    expect(events[0]).not.toHaveProperty("privatePrompt");
  });

  it("persists and retrieves only the redacted Trainer attempt outcome", async () => {
    const { database, operationalEvent } = fakeDatabase();
    const log = createPrismaTrainerOperationalLog(database, { now: () => new Date("2026-11-23T08:00:01.000Z"), id: () => "event-trainer-1" });
    log.record({ ...trainerEvent, studentId: "private-student", sessionHash: "secret", challengeTitle: "private challenge" });
    await vi.waitFor(() => expect(operationalEvent.create).toHaveBeenCalledOnce());

    expect(operationalEvent.create.mock.calls[0]![0].data.source).toBe("trainer");
    expect(operationalEvent.create.mock.calls[0]![0].data.eventJson).toEqual(trainerEvent);
    await expect(log.list()).resolves.toEqual([trainerEvent]);
  });

  it("applies bounded page size and removes expired rows without throwing on sink errors", async () => {
    const { database, operationalEvent, rows } = fakeDatabase();
    const now = new Date("2026-11-23T08:00:01.000Z");
    rows.push({ id: "old", source: "mentor", occurredAt: new Date("2026-10-01T00:00:00.000Z"), eventJson: mentorEvent, recordedAt: new Date("2026-10-01T00:00:00.000Z") });
    const log = createPrismaMentorOperationalLog(database, { now: () => now, id: () => "event-mentor-2" });
    log.record(mentorEvent);
    await vi.waitFor(() => expect(rows.some((row) => row.id === "event-mentor-2")).toBe(true));
    await vi.waitFor(() => expect(operationalEvent.deleteMany).toHaveBeenCalled());
    expect(rows.some((row) => row.id === "old")).toBe(false);
    await log.list(500);
    expect(operationalEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 50, where: { source: "mentor", recordedAt: { gte: expect.any(Date) } } }));

    operationalEvent.create.mockRejectedValueOnce(new Error("database unavailable"));
    expect(() => log.record(mentorEvent)).not.toThrow();
    await vi.waitFor(() => expect(operationalEvent.create).toHaveBeenCalledTimes(2));
    operationalEvent.create.mockImplementationOnce(() => { throw new Error("synchronous adapter failure"); });
    expect(() => log.record(mentorEvent)).not.toThrow();
  });

  it("removes rows beyond the global retention cap", async () => {
    const { database, operationalEvent, rows } = fakeDatabase();
    const now = new Date("2026-11-23T08:00:01.000Z");
    for (let index = 0; index < 10_001; index++) {
      rows.push({ id: `existing-${String(index).padStart(5, "0")}`, source: "mentor", occurredAt: now, eventJson: mentorEvent, recordedAt: new Date(now.getTime() - index) });
    }
    const log = createPrismaMentorOperationalLog(database, { now: () => now, id: () => "event-overflow" });
    log.record(mentorEvent);
    await vi.waitFor(() => expect(rows).toHaveLength(10_000));
    expect(operationalEvent.deleteMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: { in: expect.any(Array) } } }));
  });

  it("physically expires old records during an idle cleanup run", async () => {
    const { database, rows } = fakeDatabase();
    const now = new Date("2026-11-23T08:00:01.000Z");
    rows.push({ id: "stale-idle-record", source: "mentor", occurredAt: new Date("2026-10-01T00:00:00.000Z"), eventJson: mentorEvent, recordedAt: new Date("2026-10-01T00:00:00.000Z") });
    const log = createPrismaMentorOperationalLog(database, { now: () => now });
    await log.prune();
    expect(rows).toHaveLength(0);
  });
});
