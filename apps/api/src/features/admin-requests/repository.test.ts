import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createAdminClassroomRequestsRepository } from "./repository.js";

describe("admin classroom requests repository with fake Prisma delegate", () => {
  it("reads a bounded page from real enrollment fields and omits student and classroom private context", async () => {
    const row = { id: "fake-enrollment-id", status: "pending", source: "join_code", requestedAt: new Date("2026-11-22T12:00:00.000Z"), decidedAt: null,
      classroom: { title: "Programación Móvil", subject: "Informática", period: "2026 - 2027", context: "private classroom context" },
      studentId: "fake-student-id", decidedBy: "fake-teacher-id" };
    const prisma = { classEnrollment: { findMany: vi.fn(async () => [row]), count: vi.fn(async () => 1) } } as unknown as PrismaClient;
    const result = await createAdminClassroomRequestsRepository(prisma).list({ limit: 10, offset: 0, status: "pending" });

    expect(prisma.classEnrollment.findMany).toHaveBeenCalledWith({
      where: { status: "pending" }, orderBy: [{ requestedAt: "desc" }, { id: "desc" }], skip: 0, take: 10,
      select: { id: true, status: true, source: true, requestedAt: true, decidedAt: true, classroom: { select: { title: true, subject: true, period: true } } },
    });
    expect(result).toEqual({ items: [{ requestId: "fake-enrollment-id", classroomTitle: "Programación Móvil", subject: "Informática", period: "2026 - 2027", status: "pending", source: "join_code", requestedAt: "2026-11-22T12:00:00.000Z", decidedAt: null }], total: 1 });
    expect(JSON.stringify(result)).not.toMatch(/fake-student|private classroom|fake-teacher/i);
  });
});
