import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createRequestDiagnostics } from "./diagnostics.js";
import { createAdminDiagnosticsHttp } from "./http.js";

describe("admin diagnostics HTTP", () => {
  it("returns actual recent events to admin and no data to teacher or anonymous requests", async () => {
    const diagnostics = createRequestDiagnostics({ write: () => undefined, id: () => "fake-request-id", now: () => new Date("2026-11-22T12:00:00.000Z") });
    diagnostics.record({ method: "GET", pathname: "/health", statusCode: 200, durationMs: 7 });
    const roles = new Map<string, boolean | null>([["admin", true], ["teacher", false], ["anonymous", null]]);
    const isAdmin = vi.fn(async (request: IncomingMessage) => roles.get(request.headers["x-fake-role"] as string) ?? null);
    const route = createAdminDiagnosticsHttp(diagnostics, isAdmin);
    const server = createServer(async (request, response) => {
      const handled = await route(request, response);
      if (!handled) response.writeHead(404).end();
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fake test server did not bind");
    try {
      const base = `http://127.0.0.1:${address.port}/api/admin/diagnostics/requests?limit=1`;
      const admin = await fetch(base, { headers: { "x-fake-role": "admin" } });
      expect(admin.status).toBe(200);
      expect(await admin.json()).toMatchObject({ ok: true, data: { events: [{ requestId: "fake-request-id", routeFamily: "health", statusCode: 200 }] } });
      const teacher = await fetch(base, { headers: { "x-fake-role": "teacher" } });
      expect(teacher.status).toBe(403);
      expect(await teacher.json()).toMatchObject({ ok: false, error: { code: "FORBIDDEN" } });
      const anonymous = await fetch(base);
      expect(anonymous.status).toBe(401);
      expect(await anonymous.json()).toMatchObject({ ok: false, error: { code: "AUTH_REQUIRED" } });
      expect(isAdmin).toHaveBeenCalledTimes(3);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });

  it("clamps event count and ignores a client-supplied principal", async () => {
    const diagnostics = createRequestDiagnostics({ write: () => undefined, id: () => "fake-id" });
    for (let index = 0; index < 60; index += 1) diagnostics.record({ method: "GET", pathname: "/health", statusCode: 200, durationMs: index });
    const route = createAdminDiagnosticsHttp(diagnostics, async (request) => request.headers.cookie === "admin=true");
    let status = 0; let raw = "";
    const response = { writeHead(code: number) { status = code; return this; }, end(body?: string) { raw = body ?? ""; } } as unknown as ServerResponse;
    await route({ method: "GET", url: "/api/admin/diagnostics/requests?limit=999&role=admin", headers: { cookie: "no" } } as unknown as IncomingMessage, response);
    expect(status).toBe(403);
    expect(raw).not.toContain('"events"');
    await route({ method: "GET", url: "/api/admin/diagnostics/requests?limit=999", headers: { cookie: "admin=true" } } as unknown as IncomingMessage, response);
    expect(status).toBe(200);
    expect(JSON.parse(raw).data.events).toHaveLength(50);
  });
});
