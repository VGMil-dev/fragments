// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminQueueSummaryScreen } from "./AdminQueueSummaryScreen.js";
import type { AdminQueueApi } from "./admin-queue-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fakeSummary = { sampledAt: "2026-11-22T15:00:00.000Z", counts: { pending: 2, leased: 1, expiredLeases: 3, failed: 4, done: 20, other: 1 } };
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminQueueApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminQueueSummaryScreen api={api} />));
  return container;
}

describe("AdminQueueSummaryScreen", () => {
  it("shows aggregated queue counts and reloads on demand", async () => {
    const read = vi.fn().mockResolvedValueOnce({ ok: true, data: fakeSummary }).mockResolvedValueOnce({ ok: true, data: { ...fakeSummary, counts: { ...fakeSummary.counts, pending: 0 } } });
    const view = await render({ read });
    expect(view.textContent).toContain("Estado de la cola");
    expect(view.querySelector('a[href="/admin/queue"]')?.getAttribute("aria-current")).toBe("page");
    expect(view.textContent).toContain("Leases vencidos");
    expect(view.textContent).toContain("Muestreo UTC");
    expect(view.querySelector("time")?.getAttribute("dateTime")).toBe(fakeSummary.sampledAt);
    expect(view.textContent).toContain("Conteos agregados");
    expect(view.textContent).not.toContain("private-id");
    await act(async () => view.querySelector("button")?.click());
    expect(read).toHaveBeenCalledTimes(2);
    expect(view.textContent).toContain("Pendientes");
  });

  it("shows a loading message and a recoverable error", async () => {
    let resolve!: (value: Awaited<ReturnType<AdminQueueApi["read"]>>) => void;
    const waiting = new Promise<Awaited<ReturnType<AdminQueueApi["read"]>>>((done) => { resolve = done; });
    const read = vi.fn().mockReturnValueOnce(waiting).mockRejectedValueOnce(new Error("fake-queue-error")).mockResolvedValueOnce({ ok: true, data: fakeSummary });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<AdminQueueSummaryScreen api={{ read }} />); });
    expect(container.textContent).toContain("Cargando estado de la cola");
    await act(async () => resolve({ ok: true, data: fakeSummary }));
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("No se pudo cargar el estado de la cola");
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("Completados");
  });

  it("distinguishes missing and insufficient admin access and retries with a generic fallback", async () => {
    const read = vi.fn()
      .mockResolvedValueOnce({ ok: false, error: { code: "AUTH_REQUIRED", message: "private 401 detail" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "FORBIDDEN", message: "private 403 detail" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "HTTP_ERROR", message: "private http detail" } })
      .mockResolvedValueOnce({ ok: true, data: fakeSummary });
    const view = await render({ read });

    expect(view.querySelector('[role="alert"]')?.textContent).toContain("Inicia sesión con una cuenta administradora");
    expect(view.textContent).not.toContain("private");
    expect(view.querySelector<HTMLButtonElement>("button")?.textContent).toBe("Reintentar");
    await act(async () => view.querySelector<HTMLButtonElement>("button")?.click());
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("Esta cuenta no tiene permisos de administración");
    expect(view.textContent).not.toContain("private");
    await act(async () => view.querySelector<HTMLButtonElement>("button")?.click());
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("No se pudo cargar el estado de la cola");
    await act(async () => view.querySelector<HTMLButtonElement>("button")?.click());
    expect(read).toHaveBeenCalledTimes(4);
    expect(view.textContent).toContain("Pendientes");
  });
});
