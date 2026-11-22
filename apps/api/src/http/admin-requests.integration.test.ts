import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createHttpHandler } from "./app.js";

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("integrated admin classroom requests", () => {
  it("uses the admin session, returns allowed fields and writes an actor audit event", async () => {
    const row = {
      id: "fixture-enrollment-id", status: "pending", source: "join_code", requestedAt: new Date("2026-11-22T12:00:00.000Z"), decidedAt: null,
      studentId: "fixture-student-id", decidedBy: null,
      classroom: { title: "Aula de integración", subject: "Programación", period: "2026 - 2027", context: "Contexto privado de fixture" },
    };
    const database = {
      classEnrollment: {
        findMany: vi.fn(async () => [row]),
        count: vi.fn(async () => 1),
      },
    } as unknown as PrismaClient;
    const auth = {
      adminCheck: vi.fn(async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null),
      userId: vi.fn(async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? "fixture-admin-id" : null),
    } as unknown as FragmentsAuthService;
    const auditEvents: unknown[] = [];
    const auditWrite = vi.fn(async (event: unknown) => { auditEvents.push(event); });
    const server = createServer(createHttpHandler(database, { auth, adminAuditWrite: auditWrite }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const url = `http://127.0.0.1:${address.port}/api/admin/classroom-requests?status=pending&limit=20`;

    const admin = await fetch(url, { headers: { "x-fixture-role": "admin" } });
    expect(admin.status).toBe(200);
    const requestId = admin.headers.get("x-request-id");
    expect(requestId).toMatch(/^[0-9a-f-]{36}$/i);
    const body = await admin.json();
    expect(body).toMatchObject({ ok: true, data: { total: 1, status: "pending", items: [{ classroomTitle: "Aula de integración", requestId: "fixture-enrollment-id" }] } });
    expect(JSON.stringify(body)).not.toMatch(/fixture-student-id|fixture-admin-id|Contexto privado|decidedBy/i);
    expect(auth.adminCheck).toHaveBeenCalledOnce();
    expect(auth.userId).toHaveBeenCalledOnce();
    expect(database.classEnrollment.findMany).toHaveBeenCalledOnce();
    expect(auditWrite).toHaveBeenCalledExactlyOnceWith({ requestId, event: "admin.classroom_requests.read", occurredAt: expect.any(String), adminActorId: "fixture-admin-id" });
    expect(JSON.stringify(auditEvents)).not.toMatch(/fixture-student-id|Contexto privado/i);

    const denied = await fetch(url, { headers: { "x-fixture-role": "teacher" } });
    expect(denied.status).toBe(403);
    expect(auth.userId).toHaveBeenCalledOnce();
    expect(database.classEnrollment.findMany).toHaveBeenCalledOnce();
    const anonymous = await fetch(url);
    expect(anonymous.status).toBe(401);
    expect(auth.userId).toHaveBeenCalledOnce();
    expect(database.classEnrollment.findMany).toHaveBeenCalledOnce();
  });
});
