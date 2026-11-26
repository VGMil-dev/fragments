// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StudentMe } from "@fragments/contracts";
import { StudentSidebar } from "./StudentSidebar";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement | undefined;
let root: Root | undefined;
afterEach(() => {
  if (root) act(() => root?.unmount());
  container?.remove();
  root = undefined;
  container = undefined;
});

const student: StudentMe = {
  authenticated: true,
  id: "fixture-student",
  githubLogin: "estudiante-real",
  avatarUrl: "https://avatars.githubusercontent.com/u/123?v=4",
  profileUrl: "https://github.com/estudiante-real",
  registeredAt: "2026-11-19T12:00:00.000Z",
};

describe("StudentSidebar", () => {
  it("separa navegación académica y herramientas, resalta la ruta y conserva la identidad", () => {
    const html = renderToStaticMarkup(<StudentSidebar path="/student/review" student={student} navigate={vi.fn()} onOpenMentor={vi.fn()} />);

    expect(html).toContain("ACADEMIA");
    expect(html).toContain("HERRAMIENTAS");
    expect(html).toContain('href="/student/review" aria-current="page"');
    expect(html).toContain('href="https://github.com/estudiante-real" target="_blank" rel="noreferrer"');
    expect(html).toContain('src="https://avatars.githubusercontent.com/u/123?v=4" alt=""');
    expect(html).toContain("Cerrar sesión");
    expect(html).not.toContain("PROTOTIPO VISUAL");
  });

  it("mantiene rutas reales y prepara Mentor al elegir su enlace", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    const navigate = vi.fn();
    const onOpenMentor = vi.fn();
    await act(async () => root?.render(<StudentSidebar path="/student/dashboard" student={student} navigate={navigate} onOpenMentor={onOpenMentor} />));

    const mentorLink = [...container.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.textContent?.includes("Mentor"));
    await act(async () => mentorLink?.click());

    expect(onOpenMentor).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledExactlyOnceWith("/student/mentor");
  });

  it("expone un menú móvil operable por teclado y atributos de estado", async () => {
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<StudentSidebar path="/student/classrooms" student={student} navigate={vi.fn()} onOpenMentor={vi.fn()} />));

    const toggle = container.querySelector<HTMLButtonElement>(".student-sidebar__mobile-toggle");
    expect(toggle?.getAttribute("aria-expanded")).toBe("false");
    await act(async () => toggle?.click());
    expect(toggle?.getAttribute("aria-expanded")).toBe("true");
    expect(container.querySelector("#student-sidebar-navigation")?.classList.contains("is-open")).toBe(true);
    expect(container.querySelector('a[href="/student/classrooms"]')?.getAttribute("aria-current")).toBe("page");
  });
});
