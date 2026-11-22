export type AdminQueueSummary = {
  sampledAt: string;
  counts: { pending: number; leased: number; expiredLeases: number; failed: number; done: number; other: number };
};
export type AdminQueueResult = { ok: true; data: AdminQueueSummary } | { ok: false; error: { code: string; message: string } };
export type AdminQueueApi = { read(): Promise<AdminQueueResult> };

function parseSummary(value: unknown): AdminQueueSummary | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const counts = raw.counts;
  if (typeof raw.sampledAt !== "string" || Number.isNaN(Date.parse(raw.sampledAt)) || !counts || typeof counts !== "object") return null;
  const rawCounts = counts as Record<string, unknown>;
  const keys = ["pending", "leased", "expiredLeases", "failed", "done", "other"] as const;
  if (Object.keys(rawCounts).length !== keys.length || keys.some((key) => !Number.isSafeInteger(rawCounts[key]) || (rawCounts[key] as number) < 0)) return null;
  return { sampledAt: raw.sampledAt, counts: {
    pending: rawCounts.pending as number,
    leased: rawCounts.leased as number,
    expiredLeases: rawCounts.expiredLeases as number,
    failed: rawCounts.failed as number,
    done: rawCounts.done as number,
    other: rawCounts.other as number,
  } };
}

export function createAdminQueueApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminQueueApi {
  return {
    async read() {
      try {
        const response = await fetcher("/api/admin/queue/summary", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
        const payload: unknown = await response.json();
        if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) {
          return { ok: false, error: { code: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR", message: "No se pudo cargar el estado de la cola." } };
        }
        const data = parseSummary((payload as Record<string, unknown>).data);
        return data ? { ok: true, data } : { ok: false, error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." } };
      } catch {
        return { ok: false, error: { code: "NETWORK_ERROR", message: "No se pudo cargar el estado de la cola." } };
      }
    },
  };
}

export const adminQueueApi = createAdminQueueApi();
