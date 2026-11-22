import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminReviewEventsHttp } from "./http.js";
import type { ReviewOperationalEvent } from "../review/review-errors.js";

const reviewEvent: ReviewOperationalEvent = {
  event: "review.attempt.finished", reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd", jobId: "00000000-0000-4000-8000-000000000001",
  stage: "result_persistence", errorCode: null, durationMs: 250, attempt: 1, finalStatus: "completed", occurredAt: "2026-11-22T20:00:00.000Z",
};

describe("admin Review events endpoint", () => {
  const servers: Array<ReturnType<typeof createServer>> = [];
  afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

  async function request(allowed: boolean | null, overrides: { actor?: string | null; failAudit?: boolean; limit?: number } = {}) {
    const calls: string[] = [];
    const store = { list: vi.fn(() => { calls.push("list"); return [reviewEvent]; }) };
    const auditWrite = vi.fn(async () => { calls.push("audit"); if (overrides.failAudit) throw new Error("fake sink failure"); });
    const handler = createAdminReviewEventsHttp(store, async () => allowed, {
      getActorId: async () => overrides.actor === undefined ? "fake-admin-id" : overrides.actor,
      write: auditWrite,
      id: () => "00000000-0000-4000-8000-000000000099",
      now: () => new Date("2026-11-22T20:00:00.000Z"),
    });
    const server = createServer(async (req, res) => { if (await handler(req, res) === "unhandled") res.writeHead(404).end(); });
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fake server did not bind");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/review-events${overrides.limit === undefined ? "" : `?limit=${overrides.limit}`}`);
    return { response, payload: await response.json() as Record<string, unknown>, store, auditWrite, calls };
  }

  it("rejects anonymous and teacher reads before audit or store access", async () => {
    for (const role of [null, false] as const) {
      const { response, store, auditWrite } = await request(role);
      expect(response.status).toBe(role === null ? 401 : 403);
      expect(store.list).not.toHaveBeenCalled();
      expect(auditWrite).not.toHaveBeenCalled();
    }
  });

  it("audits an admin read before returning only the bounded event sample", async () => {
    const { response, payload, store, auditWrite, calls } = await request(true, { limit: 1 });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(auditWrite).toHaveBeenCalledWith(expect.objectContaining({ event: "admin.review_events.read", adminActorId: "fake-admin-id" }));
    expect(store.list).toHaveBeenCalledWith(1);
    expect(calls).toEqual(["audit", "list"]);
    expect(payload).toEqual({ ok: true, data: { events: [reviewEvent] } });
  });

  it("fails closed when audit identity or audit sink is unavailable", async () => {
    const missingActor = await request(true, { actor: null });
    expect(missingActor.response.status).toBe(503);
    expect(missingActor.store.list).not.toHaveBeenCalled();
    const missingSink = await request(true, { failAudit: true });
    expect(missingSink.response.status).toBe(503);
    expect(missingSink.store.list).not.toHaveBeenCalled();
  });

  it("rejects invalid limits before writing an audit event", async () => {
    const { response, auditWrite, store } = await request(true, { limit: 51 });
    expect(response.status).toBe(400);
    expect(auditWrite).not.toHaveBeenCalled();
    expect(store.list).not.toHaveBeenCalled();
  });
});
