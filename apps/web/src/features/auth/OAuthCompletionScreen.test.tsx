// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { OAuthCompletionScreen } from "./OAuthCompletionScreen.js";

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

async function render(fetcher: typeof fetch) {
  vi.stubGlobal("fetch", fetcher);
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  const navigate = vi.fn();
  await act(async () => root?.render(<OAuthCompletionScreen navigate={navigate} />));
  return { navigate, container, text: container.textContent ?? "" };
}

describe("OAuthCompletionScreen", () => {
  it("returns an already authenticated teacher to the existing teacher workspace", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ user: { id: "fixture-existing-teacher", isTeacher: true } }), { status: 200 }));
    const { navigate } = await render(fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/api/auth/get-session", expect.objectContaining({ cache: "no-store" }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/teacher/mentor-control");
  });

  it("routes a valid student session only after the student profile endpoint confirms access", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "fixture-student" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { authenticated: true } }), { status: 200 }));
    const { navigate } = await render(fetcher as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenLastCalledWith("/api/me", expect.objectContaining({ cache: "no-store" }));
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/student/gallery");
  });

  it("explains an unconfirmed student identity without suggesting an institutional email", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "fixture-unlinked-user" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { authenticated: false, reason: "github_account_not_linked" } }), { status: 200 }));
    const { navigate, text } = await render(fetcher as typeof fetch);

    expect(navigate).not.toHaveBeenCalled();
    expect(text).toContain("Esta sesión de Fragments no tiene una cuenta GitHub vinculada");
    expect(text).not.toContain("institucional");
  });

  it("offers retry when the student profile API is temporarily unavailable", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "fixture-student" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { code: "NOT_READY" } }), { status: 503 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: { id: "fixture-student" } }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: { authenticated: true } }), { status: 200 }));
    const { navigate, container, text } = await render(fetcher as typeof fetch);

    expect(text).toContain("No pudimos comprobar tu acceso en este momento");
    const retry = container.querySelector("button");
    expect(retry?.textContent).toContain("Reintentar");
    await act(async () => retry?.click());

    expect(navigate).toHaveBeenCalledExactlyOnceWith("/student/gallery");
  });

  it("does not route if Better Auth has no valid session", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    const { navigate, text } = await render(fetcher);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(navigate).not.toHaveBeenCalled();
    expect(text).toContain("No encontramos una sesión activa");
  });
});
