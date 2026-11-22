import { describe, expect, it, vi } from "vitest";
import { createAdminTeachersRepository } from "./repository.js";

describe("admin teacher directory repository with fake Prisma", () => {
  it("selects teacher-only accounts and paginates in stable newest-first order", async () => {
    const createdAt = new Date("2026-11-22T17:00:00.000Z");
    const findMany = vi.fn(async () => [
      { id: "teacher-fake-b", name: "Docente Fake B", email: "b@example.test", createdAt },
      { id: "teacher-fake-a", name: "Docente Fake A", email: "a@example.test", createdAt },
      { id: "teacher-fake-c", name: "Docente Fake C", email: "c@example.test", createdAt },
    ]);
    const repository = createAdminTeachersRepository({ user: { findMany } } as never);

    const page = await repository.listPage({ limit: 2, after: { accountId: "teacher-fake-z", createdAt: "2026-11-22T18:00:00.000Z" } });

    expect(findMany).toHaveBeenCalledWith({
      where: { AND: [
        { isTeacher: true },
        { OR: [{ role: null }, { role: { not: "admin" } }] },
        { OR: [{ createdAt: { lt: new Date("2026-11-22T18:00:00.000Z") } }, { createdAt: new Date("2026-11-22T18:00:00.000Z"), id: { lt: "teacher-fake-z" } }] },
      ] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: 3,
      select: { id: true, name: true, email: true, createdAt: true },
    });
    expect(page).toEqual({
      items: [
        { id: "teacher-fake-b", name: "Docente Fake B", email: "b@example.test", createdAt },
        { id: "teacher-fake-a", name: "Docente Fake A", email: "a@example.test", createdAt },
      ],
      hasMore: true,
    });
    expect(JSON.stringify(findMany.mock.calls[0])).not.toMatch(/session|token|oauth|github|banned|student/i);
  });

  it("uses the same strict teacher and public-field projection on the first page", async () => {
    const findMany = vi.fn(async () => []);
    const repository = createAdminTeachersRepository({ user: { findMany } } as never);

    await repository.listPage({ limit: 50 });

    const args = findMany.mock.calls[0]?.[0] as Record<string, any>;
    expect(args.take).toBe(51);
    expect(args.where.AND[0]).toEqual({ isTeacher: true });
    expect(args.select).toEqual({ id: true, name: true, email: true, createdAt: true });
  });
});
