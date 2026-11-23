import { describe, expect, it, vi } from "vitest";
import { createAdminAuditLogApi } from "./admin-audit-log-api.js";

const event = { requestId: "a8bb1a68-c5f4-4f1f-a52d-65535a5b652d", event: "admin.queue_summary.read", occurredAt: "2026-11-22T15:00:00.000Z", actorType: "admin" } as const;

describe("AdminAuditLogApi", () => {
  it("reads a redacted, allowlisted page without caching", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [event] } }), { status: 200 }));
    const result = await createAdminAuditLogApi(fetcher).read();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/audit-log?limit=50", expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }));
    expect(result).toEqual({ ok: true, data: { events: [event] } });
  });

  it("accepts the audited read of Mentor operational events", async () => {
    const mentorRead = { ...event, event: "admin.mentor_events.read" };
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [mentorRead] } }), { status: 200 }));
    expect(await createAdminAuditLogApi(fetcher).read()).toEqual({ ok: true, data: { events: [mentorRead] } });
  });

  it("rejects extra private fields, unknown event names, and oversized pages", async () => {
    const extra = createAdminAuditLogApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [{ ...event, adminActorId: "private-user-id" }] } }), { status: 200 })));
    expect((await extra.read()).ok).toBe(false);
    const unknown = createAdminAuditLogApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [{ ...event, event: "request.body.read" }] } }), { status: 200 })));
    expect((await unknown.read()).ok).toBe(false);
    const tooMany = createAdminAuditLogApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: Array.from({ length: 51 }, () => event) } }), { status: 200 })));
    expect((await tooMany.read()).ok).toBe(false);
  });

  it("returns a safe error for access failures and network errors", async () => {
    const denied = createAdminAuditLogApi(vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 403 })));
    expect(await denied.read()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    const offline = createAdminAuditLogApi(vi.fn(async () => { throw new Error("private transport detail"); }));
    expect(await offline.read()).toMatchObject({ ok: false, error: { code: "NETWORK_ERROR" } });
    expect(JSON.stringify(await offline.read())).not.toContain("private transport detail");
  });
});
