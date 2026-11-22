import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createAdminClassroomRequestsHttp } from "./http.js";

const fakePage = {
  items: [{ requestId: "fake-enrollment-1", classroomTitle: "Programación Móvil", subject: "Informática", period: "2026 - 2027", status: "pending", source: "join_code", requestedAt: "2026-11-22T12:00:00.000Z", decidedAt: null }],
  total: 1,
};

describe("admin classroom requests HTTP with fake data", () => {
  it("returns only persisted request fields to admins and denies anonymous/teacher requests without data", async () => {
    const store = { list: vi.fn(async () => fakePage) };
    const roles = new Map<string, boolean | null>([["admin", true], ["teacher", false]]);
    const isAdmin = vi.fn(async (request: IncomingMessage) => roles.get(request.headers["x-fake-role"] as string) ?? null);
    const handler = createAdminClassroomRequestsHttp(store, isAdmin);
    const server = createServer(async (request, response) => {
      if (await handler(request, response) === "unhandled") response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fake test server did not bind");
    try {
      const url = `http://127.0.0.1:${address.port}/api/admin/classroom-requests?status=pending&limit=1`;
      const admin = await fetch(url, { headers: { "x-fake-role": "admin" } });
      expect(admin.status).toBe(200);
      const body = await admin.json();
      expect(body).toMatchObject({ ok: true, data: { items: fakePage.items, total: 1, limit: 1, offset: 0, status: "pending" } });
      expect(JSON.stringify(body)).not.toMatch(/studentId|githubLogin|email|context|decidedBy/i);
      expect(store.list).toHaveBeenCalledWith({ limit: 1, offset: 0, status: "pending" });

      const teacher = await fetch(url, { headers: { "x-fake-role": "teacher" } });
      expect(teacher.status).toBe(403);
      expect(await teacher.json()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const anonymous = await fetch(url);
      expect(anonymous.status).toBe(401);
      expect(await anonymous.json()).toMatchObject({ ok: false, error: { code: "AUTH_REQUIRED" } });
      expect(store.list).toHaveBeenCalledTimes(1);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("rejects unknown status and clamps pagination without trusting query identity", async () => {
    const store = { list: vi.fn(async () => ({ items: [], total: 0 })) };
    const handler = createAdminClassroomRequestsHttp(store, async (request) => request.headers["x-fake-role"] === "admin");
    let statusCode = 0;
    let payload = "";
    const response = { writeHead(code: number) { statusCode = code; return this; }, end(body?: string) { payload = body ?? ""; } } as unknown as ServerResponse;

    await handler({ method: "GET", url: "/api/admin/classroom-requests?status=other&role=admin", headers: { "x-fake-role": "admin" } } as unknown as IncomingMessage, response);
    expect(statusCode).toBe(400);
    expect(store.list).not.toHaveBeenCalled();
    await handler({ method: "GET", url: "/api/admin/classroom-requests?limit=500&offset=0&role=teacher", headers: { "x-fake-role": "admin" } } as unknown as IncomingMessage, response);
    expect(statusCode).toBe(200);
    expect(store.list).toHaveBeenCalledWith({ limit: 50, offset: 0 });
    expect(JSON.parse(payload).data).toMatchObject({ total: 0, limit: 50, offset: 0, status: null });
  });
});
