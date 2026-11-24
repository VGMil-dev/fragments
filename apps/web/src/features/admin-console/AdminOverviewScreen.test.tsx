// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminOverviewScreen } from "./AdminOverviewScreen.js";
import type { AdminDiagnosticsApi } from "../admin-diagnostics/admin-diagnostics-api.js";
import type { AdminQueueApi } from "../admin-queue/admin-queue-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fakeEvents = [
  { requestId: "00000000-0000-4000-8000-000000000011", occurredAt: "2026-11-24T10:00:00.000Z", method: "GET" as const, routeFamily: "mentor" as const, statusCode: 200, durationMs: 28 },
  { requestId: "00000000-0000-4000-8000-000000000012", occurredAt: "2026-11-24T10:01:00.000Z", method: "POST" as const, routeFamily: "review" as const, statusCode: 503, durationMs: 142 },
];
const fakeQueue = { sampledAt: "2026-11-24T10:02:00.000Z", counts: { pending: 2, leased: 1, expiredLeases: 0, failed: 3, done: 14, other: 0 } };
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(diagnostics: AdminDiagnosticsApi, queue: AdminQueueApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminOverviewScreen diagnosticsApi={diagnostics} queueApi={queue} />));
  return container;
}

describe("AdminOverviewScreen", () => {
  it("summarizes only returned allowlisted events and real queue counts", async () => {
    const list = vi.fn().mockResolvedValue({ ok: true, data: { events: fakeEvents } });
    const read = vi.fn().mockResolvedValue({ ok: true, data: fakeQueue });
    const view = await render({ list }, { read });

    expect(list).toHaveBeenCalledOnce();
    expect(read).toHaveBeenCalledOnce();
    expect(view.textContent).toContain("Muestra recibida: 2");
    const metric = Array.from(view.querySelectorAll(".admin-overview__metrics > div"))
      .find((item) => item.querySelector("dt")?.textContent === "Solicitudes HTTP 5xx");
    expect(metric?.querySelector("dd")?.textContent).toBe("1");
    expect(view.textContent).toContain("Mentor");
    expect(view.textContent).toContain("Review");
    expect(view.textContent).toContain("Pendientes");
    expect(view.textContent).toContain("Fallidos");
    expect(view.textContent).toContain("14");
    expect(view.querySelector(".admin-overview__sample-time time")?.getAttribute("dateTime")).toBe(fakeQueue.sampledAt);
    expect(view.textContent).not.toContain(fakeEvents[0]!.requestId);
    expect(view.querySelector('a[href="/admin/diagnostics"]')).not.toBeNull();
    expect(view.querySelector('a[href="/admin/queue"]')).not.toBeNull();
    expect(view.querySelector('a[href="/admin/teachers"]')).not.toBeNull();
  });

  it("shows an honest empty diagnostics state while retaining the queue snapshot", async () => {
    const view = await render(
      { list: vi.fn().mockResolvedValue({ ok: true, data: { events: [] } }) },
      { read: vi.fn().mockResolvedValue({ ok: true, data: fakeQueue }) },
    );
    expect(view.textContent).toContain("No hay diagnósticos recientes en la muestra recibida.");
    expect(view.textContent).toContain("Cola de trabajos");
    expect(view.textContent).toContain("2026");
  });

  it("renders loading state and independent 401, 403, and generic errors", async () => {
    let resolveDiagnostics!: (value: Awaited<ReturnType<AdminDiagnosticsApi["list"]>>) => void;
    let resolveQueue!: (value: Awaited<ReturnType<AdminQueueApi["read"]>>) => void;
    const diagnosticsWait = new Promise<Awaited<ReturnType<AdminDiagnosticsApi["list"]>>>((resolve) => { resolveDiagnostics = resolve; });
    const queueWait = new Promise<Awaited<ReturnType<AdminQueueApi["read"]>>>((resolve) => { resolveQueue = resolve; });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<AdminOverviewScreen diagnosticsApi={{ list: vi.fn().mockReturnValue(diagnosticsWait) }} queueApi={{ read: vi.fn().mockReturnValue(queueWait) }} />); });
    expect(container.textContent).toContain("Cargando el resumen de administración");
    await act(async () => {
      resolveDiagnostics({ ok: false, error: { code: "AUTH_REQUIRED", message: "fake private diagnostic detail" } });
      resolveQueue({ ok: false, error: { code: "FORBIDDEN", message: "fake private queue detail" } });
    });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("Inicia sesión con una cuenta administradora");
    expect(container.textContent).toContain("Esta cuenta no tiene permisos de administración");
    expect(container.textContent).not.toContain("fake private");

    const retry = container.querySelector<HTMLButtonElement>("button");
    const list = vi.fn().mockResolvedValue({ ok: false, error: { code: "HTTP_ERROR", message: "fake private diagnostic detail" } });
    const read = vi.fn().mockResolvedValue({ ok: false, error: { code: "NETWORK_ERROR", message: "fake private queue detail" } });
    await act(async () => root?.render(<AdminOverviewScreen diagnosticsApi={{ list }} queueApi={{ read }} />));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("No pudimos cargar los diagnósticos");
    expect(container.textContent).toContain("No se pudo cargar el estado de la cola");
    expect(container.textContent).not.toContain("fake private");
    expect(retry).not.toBeNull();
  });

  it("retries both read-only sources after an error", async () => {
    const list = vi.fn().mockResolvedValueOnce({ ok: false, error: { code: "HTTP_ERROR", message: "private" } }).mockResolvedValueOnce({ ok: true, data: { events: fakeEvents } });
    const read = vi.fn().mockResolvedValueOnce({ ok: false, error: { code: "NETWORK_ERROR", message: "private" } }).mockResolvedValueOnce({ ok: true, data: fakeQueue });
    const view = await render({ list }, { read });
    expect(view.querySelector(".admin-overview__refresh")?.textContent).toContain("Reintentar resumen");

    await act(async () => view.querySelector<HTMLButtonElement>(".admin-overview__refresh")?.click());
    expect(list).toHaveBeenCalledTimes(2);
    expect(read).toHaveBeenCalledTimes(2);
    expect(view.textContent).toContain("Muestra recibida: 2");
    expect(view.textContent).toContain("Pendientes");
    expect(view.textContent).not.toContain("private");
  });
});
