// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminAuditLogScreen } from "./AdminAuditLogScreen.js";
import type { AdminAuditLogApi } from "./admin-audit-log-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const events = [{ requestId: "a8bb1a68-c5f4-4f1f-a52d-65535a5b652d", event: "admin.queue_summary.read" as const, occurredAt: "2026-11-22T15:00:00.000Z", actorType: "admin" as const }];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminAuditLogApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminAuditLogScreen api={api} />));
  return container;
}

describe("AdminAuditLogScreen", () => {
  it("shows redacted recent admin events and allows manual refresh", async () => {
    const read = vi.fn().mockResolvedValueOnce({ ok: true, data: { events } }).mockResolvedValueOnce({ ok: true, data: { events: [] } });
    const view = await render({ read });
    expect(view.textContent).toContain("Registro de actividad administrativa");
    expect(view.textContent).toContain("Cola de trabajos consultada");
    expect(view.textContent).toContain(events[0]!.requestId);
    expect(view.textContent).toContain("desde el último inicio del API");
    expect(view.querySelector('a[href="/admin/audit-log"]')?.getAttribute("aria-current")).toBe("page");
    expect(view.textContent).not.toContain("adminActorId");
    await act(async () => view.querySelector("button")?.click());
    expect(read).toHaveBeenCalledTimes(2);
    expect(view.textContent).toContain("No hay eventos administrativos disponibles");
  });

  it("shows loading and a recoverable error", async () => {
    let resolve!: (value: Awaited<ReturnType<AdminAuditLogApi["read"]>>) => void;
    const pending = new Promise<Awaited<ReturnType<AdminAuditLogApi["read"]>>>((done) => { resolve = done; });
    const read = vi.fn().mockReturnValueOnce(pending).mockResolvedValueOnce({ ok: false, error: { code: "FORBIDDEN", message: "safe error" } }).mockResolvedValueOnce({ ok: true, data: { events } });
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => { root?.render(<AdminAuditLogScreen api={{ read }} />); });
    expect(container.textContent).toContain("Cargando registro de actividad");
    await act(async () => resolve({ ok: true, data: { events } }));
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("No se pudo cargar el registro de actividad");
    await act(async () => container?.querySelector("button")?.click());
    expect(container.textContent).toContain("Cola de trabajos consultada");
  });
});
