import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createHttpHandler } from "./app.js";

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

describe("integrated admin teacher directory", () => {
  it("requires admin, writes the audit event before reading, and returns only directory fields", async () => {
    const events: string[] = [];
    const rows = [{ id: "teacher-fake-1", name: "Docente Fake", email: "teacher@example.test", createdAt: new Date("2026-11-22T18:00:00.000Z"), sessions: [{ token: "never-return" }] }];
    const user = { findMany: vi.fn(async () => { events.push("database.read"); return rows; }) };
    const database = { user } as unknown as PrismaClient;
    const auth = {
      adminCheck: vi.fn(async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null),
      userId: vi.fn(async () => "private-fixture-admin-id"),
    } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(database, {
      auth,
      adminAuditLogWriteLine: async (line) => { events.push(`audit:${JSON.parse(line).event}`); },
    }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `http://127.0.0.1:${address.port}`;
    const admin = { headers: { "x-fixture-role": "admin" } };

    expect((await fetch(`${url}/api/admin/teachers`)).status).toBe(401);
    expect((await fetch(`${url}/api/admin/teachers`, { headers: { "x-fixture-role": "teacher" } })).status).toBe(403);
    expect(events).toEqual([]);

    const response = await fetch(`${url}/api/admin/teachers?limit=10`, admin);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({ ok: true, data: { items: [{ accountId: "teacher-fake-1", displayName: "Docente Fake", email: "teacher@example.test", createdAt: "2026-11-22T18:00:00.000Z" }], nextCursor: null } });
    expect(JSON.stringify(body)).not.toMatch(/private-fixture-admin-id|never-return|session|token/i);
    expect(events).toEqual(["audit:admin.teachers.list", "database.read"]);
    expect(user.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 11, select: { id: true, name: true, email: true, createdAt: true } }));
  });

  it("fails closed when the audit writer rejects the read", async () => {
    const user = { findMany: vi.fn(async () => []) };
    const database = { user } as unknown as PrismaClient;
    const auth = { adminCheck: async () => true, userId: async () => "private-fixture-admin-id" } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(database, {
      auth,
      adminAuditLogWriteLine: async () => { throw new Error("fake sink unavailable"); },
    }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/teachers`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "AUDIT_UNAVAILABLE" } });
    expect(user.findMany).not.toHaveBeenCalled();
  });
});
