// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminReviewEventsScreen } from "./AdminReviewEventsScreen.js";
import type { AdminReviewEventsApi } from "./admin-review-events-api.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
const events = [{
  event: "review.attempt.finished" as const, reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fd", jobId: "00000000-0000-4000-8000-000000000001",
  stage: "analysis_validation" as const, errorCode: "AI_OUTPUT_INVALID" as const, durationMs: 1234, attempt: 2, finalStatus: "failed" as const,
  occurredAt: "2026-11-22T20:00:00.000Z",
}, {
  event: "review.attempt.finished" as const, reviewId: "8cdb17bd-64a2-4eeb-b7d4-e3a5b7f474fe", jobId: "00000000-0000-4000-8000-000000000002",
  stage: "repository" as const, errorCode: null, durationMs: 456, attempt: 1, finalStatus: "completed" as const,
  occurredAt: "2026-11-22T19:00:00.000Z",
}];
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); root = undefined; container?.remove(); container = undefined; });

async function render(api: AdminReviewEventsApi) {
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
  await act(async () => root?.render(<AdminReviewEventsScreen api={api} />));
  return container;
}

describe("AdminReviewEventsScreen", () => {
  it("shows safe operational events, timestamps, retention and refresh", async () => {
    const read = vi.fn().mockResolvedValueOnce({ ok: true, data: { events } }).mockResolvedValueOnce({ ok: true, data: { events: [] } });
    const view = await render({ read });

    expect(view.textContent).toContain("Eventos operativos de Review");
    expect(view.textContent).toContain("Validar respuesta");
    expect(view.textContent).toContain("Fallido");
    expect(view.textContent).toContain("AI_OUTPUT_INVALID");
    expect(view.textContent).toContain("00000000-0000-4000-8000-000000000001");
    expect(view.textContent).toContain("22 nov 2026");
    expect(view.textContent).toContain("100 eventos desde el último inicio");
    expect(view.querySelector('a[href="/admin/review-events"]')?.getAttribute("aria-current")).toBe("page");
    await act(async () => view.querySelector("button")?.click());
    expect(read).toHaveBeenCalledTimes(2);
    expect(view.textContent).toContain("Todavía no hay eventos");
  });

  it("shows recoverable access errors without server details", async () => {
    const view = await render({ read: vi.fn().mockResolvedValue({ ok: false, error: { code: "FORBIDDEN", message: "PRIVATE_BACKEND_DETAIL" } }) });
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("no tiene permisos de administración");
    expect(view.textContent).not.toContain("PRIVATE_BACKEND_DETAIL");
    expect(view.querySelector("button")?.textContent).toBe("Reintentar");
  });

  it("filters the loaded sample by stage and result without another request", async () => {
    const read = vi.fn().mockResolvedValue({ ok: true, data: { events } });
    const view = await render({ read });
    const selects = view.querySelectorAll("select");
    expect(selects).toHaveLength(2);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(selects[0], "repository");
      selects[0]?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.textContent).toContain("Completado");
    expect(view.textContent).not.toContain("AI_OUTPUT_INVALID");
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(selects[1], "failed");
      selects[1]?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.querySelector('[role="status"]')?.textContent).toContain("No hay eventos para esta combinación");
    expect(read).toHaveBeenCalledTimes(1);
  });
});
