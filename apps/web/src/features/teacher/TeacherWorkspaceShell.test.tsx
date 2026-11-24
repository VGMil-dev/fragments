// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { classroomApi } = vi.hoisted(() => ({ classroomApi: { list: vi.fn(), dashboardSummary: vi.fn() } }));
vi.mock("../../lib/api/classroom-api.js", () => ({ classroomApi }));

import { TeacherWorkspaceShell } from "./TeacherWorkspaceShell.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

const summary = {
  totalClassrooms: 5,
  pendingJoinRequests: 2,
  classrooms: Array.from({ length: 4 }, (_, index) => ({
    id: `fixture-classroom-${index + 1}`,
    title: `Aula temática de prueba ${index + 1}`,
    subject: `Área de prueba ${index + 1}`,
    groupLabel: null,
    period: null,
    status: index === 3 ? "archived" as const : "active" as const,
    createdAt: "2026-11-20T00:00:00.000Z",
    updatedAt: "2026-11-20T00:00:00.000Z",
  })),
};

function sessionFetch(user: unknown) {
  return vi.fn(async (input: RequestInfo | URL) => {
    if (String(input) === "/api/auth/get-session") return new Response(JSON.stringify(user ? { user } : {}), { status: 200 });
    if (String(input) === "/api/auth/sign-out") return new Response("{}", { status: 200 });
    return new Response("{}", { status: 404 });
  });
}

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
  classroomApi.list.mockReset();
  classroomApi.dashboardSummary.mockReset();
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  vi.unstubAllGlobals();
});

describe("TeacherWorkspaceShell", () => {
  it("exposes the skills catalog in desktop and mobile teacher navigation", async () => {
    vi.stubGlobal("fetch", sessionFetch({ id: "fixture-teacher", name: "Docente de prueba", isTeacher: true }));
    classroomApi.dashboardSummary.mockResolvedValue({ ok: true, data: summary });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherWorkspaceShell path="/teacher/dashboard" navigate={vi.fn()} />));

    expect(container.querySelector('nav[aria-label="Herramientas docentes"] a[href="/teacher/skills"]')?.textContent).toContain("Habilidades");
    expect(container.querySelector('details.teacher-sidebar__mobile-menu a[href="/teacher/skills"]')?.textContent).toContain("Habilidades");
  });

  it("uses the authorized dashboard summary and leaves unavailable tracking empty", async () => {
    vi.stubGlobal("fetch", sessionFetch({ id: "fixture-teacher", name: "Docente de prueba", isTeacher: true }));
    classroomApi.dashboardSummary.mockResolvedValue({ ok: true, data: summary });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherWorkspaceShell path="/teacher/dashboard" navigate={vi.fn()} />));

    expect(classroomApi.dashboardSummary).toHaveBeenCalledOnce();
    expect(classroomApi.list).not.toHaveBeenCalled();
    expect(container.querySelectorAll(".teacher-metric strong")).toHaveLength(3);
    expect([...container.querySelectorAll(".teacher-metric strong")].map((node) => node.textContent)).toEqual(["5", "2", "—"]);
    expect(container.textContent).toContain("Aula temática de prueba 1");
    expect(container.textContent).toContain("La actividad reciente no está disponible todavía.");
    expect(container.textContent).toContain("No hay todavía un vínculo verificable entre aula y proyecto.");
    expect(container.querySelector('a[href="/student/review"]')).toBeNull();
  });

  it("keeps student sessions outside the teacher shell", async () => {
    vi.stubGlobal("fetch", sessionFetch({ id: "fixture-student", name: "Estudiante de prueba", isTeacher: false, role: "user" }));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherWorkspaceShell path="/teacher/dashboard" navigate={vi.fn()} />));

    expect(container.textContent).toContain("Acceso docente requerido");
    expect(container.textContent).not.toContain("Espacio docente");
    expect(classroomApi.dashboardSummary).not.toHaveBeenCalled();
  });

  it("shows one shared teacher login form when signed out", async () => {
    vi.stubGlobal("fetch", sessionFetch(null));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherWorkspaceShell path="/teacher/students" navigate={vi.fn()} />));

    expect(container.querySelectorAll("form")).toHaveLength(1);
    expect(container.querySelector('input[type="password"]')).not.toBeNull();
    expect(container.textContent).toContain("¿Olvidaste tu contraseña?");
    expect(container.textContent).not.toContain("Inicia sesión con tu cuenta docente. Las sesiones de estudiantes no permiten abrir este panel.");
  });

  it("ends the teacher session from the shell account control", async () => {
    const fetcher = sessionFetch({ id: "fixture-teacher", name: "Docente de prueba", isTeacher: true });
    vi.stubGlobal("fetch", fetcher);
    classroomApi.dashboardSummary.mockResolvedValue({ ok: true, data: summary });
    const navigate = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherWorkspaceShell path="/teacher/dashboard" navigate={navigate} />));
    const signOut = container.querySelector<HTMLButtonElement>('button[aria-label="Cerrar sesión"]')!;
    await act(async () => { signOut.dispatchEvent(new MouseEvent("click", { bubbles: true })); });

    expect(fetcher).toHaveBeenCalledWith("/api/auth/sign-out", expect.objectContaining({ method: "POST" }));
    expect(navigate).toHaveBeenCalledWith("/teacher/dashboard");
    expect(container.querySelectorAll("form")).toHaveLength(1);
  });
});
