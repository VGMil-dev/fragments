import { createServer } from "node:http";
import type { IncomingMessage } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminTeachersHttp } from "./http.js";
import type { AdminTeacherPage } from "./service.js";

const fakePage: AdminTeacherPage = {
  items: [{ accountId: "teacher-fake-1", displayName: "Docente Fake", email: "teacher@example.test", createdAt: "2026-11-22T17:00:00.000Z" }],
  nextCursor: null,
};
const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

async function start(handler: ReturnType<typeof createAdminTeachersHttp>) {
  const server = createServer(async (request, response) => { if (await handler(request, response) === "unhandled") response.writeHead(404).end(); });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fake server did not bind");
  return `http://127.0.0.1:${address.port}`;
}

describe("admin teachers HTTP with fixture roles and fake store", () => {
  it("audits before listing and returns only the approved teacher directory fields", async () => {
    const order: string[] = [];
    const store = { list: vi.fn(async () => { order.push("store.read"); return fakePage; }) };
    const isAdmin = vi.fn(async (request: IncomingMessage) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null);
    const audit = {
      getActorId: vi.fn(async () => { order.push("actor"); return "private-fake-admin-id"; }),
      write: vi.fn(async (event) => { order.push("audit.write"); expect(event).toMatchObject({ event: "admin.teachers.list", adminActorId: "private-fake-admin-id" }); }),
      id: () => "00000000-0000-4000-8000-000000000001",
      now: () => new Date("2026-11-22T18:00:00.000Z"),
    };
    const base = await start(createAdminTeachersHttp(store, isAdmin, audit));

    const response = await fetch(`${base}/api/admin/teachers?limit=10`, { headers: { "x-fixture-role": "admin" } });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: fakePage });
    expect(order).toEqual(["actor", "audit.write", "store.read"]);
    expect(audit.write).toHaveBeenCalledWith({ requestId: "00000000-0000-4000-8000-000000000001", event: "admin.teachers.list", occurredAt: "2026-11-22T18:00:00.000Z", adminActorId: "private-fake-admin-id" });
  });

  it("denies anonymous and teacher roles without audit or data reads", async () => {
    const store = { list: vi.fn(async () => fakePage) };
    const audit = { getActorId: vi.fn(async () => "private-fake-admin-id"), write: vi.fn(async () => {}) };
    const base = await start(createAdminTeachersHttp(store, async (request) => request.headers["x-fixture-role"] === "teacher" ? false : null, audit));

    expect((await fetch(`${base}/api/admin/teachers`, { headers: { "x-fixture-role": "teacher" } })).status).toBe(403);
    expect((await fetch(`${base}/api/admin/teachers`)).status).toBe(401);
    expect(audit.write).not.toHaveBeenCalled();
    expect(store.list).not.toHaveBeenCalled();
  });

  it("fails closed when audit identity or writer is unavailable", async () => {
    const store = { list: vi.fn(async () => fakePage) };
    const noActor = { getActorId: vi.fn(async () => null), write: vi.fn(async () => {}) };
    const baseNoActor = await start(createAdminTeachersHttp(store, async () => true, noActor));
    expect((await fetch(`${baseNoActor}/api/admin/teachers`, { headers: { "x-fixture-role": "admin" } })).status).toBe(503);

    const failedAudit = { getActorId: vi.fn(async () => "private-fake-admin-id"), write: vi.fn(async () => { throw new Error("fake-sink-failure"); }) };
    const baseFailedAudit = await start(createAdminTeachersHttp(store, async () => true, failedAudit));
    expect((await fetch(`${baseFailedAudit}/api/admin/teachers`, { headers: { "x-fixture-role": "admin" } })).status).toBe(503);
    expect(store.list).not.toHaveBeenCalled();
  });

  it("rejects invalid query and non-GET actions without reading or writing", async () => {
    const store = { list: vi.fn(async () => fakePage) };
    const audit = { getActorId: vi.fn(async () => "private-fake-admin-id"), write: vi.fn(async () => {}) };
    const base = await start(createAdminTeachersHttp(store, async () => true, audit));
    expect((await fetch(`${base}/api/admin/teachers?limit=51`, { headers: { "x-fixture-role": "admin" } })).status).toBe(400);
    expect((await fetch(`${base}/api/admin/teachers`, { method: "POST", headers: { "x-fixture-role": "admin" } })).status).toBe(404);
    expect(audit.write).not.toHaveBeenCalled();
    expect(store.list).not.toHaveBeenCalled();
  });
});
