// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { getMe } = vi.hoisted(() => ({ getMe: vi.fn() }));
vi.mock("../../lib/api/api-client", () => ({ createApiClient: vi.fn(() => ({})) }));
vi.mock("../../lib/api/student-api", () => ({ createStudentApi: vi.fn(() => ({ getMe })) }));

import { StudentLoginScreen } from "./StudentLoginScreen.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  getMe.mockReset();
});

describe("StudentLoginScreen", () => {
  it("offers recovery when the status API is unavailable and enables GitHub after retry", async () => {
    getMe
      .mockResolvedValueOnce({ ok: false, error: { code: "HTTP_ERROR", message: "Unavailable" } })
      .mockResolvedValueOnce({ ok: true, data: { authenticated: false, githubOAuthConfigured: true, reason: "session_required" } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const navigate = vi.fn();
    await act(async () => root?.render(<StudentLoginScreen navigate={navigate} />));

    expect(container.textContent).toContain("No pudimos comprobar tu acceso en este momento.");
    const login = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Iniciar sesión"));
    expect(login?.disabled).toBe(true);
    const retry = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Reintentar"));
    await act(async () => retry?.click());

    expect(getMe).toHaveBeenCalledTimes(2);
    expect(login?.disabled).toBe(false);
    expect(container.textContent).not.toContain("estará disponible cuando se configure");
    expect(navigate).not.toHaveBeenCalled();
  });

  it("routes a docente away from student access without downgrading the role", async () => {
    getMe.mockResolvedValueOnce({ ok: true, data: { authenticated: false, githubOAuthConfigured: true, reason: "role_not_student" } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const navigate = vi.fn();
    await act(async () => root?.render(<StudentLoginScreen navigate={navigate} />));

    expect(navigate).toHaveBeenCalledExactlyOnceWith("/teacher/mentor-control");
  });
});
