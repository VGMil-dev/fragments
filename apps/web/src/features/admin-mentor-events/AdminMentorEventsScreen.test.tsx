// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminMentorEventsScreen } from "./AdminMentorEventsScreen.js";
import type { AdminMentorEventsApi } from "./admin-mentor-events-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const events = [{ event: "mentor_evaluation_failed" as const, stage: "response_validation" as const, result: "failure" as const,
  error_code: "response_validation_failed" as const, duration_ms: 850, occurred_at: "2026-11-22T20:00:00.000Z" }];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminMentorEventsApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminMentorEventsScreen api={api} />));
  return container;
}

describe("AdminMentorEventsScreen", () => {
  it("shows redacted events, retention and refresh", async () => {
    const read = vi.fn().mockResolvedValueOnce({ ok: true, data: { events } }).mockResolvedValueOnce({ ok: true, data: { events: [] } });
    const view = await render({ read });
    expect(view.textContent).toContain("Eventos operativos de Mentor");
    expect(view.textContent).toContain("Validar respuesta");
    expect(view.textContent).toContain("Fallida");
    expect(view.textContent).toContain("response_validation_failed");
    expect(view.textContent).toContain("22 nov 2026");
    expect(view.textContent).toContain("100 eventos desde el inicio");
    expect(view.textContent).not.toContain("proposalId");
    expect(view.querySelector('a[href="/admin/mentor-events"]')?.getAttribute("aria-current")).toBe("page");
    await act(async () => view.querySelector("button")?.click());
    expect(read).toHaveBeenCalledTimes(2);
    expect(view.textContent).toContain("Todavía no hay evaluaciones");
  });

  it("shows recoverable access errors without server details", async () => {
    const view = await render({ read: vi.fn().mockResolvedValue({ ok: false, error: { code: "FORBIDDEN", message: "PRIVATE_BACKEND_DETAIL" } }) });
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("no tiene permisos de administración");
    expect(view.textContent).not.toContain("PRIVATE_BACKEND_DETAIL");
    expect(view.querySelector("button")?.textContent).toBe("Reintentar");
  });
});
