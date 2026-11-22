import { describe, expect, it, vi } from "vitest";
import { createAdminTeachersService, parseAdminTeachersQuery } from "./service.js";

describe("admin teachers query and service", () => {
  it("defaults to a stable bounded page and rejects unknown, duplicate, oversized, or malformed query values", () => {
    expect(parseAdminTeachersQuery(new URLSearchParams())).toEqual({ ok: true, value: { limit: 20 } });
    expect(parseAdminTeachersQuery(new URLSearchParams("limit=50"))).toEqual({ ok: true, value: { limit: 50 } });
    for (const query of ["studentId=x", "limit=1&limit=2", "limit=51", "limit=0", "limit=01", "cursor=bad!"]) {
      expect(parseAdminTeachersQuery(new URLSearchParams(query)), query).toEqual({ ok: false });
    }
  });

  it("maps only approved account fields and creates an opaque cursor for the next stable page", async () => {
    const createdAt = new Date("2026-11-22T17:00:00.000Z");
    const listPage = vi.fn(async () => ({
      items: [
        { id: "teacher-fake-1", name: "Docente Fake", email: "teacher@example.test", createdAt, sessions: [{ token: "never-return" }], isTeacher: true },
      ],
      hasMore: true,
    }));
    const service = createAdminTeachersService({ listPage } as never);
    const query = parseAdminTeachersQuery(new URLSearchParams("limit=1"));
    if (!query.ok) throw new Error("valid fake query rejected");

    const result = await service.list(query.value);

    expect(result.items).toEqual([{ accountId: "teacher-fake-1", displayName: "Docente Fake", email: "teacher@example.test", createdAt: createdAt.toISOString() }]);
    expect(result.nextCursor).toBeTypeOf("string");
    const next = parseAdminTeachersQuery(new URLSearchParams(`cursor=${encodeURIComponent(result.nextCursor!)}`));
    expect(next).toEqual({ ok: true, value: { limit: 20, after: { accountId: "teacher-fake-1", createdAt: createdAt.toISOString() } } });
    expect(JSON.stringify(result)).not.toMatch(/never-return|session|token|oauth|github|banned/i);
  });
});
