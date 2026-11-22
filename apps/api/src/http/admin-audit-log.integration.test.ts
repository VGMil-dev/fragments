import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createHttpHandler } from "./app.js";

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

describe("integrated admin audit log", () => {
  it("authenticates, writes the read audit, returns prior real events, and redacts identity", async () => {
    const output: string[] = [];
    const database = { job: { count: vi.fn(async () => 0) } } as unknown as PrismaClient;
    const auth = {
      adminCheck: vi.fn(async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null),
      userId: vi.fn(async () => "private-fixture-admin-id"),
    } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(database, { auth, adminAuditLogWriteLine: async (line) => { output.push(line); } }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `http://127.0.0.1:${address.port}`;
    const admin = { headers: { "x-fixture-role": "admin" } };

    expect((await fetch(`${url}/api/admin/audit-log?limit=50`)).status).toBe(401);
    expect((await fetch(`${url}/api/admin/audit-log?limit=50`, { headers: { "x-fixture-role": "teacher" } })).status).toBe(403);
    expect(output).toEqual([]);

    const queue = await fetch(`${url}/api/admin/queue/summary`, admin);
    expect(queue.status).toBe(200);
    const queueRequestId = queue.headers.get("x-request-id");
    const response = await fetch(`${url}/api/admin/audit-log?limit=1`, admin);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, data: { events: [{ requestId: queueRequestId, event: "admin.queue_summary.read", actorType: "admin" }] } });
    expect(body.data.events).toHaveLength(1);
    expect(JSON.stringify(body)).not.toContain("private-fixture-admin-id");
    expect(output.map((line) => JSON.parse(line).event)).toEqual(["admin.queue_summary.read", "admin.audit_log.read"]);
    expect(JSON.parse(output[1]!)).toMatchObject({ event: "admin.audit_log.read", adminActorId: "private-fixture-admin-id" });
  });

  it("rejects invalid limits before reading the store or writing an audit event", async () => {
    const output: string[] = [];
    const database = { job: { count: vi.fn(async () => 0) } } as unknown as PrismaClient;
    const auth = { adminCheck: async () => true, userId: async () => "private-fixture-admin-id" } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(database, { auth, adminAuditLogWriteLine: (line) => { output.push(line); } }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/audit-log?limit=51`);
    expect(response.status).toBe(400);
    expect(output).toEqual([]);
    expect(database.job.count).not.toHaveBeenCalled();
  });

  it("fails closed when the audit sink cannot record the log read", async () => {
    const database = { job: { count: vi.fn(async () => 0) } } as unknown as PrismaClient;
    const auth = { adminCheck: async () => true, userId: async () => "private-fixture-admin-id" } as unknown as FragmentsAuthService;
    const writeLine = vi.fn(async () => { throw new Error("fake stdout unavailable"); });
    const server = createServer(createHttpHandler(database, { auth, adminAuditLogWriteLine: writeLine }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/audit-log`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "AUDIT_UNAVAILABLE" } });
    expect(writeLine).toHaveBeenCalledTimes(1);
    expect(database.job.count).not.toHaveBeenCalled();
  });
});
