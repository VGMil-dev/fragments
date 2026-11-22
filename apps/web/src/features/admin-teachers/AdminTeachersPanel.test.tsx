// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminTeachersPanel } from "./AdminTeachersPanel.js";
import type { AdminTeachersApi, AdminTeacherPage } from "./admin-teachers-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const fakeTeacherPage: AdminTeacherPage = {
  items: [{ accountId: "teacher-fake-1", displayName: "Docente Fake", email: "teacher@example.test", createdAt: "2026-11-22T17:00:00.000Z" }],
  nextCursor: null,
};
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminTeachersApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminTeachersPanel api={api} />));
  return container;
}

describe("AdminTeachersPanel with fake API", () => {
  it("renders only teacher account fields in a read-only table", async () => {
    const list = vi.fn(async () => ({ ok: true as const, data: fakeTeacherPage }));
    const view = await render({ list });

    expect(view.textContent).toContain("Cuentas docentes");
    expect(view.textContent).toContain("Docente Fake");
    expect(view.textContent).toContain("teacher@example.test");
    expect(view.textContent).toContain("Cuenta");
    expect(view.textContent).not.toMatch(/estudiante|sesión|token|oauth|banned|editar|eliminar/i);
    expect(view.querySelectorAll("button")).toHaveLength(3);
    expect(view.querySelector(".admin-teachers__header button")?.textContent).toBe("Actualizar");
    expect(view.querySelector('button[aria-label="Página anterior"]')?.hasAttribute("disabled")).toBe(true);
    expect(view.querySelector('button[aria-label="Siguiente página"]')?.hasAttribute("disabled")).toBe(true);
  });

  it("shows loading and a recoverable error, then retries", async () => {
    let resolve!: (value: Awaited<ReturnType<AdminTeachersApi["list"]>>) => void;
    const waiting = new Promise<Awaited<ReturnType<AdminTeachersApi["list"]>>>((done) => { resolve = done; });
    const list = vi.fn().mockReturnValueOnce(waiting).mockRejectedValueOnce(new Error("fake-directory-failure")).mockResolvedValueOnce({ ok: true, data: fakeTeacherPage });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<AdminTeachersPanel api={{ list }} />); });
    expect(container.textContent).toContain("Cargando cuentas docentes");
    await act(async () => resolve({ ok: true, data: fakeTeacherPage }));
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("No se pudieron cargar las cuentas docentes");
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("Docente Fake");
  });

  it("navigates cursor pages without exposing or mutating account data", async () => {
    const nextPage: AdminTeacherPage = { items: [{ accountId: "teacher-fake-2", displayName: "Segunda Docente", email: "second@example.test", createdAt: "2026-11-21T17:00:00.000Z" }], nextCursor: null };
    const list = vi.fn().mockResolvedValueOnce({ ok: true, data: { ...fakeTeacherPage, nextCursor: "next-fake-cursor" } }).mockResolvedValueOnce({ ok: true, data: nextPage }).mockResolvedValueOnce({ ok: true, data: fakeTeacherPage });
    const view = await render({ list });
    await act(async () => view.querySelector<HTMLButtonElement>('button[aria-label="Siguiente página"]')?.click());
    expect(view.textContent).toContain("Segunda Docente");
    await act(async () => view.querySelector<HTMLButtonElement>('button[aria-label="Página anterior"]')?.click());
    expect(view.textContent).toContain("Docente Fake");
    expect(list).toHaveBeenNthCalledWith(2, { limit: 20, cursor: "next-fake-cursor" });
    expect(list).toHaveBeenNthCalledWith(3, { limit: 20 });
  });

  it("retries the same later cursor and keeps a way back after a page failure", async () => {
    const secondPage: AdminTeacherPage = { items: [{ accountId: "teacher-fake-2", displayName: "Segunda Docente", email: "second@example.test", createdAt: "2026-11-21T17:00:00.000Z" }], nextCursor: null };
    const list = vi.fn()
      .mockResolvedValueOnce({ ok: true, data: { ...fakeTeacherPage, nextCursor: "next-fake-cursor" } })
      .mockRejectedValueOnce(new Error("fake-later-page-failure"))
      .mockResolvedValueOnce({ ok: true, data: secondPage })
      .mockResolvedValueOnce({ ok: true, data: { ...fakeTeacherPage, nextCursor: "next-fake-cursor" } });
    const view = await render({ list });

    await act(async () => view.querySelector<HTMLButtonElement>('button[aria-label="Siguiente página"]')?.click());
    expect(view.textContent).toContain("No se pudieron cargar las cuentas docentes");
    expect(view.querySelector<HTMLButtonElement>('button[aria-label="Página anterior"]')?.disabled).toBe(false);
    expect(view.textContent).toContain("Página 2");

    await act(async () => view.querySelector<HTMLButtonElement>(".admin-teachers__header button")?.click());
    expect(list).toHaveBeenNthCalledWith(3, { limit: 20, cursor: "next-fake-cursor" });
    expect(view.textContent).toContain("Segunda Docente");

    await act(async () => view.querySelector<HTMLButtonElement>('button[aria-label="Página anterior"]')?.click());
    expect(list).toHaveBeenNthCalledWith(4, { limit: 20 });
    expect(view.textContent).toContain("Docente Fake");
  });
});
