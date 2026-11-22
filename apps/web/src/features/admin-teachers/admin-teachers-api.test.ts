import { describe, expect, it, vi } from "vitest";
import { createAdminTeachersApi } from "./admin-teachers-api.js";

const fakeTeacherPage = {
  items: [{ accountId: "teacher-fake-1", displayName: "Docente Fake", email: "teacher@example.test", createdAt: "2026-11-22T17:00:00.000Z" }],
  nextCursor: "fake-cursor",
};

describe("admin teachers API with fake fetch", () => {
  it("requests only the admin directory route with same-origin credentials and a strict cursor query", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) => new Response(JSON.stringify({ ok: true, data: fakeTeacherPage }), { status: 200 }));
    const api = createAdminTeachersApi(fetcher as typeof fetch);

    expect(await api.list({ limit: 25, cursor: "fake-cursor" })).toEqual({ ok: true, data: fakeTeacherPage });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("/api/admin/teachers?limit=25&cursor=fake-cursor");
    expect(init).toMatchObject({ method: "GET", credentials: "same-origin", cache: "no-store" });
  });

  it("rejects malformed response fields and hides server details on failures", async () => {
    const malformed = createAdminTeachersApi(async () => new Response(JSON.stringify({ ok: true, data: { ...fakeTeacherPage, items: [{ ...fakeTeacherPage.items[0], studentId: "leak" }] } }), { status: 200 }));
    expect(await malformed.list({ limit: 20 })).toMatchObject({ ok: false, error: { code: "INVALID_RESPONSE" } });
    const denied = createAdminTeachersApi(async () => new Response(JSON.stringify({ ok: false, error: { code: "FORBIDDEN", message: "private detail" } }), { status: 403 }));
    expect(await denied.list({ limit: 20 })).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
    expect(JSON.stringify(await denied.list({ limit: 20 }))).not.toContain("private detail");
  });
});
