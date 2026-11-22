// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminDiagnosticsScreen } from "./AdminDiagnosticsScreen.js";
import type { AdminDiagnosticsApi } from "./admin-diagnostics-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const rows = [{ requestId: "00000000-0000-4000-8000-000000000001", occurredAt: "2026-11-22T12:00:00.000Z", method: "GET" as const, routeFamily: "health" as const, statusCode: 503, durationMs: 31 }];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminDiagnosticsApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminDiagnosticsScreen api={api} />));
  return container;
}

describe("AdminDiagnosticsScreen", () => {
  it("shows recent safe request events and reloads on demand", async () => {
    const list = vi.fn().mockResolvedValueOnce({ ok: true, data: { events: rows } }).mockResolvedValueOnce({ ok: true, data: { events: [] } });
    const view = await render({ list });
    expect(view.textContent).toContain("health");
    expect(view.textContent).toContain("503");
    expect(view.textContent).toContain("00000000-0000-4000-8000-000000000001");
    const button = view.querySelector("button");
    await act(async () => button?.click());
    expect(list).toHaveBeenCalledTimes(2);
    expect(view.textContent).toContain("No hay solicitudes recientes.");
  });

  it("shows visible loading, empty and recoverable error states", async () => {
    let resolve!: (value: Awaited<ReturnType<AdminDiagnosticsApi["list"]>>) => void;
    const waiting = new Promise<Awaited<ReturnType<AdminDiagnosticsApi["list"]>>>((done) => { resolve = done; });
    const list = vi.fn().mockReturnValueOnce(waiting).mockRejectedValueOnce(new Error("fake-network-error"));
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<AdminDiagnosticsScreen api={{ list }} />); });
    expect(container.textContent).toContain("Cargando diagnósticos");
    await act(async () => resolve({ ok: true, data: { events: [] } } as never));
    expect(container.textContent).toContain("No hay solicitudes recientes.");
    const button = container.querySelector("button");
    await act(async () => button?.click());
    expect(container.textContent).toContain("No pudimos cargar los diagnósticos");
  });
});
