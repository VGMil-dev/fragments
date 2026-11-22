import { describe, expect, it, vi } from "vitest";
import { createAdminQueueApi } from "./admin-queue-api.js";

const summary = { sampledAt: "2026-11-22T15:00:00.000Z", counts: { pending: 2, leased: 1, expiredLeases: 3, failed: 4, done: 20, other: 1 } };

describe("admin queue API client with fake responses", () => {
  it("reads same-origin aggregate state and projects only known counts", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { ...summary, ids: ["private-id"], payload: { prompt: "private" } } }), { status: 200 }));
    const result = await createAdminQueueApi(fetcher).read();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/queue/summary", expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }));
    expect(result).toEqual({ ok: true, data: summary });
    expect(JSON.stringify(result)).not.toMatch(/private|payload|ids/);
  });

  it("rejects malformed counts and reports authorization errors", async () => {
    const malformed = createAdminQueueApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { ...summary, counts: { ...summary.counts, pending: -1 } } }), { status: 200 })));
    expect(await malformed.read()).toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
    const forbidden = createAdminQueueApi(vi.fn(async () => new Response(JSON.stringify({ ok: false }), { status: 403 })));
    expect(await forbidden.read()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
  });
});
