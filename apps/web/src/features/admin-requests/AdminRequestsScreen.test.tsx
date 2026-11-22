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
});
