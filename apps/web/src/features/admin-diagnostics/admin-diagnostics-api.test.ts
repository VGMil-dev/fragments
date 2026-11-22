import { describe, expect, it, vi } from "vitest";
import { createAdminDiagnosticsApi } from "./admin-diagnostics-api.js";

describe("admin diagnostics API client", () => {
  it("reads the bounded same-origin endpoint and projects only safe fields", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [{ requestId: "00000000-0000-4000-8000-000000000001", occurredAt: "2026-11-22T12:00:00.000Z", method: "GET", routeFamily: "health", statusCode: 503, durationMs: 20, rawUrl: "/health?token=private" }] } }), { status: 200 }));
    const result = await createAdminDiagnosticsApi(fetcher).list();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/diagnostics/requests?limit=50", expect.objectContaining({ credentials: "same-origin", cache: "no-store", method: "GET" }));
    expect(result).toEqual({ ok: true, data: { events: [{ requestId: "00000000-0000-4000-8000-000000000001", occurredAt: "2026-11-22T12:00:00.000Z", method: "GET", routeFamily: "health", statusCode: 503, durationMs: 20 }] } });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("rejects malformed or oversized diagnostic payloads", async () => {
    const tooMany = Array.from({ length: 51 }, (_, index) => ({ requestId: `fake-${index}`, occurredAt: "2026-11-22T12:00:00.000Z", method: "GET", routeFamily: "health", statusCode: 200, durationMs: 2 }));
    const api = createAdminDiagnosticsApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: tooMany } }), { status: 200 })));
    expect(await api.list()).toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
  });
});
