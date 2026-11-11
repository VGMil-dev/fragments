// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeacherPasswordReset } from "./TeacherPasswordReset.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  window.history.replaceState(null, "", "/teacher/reset-password");
  vi.unstubAllGlobals();
});

describe("TeacherPasswordReset", () => {
  it("shows a generic request message and never reflects the submitted address", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<TeacherPasswordReset navigate={vi.fn()} />));

    const email = container.querySelector<HTMLInputElement>('input[name="email"]');
    const form = container.querySelector("form");
    expect(email).not.toBeNull();
    expect(form).not.toBeNull();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(email, "teacher@example.test");
    await act(async () => email?.dispatchEvent(new Event("input", { bubbles: true })));
    await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(fetcher).toHaveBeenCalledWith("/api/auth/request-password-reset", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining('"email":"teacher@example.test"'),
    }));
    expect(container.textContent).toContain("Si la dirección corresponde a una cuenta");
    expect(container.textContent).not.toContain("teacher@example.test");
  });

  it("clears the reset token from the address bar and submits it only to Better Auth", async () => {
    window.history.replaceState(null, "", "/teacher/reset-password#token=local-test-reset-token");
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetcher);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<TeacherPasswordReset navigate={vi.fn()} />));

    expect(window.location.hash).toBe("");
    expect(window.location.search).toBe("");
    const password = container.querySelector<HTMLInputElement>('input[name="new-password"]');
    const confirmation = container.querySelector<HTMLInputElement>('input[name="confirm-password"]');
    const form = container.querySelector("form");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(password, "new-local-password-2026");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(confirmation, "new-local-password-2026");
    await act(async () => {
      password?.dispatchEvent(new Event("input", { bubbles: true }));
      confirmation?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(fetcher).toHaveBeenCalledWith("/api/auth/reset-password", expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ token: "local-test-reset-token", newPassword: "new-local-password-2026" }),
    }));
    expect(container.textContent).toContain("Las sesiones anteriores se cerraron");
  });

  it("does not render a form when no reset token is present in the link", () => {
    const html = renderToStaticMarkup(<TeacherPasswordReset navigate={vi.fn()} />);
    expect(html).toContain("Recupera tu contraseña");
    expect(html).toContain("Enviar enlace");
    expect(html).not.toContain("Establecer contraseña");
  });
});
