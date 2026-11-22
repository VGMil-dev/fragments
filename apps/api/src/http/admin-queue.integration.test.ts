import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createHttpHandler } from "./app.js";

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("integrated admin queue summary", () => {
  it("authorizes, audits before querying and returns only aggregate counts", async () => {
    const events: string[] = [];
    const database = { job: { count: vi.fn(async () => { events.push("read"); return 2; }) } } as unknown as PrismaClient;
    const auth = {
      adminCheck: vi.fn(async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null),
      userId: vi.fn(async () => "fixture-admin-id"),
    } as unknown as FragmentsAuthService;
    const auditWrite = vi.fn(async () => { events.push("audit"); });
    const server = createServer(createHttpHandler(database, { auth, adminQueueAuditWrite: auditWrite }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `http://127.0.0.1:${address.port}/api/admin/queue/summary`;

    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { "x-fixture-role": "teacher" } })).status).toBe(403);
    expect(database.job.count).not.toHaveBeenCalled();
    expect(auth.userId).not.toHaveBeenCalled();

    const response = await fetch(url, { headers: { "x-fixture-role": "admin" } });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, data: { counts: { pending: 2, leased: 2, expiredLeases: 2, failed: 2, done: 2, other: 2 } } });
    expect(JSON.stringify(body)).not.toContain("fixture-admin-id");
    expect(events[0]).toBe("audit");
    expect(events.slice(1)).toEqual(Array(6).fill("read"));
    expect(auditWrite).toHaveBeenCalledExactlyOnceWith({ requestId: response.headers.get("x-request-id"), event: "admin.queue_summary.read", occurredAt: expect.any(String), adminActorId: "fixture-admin-id" });
  });

  it("fails closed when audit cannot be written", async () => {
    const database = { job: { count: vi.fn(async () => 0) } } as unknown as PrismaClient;
    const auth = { adminCheck: async () => true, userId: async () => "fixture-admin-id" } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(database, { auth, adminQueueAuditWrite: async () => { throw new Error("fake sink failure"); } }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/queue/summary`);
    expect(response.status).toBe(503);
    expect(database.job.count).not.toHaveBeenCalled();
  });
});
