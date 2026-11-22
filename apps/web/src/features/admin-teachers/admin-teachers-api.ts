export type AdminTeacherAccount = { accountId: string; displayName: string; email: string; createdAt: string };
export type AdminTeacherPage = { items: AdminTeacherAccount[]; nextCursor: string | null };
export type AdminTeachersResult = { ok: true; data: AdminTeacherPage } | { ok: false; error: { code: string; message: string } };
export type AdminTeachersQuery = { limit: number; cursor?: string };
export type AdminTeachersApi = { list(query: AdminTeachersQuery): Promise<AdminTeachersResult> };

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function parsePage(value: unknown): AdminTeacherPage | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const page = value as Record<string, unknown>;
  if (!exactKeys(page, ["items", "nextCursor"]) || !Array.isArray(page.items) || !(page.nextCursor === null || typeof page.nextCursor === "string")) return null;
  const items: AdminTeacherAccount[] = [];
  for (const value of page.items) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const item = value as Record<string, unknown>;
    if (!exactKeys(item, ["accountId", "displayName", "email", "createdAt"])) return null;
    if ([item.accountId, item.displayName, item.email, item.createdAt].some((field) => typeof field !== "string")) return null;
    const date = new Date(item.createdAt as string);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== item.createdAt) return null;
    items.push({ accountId: item.accountId as string, displayName: item.displayName as string, email: item.email as string, createdAt: item.createdAt as string });
  }
  return { items, nextCursor: page.nextCursor as string | null };
}

export function createAdminTeachersApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminTeachersApi {
  return {
    async list(query) {
      const params = new URLSearchParams({ limit: String(query.limit) });
      if (query.cursor) params.set("cursor", query.cursor);
      try {
        const response = await fetcher(`/api/admin/teachers?${params.toString()}`, { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          const code = response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR";
          return { ok: false, error: { code, message: "No se pudieron cargar las cuentas docentes." } };
        }
        const data = parsePage((payload as Record<string, unknown>).data);
        return data ? { ok: true, data } : { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No se pudieron cargar las cuentas docentes." } };
      }
    },
  };
}

export const adminTeachersApi = createAdminTeachersApi();
