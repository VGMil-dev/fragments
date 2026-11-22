import { describe, expect, it, vi } from "vitest";
import { createAdminAuditLog } from "./store.js";

const fakeAdminAudit = {
  requestId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd",
  event: "admin.queue_summary.read" as const,
  occurredAt: "2026-11-22T18:00:00.000Z",
  adminActorId: "private-fake-admin-user-id",
};

describe("admin audit log store with fake stdout", () => {
  it("records only safe allowlisted fields after the real audit line is accepted", async () => {
    const lines: string[] = [];
    const log = createAdminAuditLog({ writeLine: async (line) => { lines.push(line); } });

    await log.write(fakeAdminAudit);

    expect(JSON.parse(lines[0]!)).toEqual(fakeAdminAudit);
    expect(log.list()).toEqual([{
      requestId: fakeAdminAudit.requestId,
      event: "admin.queue_summary.read",
      occurredAt: fakeAdminAudit.occurredAt,
      actorType: "admin",
    }]);
    expect(JSON.stringify(log.list())).not.toContain("private-fake-admin-user-id");
  });

  it("does not retain an event if the actual log sink fails", async () => {
    const writeLine = vi.fn(async () => { throw new Error("fake stdout unavailable"); });
    const log = createAdminAuditLog({ writeLine });

    await expect(log.write(fakeAdminAudit)).rejects.toThrow("fake stdout unavailable");
    expect(log.list()).toEqual([]);
  });

  it("rejects unknown event names and malformed source fields before writing", async () => {
    const writeLine = vi.fn(async () => {});
    const log = createAdminAuditLog({ writeLine });

    await expect(log.write({ ...fakeAdminAudit, event: "admin.students.export" } as never)).rejects.toThrow("Unsupported admin audit event");
    await expect(log.write({ ...fakeAdminAudit, occurredAt: "not-a-date" })).rejects.toThrow("Invalid admin audit timestamp");
    await expect(log.write({ ...fakeAdminAudit, requestId: "student-123" })).rejects.toThrow("Invalid admin audit request id");
    expect(writeLine).not.toHaveBeenCalled();
    expect(log.list()).toEqual([]);
  });

  it("keeps the newest bounded entries and returns isolated copies", async () => {
    const log = createAdminAuditLog({ capacity: 2, writeLine: async () => {} });
    const write = (requestId: string) => log.write({ ...fakeAdminAudit, requestId });
    await write("00000000-0000-4000-8000-000000000001");
    await write("00000000-0000-4000-8000-000000000002");
    await write("00000000-0000-4000-8000-000000000003");

    const firstRead = log.list();
    expect(firstRead.map((entry) => entry.requestId)).toEqual([
      "00000000-0000-4000-8000-000000000003",
      "00000000-0000-4000-8000-000000000002",
    ]);
    (firstRead[0] as { requestId: string }).requestId = "mutated-fake-id";
    expect(log.list()[0]?.requestId).toBe("00000000-0000-4000-8000-000000000003");
  });

  it("does not let reads of the feed generate a new audit event", async () => {
    const writeLine = vi.fn(async () => {});
    const log = createAdminAuditLog({ writeLine });
    await log.write(fakeAdminAudit);

    log.list();

    expect(writeLine).toHaveBeenCalledTimes(1);
  });
});
