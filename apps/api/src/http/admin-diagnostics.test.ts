import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createHttpHandler } from "./app.js";

describe("integrated admin request diagnostics", () => {
  it("serves recent sanitized request events only to admin sessions", async () => {
    const auth = {
      adminCheck: async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null,
    } as unknown as FragmentsAuthService;
    const handler = createHttpHandler({ $queryRaw: async () => { throw new Error("fixture database unavailable"); } } as unknown as PrismaClient, { auth });
    const server = createServer(handler);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("fixture server did not bind");
    const base = `http://127.0.0.1:${address.port}`;
    try {
      const health = await fetch(`${base}/health`);
      expect(health.status).toBe(503);
      expect(health.headers.get("x-request-id")).toMatch(/^[0-9a-f-]{36}$/i);

      const denied = await fetch(`${base}/api/admin/diagnostics/requests`, { headers: { "x-fixture-role": "teacher" } });
      expect(denied.status).toBe(403);
      const anonymous = await fetch(`${base}/api/admin/diagnostics/requests`);
      expect(anonymous.status).toBe(401);

      const admin = await fetch(`${base}/api/admin/diagnostics/requests`, { headers: { "x-fixture-role": "admin" } });
      expect(admin.status).toBe(200);
      const events = (await admin.json() as { data: { events: unknown[] } }).data.events;
      expect(events).toEqual(expect.arrayContaining([expect.objectContaining({ method: "GET", routeFamily: "health", statusCode: 503 })]));
      expect(JSON.stringify(events)).not.toContain("x-fixture-role");
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
