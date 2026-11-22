// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminRequestsScreen } from "./AdminRequestsScreen.js";
import type { AdminRequestsApi } from "./admin-requests-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const item = { requestId: "fake-enrollment", classroomTitle: "Programación Móvil", subject: "Informática", period: "2026 - 2027", status: "pending" as const, source: "join_code" as const, requestedAt: "2026-11-22T12:00:00.000Z", decidedAt: null };
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminRequestsApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminRequestsScreen api={api} />));
  return container;
}

describe("AdminRequestsScreen", () => {
  it("shows a persisted pending request and applies a real status filter", async () => {
    const list = vi.fn().mockResolvedValue({ ok: true, data: { items: [item], total: 1, limit: 20, offset: 0, status: "pending" } });
    const view = await render({ list });
    expect(view.textContent).toContain("Solicitudes académicas");
    expect(view.textContent).toContain("Programación Móvil");
    expect(view.textContent).toContain("Pendiente");
    expect(view.textContent).toContain("Código de aula");
    expect(view.textContent).not.toContain("studentId");
    const filter = view.querySelector("select")!;
    await act(async () => { filter.value = "active"; filter.dispatchEvent(new Event("change", { bubbles: true })); });
    expect(list).toHaveBeenLastCalledWith({ limit: 20, offset: 0, status: "active" });
  });

  it("shows loading, empty and recoverable error states and paginates", async () => {
    let resolve!: (value: Awaited<ReturnType<AdminRequestsApi["list"]>>) => void;
    const waiting = new Promise<Awaited<ReturnType<AdminRequestsApi["list"]>>>((done) => { resolve = done; });
    const list = vi.fn().mockReturnValueOnce(waiting).mockRejectedValueOnce(new Error("fake-network-error")).mockResolvedValueOnce({ ok: true, data: { items: [item], total: 21, limit: 20, offset: 0, status: null } }).mockResolvedValueOnce({ ok: true, data: { items: [], total: 21, limit: 20, offset: 20, status: null } });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<AdminRequestsScreen api={{ list }} />); });
    expect(container.textContent).toContain("Cargando solicitudes académicas");
    await act(async () => resolve({ ok: true, data: { items: [], total: 0, limit: 20, offset: 0, status: null } }));
    expect(container.textContent).toContain("No hay registros para este estado.");
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("No pudimos cargar las solicitudes");
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("Mostrando 1–1 de 21");
    const next = [...container.querySelectorAll("button")].find((button) => button.textContent === "Siguiente");
    await act(async () => next?.click());
    expect(list).toHaveBeenLastCalledWith({ limit: 20, offset: 20, status: null });
  });

  it("distinguishes access failures while retry keeps the active status and page", async () => {
    const page = (offset: number, status: "pending" | null) => ({ ok: true as const, data: { items: Array.from({ length: 20 }, (_, index) => ({ ...item, requestId: `fake-${offset}-${index}` })), total: 40, limit: 20, offset, status } });
    const list = vi.fn()
      .mockResolvedValueOnce(page(0, null))
      .mockResolvedValueOnce(page(0, "pending"))
      .mockResolvedValueOnce({ ok: false, error: { code: "AUTH_REQUIRED", message: "private 401 detail" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "FORBIDDEN", message: "private 403 detail" } })
      .mockResolvedValueOnce({ ok: false, error: { code: "HTTP_ERROR", message: "private http detail" } })
      .mockResolvedValueOnce({ ok: true, data: { items: [], total: 0, limit: 20, offset: 20, status: "pending" } });
    const view = await render({ list });
    const filter = view.querySelector<HTMLSelectElement>("#admin-request-status")!;
    await act(async () => { filter.value = "pending"; filter.dispatchEvent(new Event("change", { bubbles: true })); });
    await act(async () => [...view.querySelectorAll("button")].find((button) => button.textContent === "Siguiente")?.click());

    expect(view.querySelector('[role="alert"]')?.textContent).toContain("Inicia sesión con una cuenta administradora");
    expect(view.textContent).not.toContain("private");
    await act(async () => [...view.querySelectorAll("button")].find((button) => button.textContent === "Reintentar")?.click());
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("Esta cuenta no tiene permisos de administración");
    expect(view.textContent).not.toContain("private");
    await act(async () => [...view.querySelectorAll("button")].find((button) => button.textContent === "Reintentar")?.click());
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("No pudimos cargar las solicitudes académicas");
    await act(async () => [...view.querySelectorAll("button")].find((button) => button.textContent === "Reintentar")?.click());

    expect(filter.value).toBe("pending");
    expect(list).toHaveBeenLastCalledWith({ limit: 20, offset: 20, status: "pending" });
    expect(list).toHaveBeenCalledTimes(6);
    expect(view.textContent).toContain("No hay registros para este estado.");
  });
});
