import type { AdminTeacherCursor, AdminTeacherRepository, AdminTeacherRepositoryQuery } from "./repository.js";

export const ADMIN_TEACHER_PAGE_SIZE = 20;
export const ADMIN_TEACHER_MAX_PAGE_SIZE = 50;
const cursorKeySet = ["accountId", "createdAt"];

export type AdminTeacherPage = {
  items: Array<{ accountId: string; displayName: string; email: string; createdAt: string }>;
  nextCursor: string | null;
};
export type AdminTeachersQuery = AdminTeacherRepositoryQuery;
export type ParsedAdminTeachersQuery = { ok: true; value: AdminTeachersQuery } | { ok: false };

export function parseAdminTeachersQuery(params: URLSearchParams): ParsedAdminTeachersQuery {
  const entries = [...params.entries()];
  if (entries.some(([key]) => key !== "limit" && key !== "cursor")) return { ok: false };
  if (params.getAll("limit").length > 1 || params.getAll("cursor").length > 1) return { ok: false };

  const rawLimit = params.get("limit");
  let limit = ADMIN_TEACHER_PAGE_SIZE;
  if (rawLimit !== null) {
    if (!/^(?:[1-9]|[1-4]\d|50)$/.test(rawLimit)) return { ok: false };
    limit = Number(rawLimit);
  }

  const rawCursor = params.get("cursor");
  if (rawCursor === null) return { ok: true, value: { limit } };
  const after = decodeCursor(rawCursor);
  return after ? { ok: true, value: { limit, after } } : { ok: false };
}

export function createAdminTeachersService(repository: AdminTeacherRepository) {
  return {
    async list(query: AdminTeachersQuery): Promise<AdminTeacherPage> {
      const page = await repository.listPage(query);
      const items = page.items.map((row) => ({
        accountId: row.id,
        displayName: row.name,
        email: row.email,
        createdAt: row.createdAt.toISOString(),
      }));
      const last = page.items.at(-1);
      return {
        items,
        nextCursor: page.hasMore && last ? encodeCursor({ accountId: last.id, createdAt: last.createdAt.toISOString() }) : null,
      };
    },
  };
}

function encodeCursor(cursor: AdminTeacherCursor): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

function decodeCursor(value: string): AdminTeacherCursor | null {
  if (value.length === 0 || value.length > 512 || !/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    if (Buffer.from(decoded, "utf8").toString("base64url") !== value) return null;
    const parsed: unknown = JSON.parse(decoded);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    const keys = Object.keys(record).sort();
    if (keys.length !== cursorKeySet.length || keys[0] !== cursorKeySet[0] || keys[1] !== cursorKeySet[1]) return null;
    if (typeof record.accountId !== "string" || record.accountId.trim().length === 0 || record.accountId.length > 200) return null;
    if (typeof record.createdAt !== "string") return null;
    const date = new Date(record.createdAt);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== record.createdAt) return null;
    return { accountId: record.accountId, createdAt: record.createdAt };
  } catch {
    return null;
  }
}
