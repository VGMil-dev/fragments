import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createAdminQueueSummaryHttp } from "./http.js";

const fakeSummary = { sampledAt: "2026-11-22T15:00:00.000Z", counts: { pending: 2, leased: 1, expiredLeases: 3, failed: 4, done: 20, other: 1 } };

describe("admin queue summary HTTP with fake data", () => {
  it("returns aggregated counts only to admins and denies teacher/anonymous without querying the store", async () => {
    const store = { read: vi.fn(async () => fakeSummary) };
    const roles = new Map<string, boolean | null>([["admin", true], ["teacher", false]]);
    const isAdmin = vi.fn(async (request: IncomingMessage) => roles.get(request.headers["x-fake-role"] as string) ?? null);
    const auditWrite = vi.fn();
    const getActorId = vi.fn(async () => "fake-admin-actor-id");
    const handler = createAdminQueueSummaryHttp(store, isAdmin, { getActorId, write: auditWrite, id: () => "fake-audit-request-id", now: () => new Date("2026-11-22T15:05:00.000Z") });
    const server = createServer(async (request, response) => { if (await handler(request, response) === "unhandled") response.writeHead(404).end(); });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fake test server did not bind");
    try {
      const url = `http://127.0.0.1:${address.port}/api/admin/queue/summary`;
      const admin = await fetch(url, { headers: { "x-fake-role": "admin" } });
      expect(admin.status).toBe(200);
      const body = await admin.json();
      expect(body).toEqual({ ok: true, data: fakeSummary });
      expect(JSON.stringify(body)).not.toMatch(/payload|jobId|leaseOwner|errorCode|studentId|fake-admin-actor-id/i);
      expect(auditWrite).toHaveBeenCalledExactlyOnceWith({ requestId: "fake-audit-request-id", event: "admin.queue_summary.read", occurredAt: "2026-11-22T15:05:00.000Z", adminActorId: "fake-admin-actor-id" });
      const teacher = await fetch(url, { headers: { "x-fake-role": "teacher" } });
      expect(teacher.status).toBe(403);
      expect(await teacher.json()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const anonymous = await fetch(url);
      expect(anonymous.status).toBe(401);
      expect(await anonymous.json()).toMatchObject({ ok: false, error: { code: "AUTH_REQUIRED" } });
      expect(store.read).toHaveBeenCalledTimes(1);
      expect(auditWrite).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("fails closed when summary storage is unavailable", async () => {
    const store = { read: vi.fn(async () => { throw new Error("fake-database-error"); }) };
    const handler = createAdminQueueSummaryHttp(store, async () => true, { getActorId: async () => "fake-admin-id", write: () => undefined });
    let statusCode = 0;
    let payload = "";
    const response = { writeHead(code: number) { statusCode = code; return this; }, end(body?: string) { payload = body ?? ""; } } as never;
    await handler({ method: "GET", url: "/api/admin/queue/summary", headers: {} } as never, response);
    expect(statusCode).toBe(503);
    expect(payload).not.toContain("pending");
    expect(payload).not.toContain("fake-database-error");
  });

  it("does not disclose queue data if audit identity or sink is unavailable", async () => {
    const store = { read: vi.fn(async () => fakeSummary) };
    const auditWrite = vi.fn(async () => { throw new Error("fake-audit-sink-error"); });
    const handler = createAdminQueueSummaryHttp(store, async () => true, {
      getActorId: async () => "fake-admin-actor-id", write: auditWrite, id: () => "fake-audit-id",
      now: () => new Date("2026-11-22T15:05:00.000Z"),
    });
    let statusCode = 0;
    let payload = "";
    const response = { getHeader: () => "server-generated-request-id", writeHead(code: number) { statusCode = code; return this; }, end(body?: string) { payload = body ?? ""; } } as never;
    await handler({ method: "GET", url: "/api/admin/queue/summary", headers: {} } as never, response);
    expect(statusCode).toBe(503);
    expect(payload).not.toContain("pending");
    expect(payload).not.toContain("fake-admin-actor-id");
    expect(auditWrite).toHaveBeenCalledExactlyOnceWith({ requestId: "server-generated-request-id", event: "admin.queue_summary.read", occurredAt: "2026-11-22T15:05:00.000Z", adminActorId: "fake-admin-actor-id" });
  });
});
