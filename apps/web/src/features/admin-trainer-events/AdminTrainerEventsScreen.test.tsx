// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminTrainerEventsScreen } from "./AdminTrainerEventsScreen.js";
import type { AdminTrainerEventsApi, TrainerOperationalEvent } from "./admin-trainer-events-types.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// FAKE ADMIN FIXTURE: synthetic operational rows only; no identity or academic content.
const fakeEvents: TrainerOperationalEvent[] = [
  { event: "trainer.attempt.finished", stage: "attempt_record", result: "success", error_code: "none", duration_ms: 84, occurredAt: "2026-11-23T14:05:00.000Z" },
  { event: "trainer.attempt.failed", stage: "attempt_record", result: "failure", error_code: "attempt_failed", duration_ms: 120, occurredAt: "2026-11-23T14:04:00.000Z" },
];

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminTrainerEventsApi) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<AdminTrainerEventsScreen api={api} />));
  return container;
}

describe("AdminTrainerEventsScreen", () => {
  it("announces loading while the fake read is pending", async () => {
    let resolve!: (value: Awaited<ReturnType<AdminTrainerEventsApi["read"]>>) => void;
    const api = { read: () => new Promise((done) => { resolve = done; }) } satisfies AdminTrainerEventsApi;
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<AdminTrainerEventsScreen api={api} />));
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Cargando eventos de Trainer");
    await act(async () => resolve({ ok: true, data: { events: [] } }));
    expect(container.textContent).toContain("Todavía no hay eventos de Trainer");
  });

  it("shows a redacted accessible event table and empty state", async () => {
    const view = await render({ read: vi.fn().mockResolvedValue({ ok: true, data: { events: fakeEvents } }) });
    expect(view.querySelector("table")).not.toBeNull();
    expect(view.querySelector("caption")?.textContent).toContain("Eventos operativos");
    expect(view.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(view.textContent).toContain("Intento registrado");
    expect(view.textContent).toContain("Fallido");
    expect(view.textContent).toContain("Registro del intento");
    expect(view.textContent).toContain("attempt_failed");
    expect(view.textContent).not.toMatch(/student|studentId|cookie|challenge|reto/i);
  });

  it("filters locally by stage and result without another API read", async () => {
    const read = vi.fn().mockResolvedValue({ ok: true, data: { events: fakeEvents } });
    const view = await render({ read });
    const [stage, result] = view.querySelectorAll("select");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(stage, "attempt_record");
      stage?.dispatchEvent(new Event("change", { bubbles: true }));
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(result, "failure");
      result?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(view.querySelector("tbody")?.textContent).toContain("Fallido");
    expect(view.querySelector("tbody")?.textContent).not.toContain("Intento registrado");
    expect(read).toHaveBeenCalledOnce();
  });

  it.each([
    ["AUTH_REQUIRED", "Inicia sesión con una cuenta administradora"],
    ["FORBIDDEN", "no tiene permisos de administración"],
  ])("shows a safe %s state", async (code, copy) => {
    const view = await render({ read: vi.fn().mockResolvedValue({ ok: false, error: { code, message: "FAKE_PRIVATE_SERVER_DETAIL" } }) });
    expect(view.querySelector('[role="alert"]')?.textContent).toContain(copy);
    expect(view.textContent).not.toContain("FAKE_PRIVATE_SERVER_DETAIL");
    expect(view.querySelector("button")?.textContent).toBe("Reintentar");
    expect(view.querySelector("table")).toBeNull();
  });

  it("recovers from an unexpected fake read failure", async () => {
    const read = vi.fn().mockRejectedValueOnce(new Error("FAKE_PRIVATE_SERVER_DETAIL"))
      .mockResolvedValueOnce({ ok: true, data: { events: fakeEvents } });
    const view = await render({ read });
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("No se pudieron cargar los eventos de Trainer");
    expect(view.textContent).not.toContain("FAKE_PRIVATE_SERVER_DETAIL");
    await act(async () => view.querySelector("button")?.click());
    expect(view.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(read).toHaveBeenCalledTimes(2);
  });
});
