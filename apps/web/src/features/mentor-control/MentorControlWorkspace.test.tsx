// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MentorControlWorkspace } from "./MentorControlWorkspace.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  window.history.replaceState(null, "", "/teacher/mentor-control");
  vi.unstubAllGlobals();
});

describe("Cuenta y acceso docente", () => {
  it("carga el estado de cuenta al iniciar sesión desde el formulario", async () => {
    const config = {
      subject: "Ciencias", theme: "Huerto escolar", assignment: "Registra el crecimiento.", requirements: ["Incluye evidencia"],
      expectedLevel: "Secundaria", rubricTitle: "Proceso", criteria: [{ id: "evidence", title: "Evidencia", description: "Observaciones", weight: 100 }],
    };
    const workspace = {
      draft: { config, updatedAt: "2026-11-13T12:00:00.000Z" },
      active: { version: 1, config, publishedAt: "2026-11-13T12:00:00.000Z" }, evaluations: [],
    };
    let authenticated = false;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/get-session") return new Response(JSON.stringify(authenticated ? { user: { id: "fixture-teacher", isTeacher: true } } : {}));
      if (url === "/api/auth/sign-in/email") { authenticated = true; return new Response(JSON.stringify({ ok: true })); }
      if (url === "/api/teacher/mentor-control") return new Response(JSON.stringify({ ok: true, data: workspace }));
      if (url === "/api/teacher/account") return new Response(JSON.stringify({ ok: true, data: { credentialConnected: true, githubConnected: false } }));
      throw new Error(`Ruta de fixture no prevista: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<MentorControlWorkspace navigate={vi.fn()} />));

    const email = container.querySelector<HTMLInputElement>('input[name="email"]');
    const password = container.querySelector<HTMLInputElement>('input[name="password"]');
    const form = container.querySelector("form");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(email, "teacher.fixture@example.test");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(password, "fixture-only-password");
    await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(fetcher).toHaveBeenCalledWith("/api/teacher/account", expect.any(Object));
    expect(container.textContent).toContain("Cuenta y acceso");
    expect(container.textContent).toContain("GitHub: no conectado");
  });

  it("pide confirmación de contraseña y no presenta una vinculación fallida como exitosa", async () => {
    const config = {
      subject: "Ciencias", theme: "Huerto escolar", assignment: "Registra el crecimiento.", requirements: ["Incluye evidencia"],
      expectedLevel: "Secundaria", rubricTitle: "Proceso", criteria: [{ id: "evidence", title: "Evidencia", description: "Observaciones", weight: 100 }],
    };
    const workspace = {
      draft: { config, updatedAt: "2026-11-13T12:00:00.000Z" },
      active: { version: 1, config, publishedAt: "2026-11-13T12:00:00.000Z" }, evaluations: [],
    };
    const fetcher = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/get-session") return new Response(JSON.stringify({ user: { id: "fixture-teacher", isTeacher: true } }));
      if (url === "/api/teacher/mentor-control") return new Response(JSON.stringify({ ok: true, data: workspace }));
      if (url === "/api/teacher/account") return new Response(JSON.stringify({ ok: true, data: { credentialConnected: true, githubConnected: false } }));
      if (url === "/api/teacher/account/github/link") return new Response(JSON.stringify({ ok: false, error: { code: "PASSWORD_CONFIRMATION_FAILED", message: "No se pudo confirmar la contraseña." } }), { status: 401 });
      throw new Error(`Ruta de fixture no prevista: ${url} ${init?.method ?? "GET"}`);
    });
    vi.stubGlobal("fetch", fetcher);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<MentorControlWorkspace navigate={vi.fn()} />));

    expect(container.textContent).toContain("Cuenta y acceso");
    expect(container.textContent).toContain("GitHub: no conectado");
    const linkButton = container.querySelector(".mentor-control__account > button");
    await act(async () => linkButton?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(container.querySelector('input[name="password"]')).not.toBeNull();

    const password = container.querySelector<HTMLInputElement>('input[name="password"]');
    const form = container.querySelector(".mentor-control__link-form");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(password, "fixture-only-password");
    await act(async () => password?.dispatchEvent(new Event("input", { bubbles: true })));
    await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(fetcher).toHaveBeenCalledWith("/api/teacher/account/github/link", expect.objectContaining({
      method: "POST", credentials: "same-origin", body: JSON.stringify({ password: "fixture-only-password" }),
    }));
    expect(container.textContent).toContain("No se pudo confirmar la contraseña.");
    expect(container.querySelector<HTMLInputElement>('input[name="password"]')?.value).toBe("");
  });

  it("confirma el estado real de la cuenta antes de anunciar que GitHub quedó vinculado", async () => {
    window.history.replaceState(null, "", "/teacher/mentor-control?githubLink=success");
    const config = {
      subject: "Ciencias", theme: "Huerto escolar", assignment: "Registra el crecimiento.", requirements: ["Incluye evidencia"],
      expectedLevel: "Secundaria", rubricTitle: "Proceso", criteria: [{ id: "evidence", title: "Evidencia", description: "Observaciones", weight: 100 }],
    };
    const workspace = {
      draft: { config, updatedAt: "2026-11-13T12:00:00.000Z" },
      active: { version: 1, config, publishedAt: "2026-11-13T12:00:00.000Z" }, evaluations: [],
    };
    let accountReads = 0;
    const fetcher = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/get-session") return new Response(JSON.stringify({ user: { id: "fixture-teacher", isTeacher: true } }));
      if (url === "/api/teacher/mentor-control") return new Response(JSON.stringify({ ok: true, data: workspace }));
      if (url === "/api/teacher/account") {
        accountReads += 1;
        return new Response(JSON.stringify({ ok: true, data: { credentialConnected: true, githubConnected: accountReads > 1 } }));
      }
      throw new Error(`Ruta de fixture no prevista: ${url}`);
    });
    vi.stubGlobal("fetch", fetcher);
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<MentorControlWorkspace navigate={vi.fn()} />));

    expect(accountReads).toBe(2);
    expect(container.textContent).toContain("GitHub quedó vinculado a esta cuenta docente.");
    expect(container.textContent).toContain("GitHub: conectado");
  });
});
