export type AdminAiDiagnostics = {
  configuration: { apiKeyConfigured: boolean; model: string | null; providerOnly: string | null; inputUsdPerMillion: number | null; outputUsdPerMillion: number | null };
  ledger: { settledMicroUsd: number; reservedMicroUsd: number; uncertainMicroUsd: number };
  providerBalance: { status: "unknown" };
  globalBudgetLimit: { status: "unknown" };
};
export type AdminAiDiagnosticsResult = { ok: true; data: AdminAiDiagnostics } | { ok: false; error: { code: string } };
export type AdminAiDiagnosticsApi = { read: () => Promise<AdminAiDiagnosticsResult> };

function isNonNegativeSafeInteger(value: unknown): value is number { return Number.isSafeInteger(value) && (value as number) >= 0; }
export function createAdminAiDiagnosticsApi(fetcher: typeof fetch = globalThis.fetch.bind(globalThis)): AdminAiDiagnosticsApi {
  return { async read() {
    try {
      const response = await fetcher("/api/admin/ai-diagnostics", { method: "GET", credentials: "same-origin", cache: "no-store", headers: { accept: "application/json" } });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object" || (payload as Record<string, unknown>).ok !== true) return { ok: false, error: { code: response.status === 401 ? "AUTH_REQUIRED" : response.status === 403 ? "FORBIDDEN" : "HTTP_ERROR" } };
      const data = (payload as Record<string, unknown>).data as Record<string, unknown> | undefined;
      const config = data?.configuration as Record<string, unknown> | undefined;
      const ledger = data?.ledger as Record<string, unknown> | undefined;
      if (!data || !config || !ledger || typeof config.apiKeyConfigured !== "boolean"
        || !["settledMicroUsd", "reservedMicroUsd", "uncertainMicroUsd"].every((key) => isNonNegativeSafeInteger(ledger[key]))
        || (data.providerBalance as { status?: unknown } | undefined)?.status !== "unknown"
        || (data.globalBudgetLimit as { status?: unknown } | undefined)?.status !== "unknown") return { ok: false, error: { code: "INVALID_RESPONSE" } };
      const optionalString = (value: unknown) => typeof value === "string" && value.length <= 120 ? value : null;
      const optionalRate = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
      return { ok: true, data: {
        configuration: { apiKeyConfigured: config.apiKeyConfigured, model: optionalString(config.model), providerOnly: optionalString(config.providerOnly), inputUsdPerMillion: optionalRate(config.inputUsdPerMillion), outputUsdPerMillion: optionalRate(config.outputUsdPerMillion) },
        ledger: { settledMicroUsd: ledger.settledMicroUsd as number, reservedMicroUsd: ledger.reservedMicroUsd as number, uncertainMicroUsd: ledger.uncertainMicroUsd as number },
        providerBalance: { status: "unknown" }, globalBudgetLimit: { status: "unknown" },
      } };
    } catch { return { ok: false, error: { code: "NETWORK_ERROR" } }; }
  } };
}
export const adminAiDiagnosticsApi = createAdminAiDiagnosticsApi();
