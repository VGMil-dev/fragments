import { describe, expect, it, vi } from "vitest";
import { createAdminRequestsApi } from "./admin-requests-api.js";

const fakeRequest = { requestId: "fake-enrollment", classroomTitle: "Programación Móvil", subject: "Informática", period: "2026 - 2027", status: "pending", source: "join_code", requestedAt: "2026-11-22T12:00:00.000Z", decidedAt: null };

describe("admin requests API client with fake responses", () => {
  it("requests a bounded page and projects only approved request fields", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { items: [{ ...fakeRequest, studentId: "sensitive-student-id", email: "student@example.invalid", classroomContext: "private" }], total: 1, limit: 20, offset: 0, status: "pending" } }), { status: 200 }));
    const result = await createAdminRequestsApi(fetcher).list({ limit: 20, offset: 0, status: "pending" });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/classroom-requests?limit=20&offset=0&status=pending", expect.objectContaining({ method: "GET", credentials: "same-origin", cache: "no-store" }));
    expect(result).toEqual({ ok: true, data: { items: [fakeRequest], total: 1, limit: 20, offset: 0, status: "pending" } });
    expect(JSON.stringify(result)).not.toMatch(/sensitive|student@example|private/);
  });

  it("rejects payloads whose states or pagination metadata contradict the request", async () => {
    const badState = createAdminRequestsApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { items: [{ ...fakeRequest, status: "maybe" }], total: 1, limit: 20, offset: 0, status: "pending" } }), { status: 200 })));
    expect(await badState.list({ limit: 20, offset: 0, status: "pending" })).toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
    const badPage = createAdminRequestsApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { items: [], total: 0, limit: 50, offset: 0, status: null } }), { status: 200 })));
    expect(await badPage.list({ limit: 20, offset: 0, status: null })).toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
  });
});
