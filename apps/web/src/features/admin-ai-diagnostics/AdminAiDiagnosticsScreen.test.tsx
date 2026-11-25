// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAiDiagnosticsScreen } from "./AdminAiDiagnosticsScreen.js";
import type { AdminAiDiagnosticsApi } from "./admin-ai-diagnostics-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

describe("AdminAiDiagnosticsScreen", () => {
  it("renders configured model, ledger and explicit unknowns without implying remaining balance", async () => {
    const data = { configuration: { apiKeyConfigured: true, model: "fixture/model", providerOnly: "openai", inputUsdPerMillion: 1, outputUsdPerMillion: 2 }, ledger: { settledMicroUsd: 1200000, reservedMicroUsd: 20000, uncertainMicroUsd: 0 }, providerBalance: { status: "unknown" as const }, globalBudgetLimit: { status: "unknown" as const } };
    const api: AdminAiDiagnosticsApi = { read: vi.fn().mockResolvedValue({ ok: true, data }) };
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<AdminAiDiagnosticsScreen api={api} />));
    expect(container.textContent).toContain("fixture/model");
    expect(container.textContent).toContain("1,20");
    expect(container.textContent).toContain("Saldo de cuenta del proveedor: Desconocido");
    expect(container.textContent).toContain("Tope global de gasto: Desconocido");
    expect(container.textContent).not.toContain("disponible: $0");
  });

  it("shows a recoverable error without displaying private server detail", async () => {
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<AdminAiDiagnosticsScreen api={{ read: vi.fn().mockResolvedValue({ ok: false, error: { code: "AI_LEDGER_UNAVAILABLE", message: "secret fixture" } }) }} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("no se muestran como cero");
    expect(container.textContent).not.toContain("secret fixture");
    expect(container.querySelector('[aria-label="Herramientas de administración"]')).not.toBeNull();
  });

  it("hides admin navigation after an authorization denial", async () => {
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<AdminAiDiagnosticsScreen api={{ read: vi.fn().mockResolvedValue({ ok: false, error: { code: "FORBIDDEN", message: "forbidden" } }) }} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("no tiene permisos de administración");
    expect(container.querySelector('[aria-label="Herramientas de administración"]')).toBeNull();
  });
});
