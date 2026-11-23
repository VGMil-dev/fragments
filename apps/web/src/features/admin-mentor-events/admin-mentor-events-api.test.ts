import { describe, expect, it, vi } from "vitest";
import { createAdminMentorEventsApi, parseMentorOperationalEvent } from "./admin-mentor-events-api.js";

const event = { event: "mentor_evaluation_failed", stage: "response_validation", result: "failure", error_code: "response_validation_failed", duration_ms: 850, occurred_at: "2026-11-22T20:00:00.000Z" };

describe("admin Mentor events API", () => {
  it("reads a bounded no-store feed and validates the allowlisted event shape", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { events: [event] } }), { status: 200 }));
    const api = createAdminMentorEventsApi(fetcher as unknown as typeof fetch);

    const result = await api.read();

    expect(fetcher).toHaveBeenCalledWith("/api/admin/mentor-events?limit=50", expect.objectContaining({ credentials: "same-origin", cache: "no-store" }));
    expect(result).toEqual({ ok: true, data: { events: [event] } });
    expect(parseMentorOperationalEvent({ ...event, proposalId: "private" })).toBeNull();
  });

  it("collapses auth errors without surfacing server details", async () => {
    const api = createAdminMentorEventsApi(async () => new Response(JSON.stringify({ ok: false, error: { code: "PRIVATE_DETAIL", message: "PRIVATE_DETAIL" } }), { status: 403 }));
    await expect(api.read()).resolves.toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    await expect(api.read()).resolves.not.toMatchObject({ error: { message: "PRIVATE_DETAIL" } });
  });

  it("rejects inconsistent result/event/error combinations and invalid pages", async () => {
    expect(parseMentorOperationalEvent({ ...event, event: "mentor_evaluation_completed" })).toBeNull();
    expect(parseMentorOperationalEvent({ ...event, duration_ms: 300_001 })).toBeNull();
    const api = createAdminMentorEventsApi(async () => new Response(JSON.stringify({ ok: true, data: { events: Array.from({ length: 51 }, () => event) } }), { status: 200 }));
    await expect(api.read()).resolves.toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
  });
});
