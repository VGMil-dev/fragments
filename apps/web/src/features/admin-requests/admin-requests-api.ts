export const enrollmentStatuses = ["pending", "active", "rejected", "removed"] as const;
export type EnrollmentStatus = (typeof enrollmentStatuses)[number];
export type AdminEnrollmentRequest = {
  requestId: string;
  classroomTitle: string;
  subject: string;
  period: string | null;
  status: EnrollmentStatus;
  source: "join_code" | "teacher_assignment";
  requestedAt: string;
  decidedAt: string | null;
};
export type AdminRequestsPage = { items: AdminEnrollmentRequest[]; total: number; limit: number; offset: number; status: EnrollmentStatus | null };
export type AdminRequestsResult = { ok: true; data: AdminRequestsPage } | { ok: false; error: { code: string; message: string } };
export type AdminRequestsApi = { list(input: { limit: number; offset: number; status: EnrollmentStatus | null }): Promise<AdminRequestsResult> };

const statusSet = new Set<string>(enrollmentStatuses);
function parseItem(value: unknown): AdminEnrollmentRequest | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.requestId !== "string" || row.requestId.length < 1 || row.requestId.length > 100) return null;
  if (typeof row.classroomTitle !== "string" || typeof row.subject !== "string") return null;
  if (row.period !== null && typeof row.period !== "string") return null;
  if (typeof row.status !== "string" || !statusSet.has(row.status)) return null;
  if (row.source !== "join_code" && row.source !== "teacher_assignment") return null;
  if (typeof row.requestedAt !== "string" || Number.isNaN(Date.parse(row.requestedAt))) return null;
  if (row.decidedAt !== null && (typeof row.decidedAt !== "string" || Number.isNaN(Date.parse(row.decidedAt)))) return null;
  return { requestId: row.requestId, classroomTitle: row.classroomTitle, subject: row.subject, period: row.period as string | null, status: row.status as EnrollmentStatus, source: row.source, requestedAt: row.requestedAt, decidedAt: row.decidedAt as string | null };
}

export function createAdminRequestsApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminRequestsApi {
  return {
    async list(input) {
      const params = new URLSearchParams({ limit: String(input.limit), offset: String(input.offset) });
      if (input.status) params.set("status", input.status);
      try {
        const response = await fetcher(`/api/admin/classroom-requests?${params.toString()}`, { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          return { ok: false, error: { code: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR", message: "No se pudieron cargar las solicitudes académicas." } };
        }
        const data = (payload as Record<string, unknown>).data;
        if (!data || typeof data !== "object") return invalidResponse();
        const page = data as Record<string, unknown>;
        if (!Array.isArray(page.items) || page.items.length > 50 || !Number.isSafeInteger(page.total) || (page.total as number) < 0 || page.limit !== input.limit || page.offset !== input.offset) return invalidResponse();
        if (page.status !== (input.status ?? null)) return invalidResponse();
        const items = page.items.map(parseItem);
        if (items.some((item) => item === null)) return invalidResponse();
        return { ok: true, data: { items: items as AdminEnrollmentRequest[], total: page.total as number, limit: input.limit, offset: input.offset, status: input.status } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No se pudieron cargar las solicitudes académicas." } };
      }
    },
  };
}

function invalidResponse(): AdminRequestsResult {
  return { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
}

export const adminRequestsApi = createAdminRequestsApi();
