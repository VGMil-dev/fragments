import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer, type Server } from "node:http";
import type { PrismaClient } from "../generated/prisma/client.js";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createHttpHandler } from "./app.js";

const servers: Server[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
});

describe("HTTP feature routing", () => {
  it("dispatches teacher-linked Review routes before the classroom catch-all", async () => {
    const database = {
      classroom: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;
    const auth = {
      userId: vi.fn().mockResolvedValue("user-fixture"),
      teacherId: vi.fn().mockResolvedValue("teacher-fixture"),
    } as unknown as FragmentsAuthService;
    const listForTeacherClassroom = vi.fn().mockResolvedValue([]);
    const server = createServer(createHttpHandler(database, {
      auth,
      review: {
        store: { listForTeacherClassroom } as never,
        service: {} as never,
        resolveContext: async () => null,
        resolveTeacherId: async () => "teacher-fixture",
      },
    }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/teacher/classrooms/class-fixture/reviews`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: [] });
    expect(listForTeacherClassroom).toHaveBeenCalledWith("teacher-fixture", "class-fixture");
    expect(database.classroom.findFirst).not.toHaveBeenCalled();
  });

  it("dispatches classroom assignment routes before the classroom catch-all", async () => {
    const database = {
      classroom: { findFirst: vi.fn().mockResolvedValue(null) },
    } as unknown as PrismaClient;
    const auth = {
      userId: vi.fn().mockResolvedValue("user-fixture"),
      teacherId: vi.fn().mockResolvedValue("teacher-fixture"),
    } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler(database, { auth }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/teacher/classrooms/class-fixture/assignments`);
    const body = await response.json() as { error?: { message?: string } };

    expect(response.status).toBe(404);
    expect(body.error?.message).toBe("No se encontró un aula activa propia.");
    expect(database.classroom.findFirst).toHaveBeenCalledOnce();
  });
});
