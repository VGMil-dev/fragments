import { describe, expect, it, vi } from "vitest";
import { promoteExistingTeacherToAdmin } from "./provision-better-auth-admin.js";

function fixture(rows: Array<{ id: string; isTeacher: boolean; role: string | null }>) {
  let current = [...rows];
  const findMany = vi.fn(async ({ where }: { where: { email: { equals: string } } }) => current
    .filter(() => where.email.equals.toLowerCase() === "owner@example.test")
    .slice(0, 2));
  const updateMany = vi.fn(async ({ where, data }: { where: { id: string; isTeacher: boolean; role: string | null }; data: { role: string } }) => {
    const row = current.find((candidate) => candidate.id === where.id && candidate.isTeacher === where.isTeacher && candidate.role === where.role);
    if (!row) return { count: 0 };
    row.role = data.role;
    return { count: 1 };
  });
  const findUnique = vi.fn(async ({ where }: { where: { id: string } }) => current.find((row) => row.id === where.id) ?? null);
  return { database: { user: { findMany, updateMany, findUnique } }, findMany, updateMany, findUnique, rows: current };
}

describe("existing teacher admin bootstrap", () => {
  it("requires matching explicit email confirmation and never creates users", async () => {
    const db = fixture([{ id: "teacher-1", isTeacher: true, role: "user" }]);
    await expect(promoteExistingTeacherToAdmin(db.database, { email: "owner@example.test", confirmEmail: "other@example.test" })).rejects.toThrow();
    await expect(promoteExistingTeacherToAdmin(db.database, { email: "owner@example.test", confirmEmail: "owner@example.test" })).resolves.toMatchObject({ promoted: true, isTeacher: true, isAdmin: true });
    expect(db.findMany).toHaveBeenCalledTimes(1);
    expect(db.rows).toHaveLength(1);
  });

  it("rejects absent, ambiguous, invalid, or non-teacher identities without writes", async () => {
    for (const [rows, email, confirmEmail] of [
      [[], "owner@example.test", "owner@example.test"],
      [[{ id: "a", isTeacher: true, role: "user" }, { id: "b", isTeacher: true, role: "user" }], "owner@example.test", "owner@example.test"],
      [[{ id: "a", isTeacher: false, role: "user" }], "owner@example.test", "owner@example.test"],
      [[{ id: "a", isTeacher: true, role: "user" }], "not-an-email", "not-an-email"],
    ] as const) {
      const db = fixture([...rows]);
      await expect(promoteExistingTeacherToAdmin(db.database, { email, confirmEmail })).rejects.toThrow();
      expect(db.updateMany).not.toHaveBeenCalled();
    }
  });

  it("preserves teacher and custom roles, adds admin once, and verifies the stored row", async () => {
    const db = fixture([{ id: "teacher-1", isTeacher: true, role: "user,teacher-tools" }]);
    const first = await promoteExistingTeacherToAdmin(db.database, { email: "OWNER@example.test", confirmEmail: "owner@example.test" });
    const second = await promoteExistingTeacherToAdmin(db.database, { email: "owner@example.test", confirmEmail: "owner@example.test" });
    expect(first).toMatchObject({ promoted: true, isTeacher: true, isAdmin: true });
    expect(second).toMatchObject({ promoted: false, isTeacher: true, isAdmin: true });
    expect(db.rows[0]).toEqual({ id: "teacher-1", isTeacher: true, role: "teacher-tools,admin" });
    expect(db.updateMany).toHaveBeenCalledOnce();
  });

  it("fails closed when the conditional update races or verification differs", async () => {
    const db = fixture([{ id: "teacher-1", isTeacher: true, role: "user" }]);
    db.updateMany.mockResolvedValue({ count: 0 });
    await expect(promoteExistingTeacherToAdmin(db.database, { email: "owner@example.test", confirmEmail: "owner@example.test" })).rejects.toThrow();
  });
});
