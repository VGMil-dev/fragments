// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { InspectorTeacherWorkspace } from "./InspectorTeacherWorkspace.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.unstubAllGlobals();
});

async function mount(api: unknown, navigate = vi.fn()) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(<InspectorTeacherWorkspace api={api as never} navigate={navigate} />));
  return { view: container, navigate };
}

describe("InspectorTeacherWorkspace access", () => {
  it("announces access loading and preserves navigation for a fake teacher session", async () => {
    let resolveSession!: (value: { ok: true; json: () => Promise<unknown> }) => void;
    const fetchFake = vi.fn(() => new Promise<{ ok: true; json: () => Promise<unknown> }>((resolve) => { resolveSession = resolve; }));
    vi.stubGlobal("fetch", fetchFake);
    const list = vi.fn();
    const { view, navigate } = await mount({ list });
    expect(view.querySelector('[role="status"]')?.textContent).toContain("Comprobando el acceso docente");
    await act(async () => resolveSession({ ok: true, json: async () => ({ user: { isTeacher: true } }) }));
    expect(view.querySelector("h1")?.textContent).toBe("Sala de defensa");
    expect(view.querySelector('a[href="/"]')).not.toBeNull();
    await act(async () => view.querySelector<HTMLAnchorElement>('a[href="/"]')?.click());
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/");
    expect(list).not.toHaveBeenCalled();
  });

  it("keeps the gate closed for a fake non-teacher session", async () => {
    const fetchFake = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ user: { isTeacher: false, role: "student" } }) });
    vi.stubGlobal("fetch", fetchFake);
    const list = vi.fn();
    const view = (await mount({ list })).view;
    expect(view.querySelector('[role="alert"]')?.textContent).toContain("no tiene acceso docente");
    expect(view.querySelector("form.inspector-workspace__login")).not.toBeNull();
    expect(view.querySelector("h1")?.textContent).toBe("Inspector");
    expect(list).not.toHaveBeenCalled();
  });
});
