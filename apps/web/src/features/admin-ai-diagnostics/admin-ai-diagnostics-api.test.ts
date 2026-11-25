import { describe, expect, it, vi } from "vitest";
import { createAdminAiDiagnosticsApi } from "./admin-ai-diagnostics-api.js";

describe("admin AI diagnostics API client", () => {
  it("reads only same-origin, uncached diagnostics and keeps external balance unknown", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ ok: true, data: {
      configuration: { apiKeyConfigured: true, model: "fixture/model", providerOnly: null, inputUsdPerMillion: 1, outputUsdPerMillion: 2 },
      ledger: { settledMicroUsd: 10, reservedMicroUsd: 0, uncertainMicroUsd: 2 }, providerBalance: { status: "unknown" }, globalBudgetLimit: { status: "unknown" }, secret: "must-not-be-projected",
    } }), { status: 200 }));
    const result = await createAdminAiDiagnosticsApi(fetcher).read();
    expect(fetcher).toHaveBeenCalledWith("/api/admin/ai-diagnostics", expect.objectContaining({ credentials: "same-origin", cache: "no-store" }));
    expect(result).toEqual({ ok: true, data: expect.objectContaining({ providerBalance: { status: "unknown" }, globalBudgetLimit: { status: "unknown" } }) });
    expect(JSON.stringify(result)).not.toContain("must-not-be-projected");
  });
  it("rejects absent budget-state declarations rather than inferring availability", async () => {
    const api = createAdminAiDiagnosticsApi(vi.fn(async () => new Response(JSON.stringify({ ok: true, data: { configuration: { apiKeyConfigured: false }, ledger: { settledMicroUsd: 0, reservedMicroUsd: 0, uncertainMicroUsd: 0 } } }), { status: 200 })));
    expect(await api.read()).toEqual({ ok: false, error: { code: "INVALID_RESPONSE" } });
  });
});
