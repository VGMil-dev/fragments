// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { classroomApi, assignmentsApi } = vi.hoisted(() => ({
  classroomApi: {
    list: vi.fn(),
    get: vi.fn(),
    enrollments: vi.fn(),
    classroomSkills: vi.fn(),
    students: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  assignmentsApi: { listTeacher: vi.fn(), create: vi.fn(), update: vi.fn(), publish: vi.fn() },
}));

vi.mock("../../lib/api/classroom-api.js", () => ({ classroomApi }));
vi.mock("../assignments/assignments-api.js", () => ({ assignmentsApi }));

import { ClassroomStudio } from "./ClassroomStudio.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  classroomApi.list.mockReset();
  classroomApi.get.mockReset();
  classroomApi.enrollments.mockReset();
  classroomApi.classroomSkills.mockReset();
  classroomApi.students.mockReset();
  classroomApi.update.mockReset();
  classroomApi.create.mockReset();
  assignmentsApi.listTeacher.mockReset();
  assignmentsApi.create.mockReset();
  assignmentsApi.update.mockReset();
  assignmentsApi.publish.mockReset();
  assignmentsApi.listTeacher.mockResolvedValue({ ok: true, data: [] });
});

describe("ClassroomStudio", () => {
  it("renders the new classroom form without treating 'new' as an aula id", async () => {
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [] } });
    classroomApi.get.mockResolvedValue({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró el aula." } });
    classroomApi.enrollments.mockResolvedValue({ ok: true, data: [] });
    classroomApi.classroomSkills.mockResolvedValue({ ok: true, data: [] });
    classroomApi.students.mockResolvedValue({ ok: true, data: { items: [] } });
    assignmentsApi.listTeacher.mockResolvedValue({ ok: true, data: [] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<ClassroomStudio path="/teacher/classrooms/new" navigate={vi.fn()} />));

    expect(container.querySelector('input[name="title"]')).not.toBeNull();
    expect(container.textContent).not.toContain("No se encontró el aula.");
    expect(classroomApi.get).not.toHaveBeenCalled();
    expect(container.querySelector('input[name="groupLabel"]')).toBeNull();
    expect(container.textContent).toContain("espacio compartido por temática");
  });

  it("creates a thematic classroom without a school parallel label", async () => {
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [] } });
    classroomApi.get.mockResolvedValue({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró el aula." } });
    classroomApi.enrollments.mockResolvedValue({ ok: true, data: [] });
    classroomApi.classroomSkills.mockResolvedValue({ ok: true, data: [] });
    classroomApi.students.mockResolvedValue({ ok: true, data: { items: [] } });
    classroomApi.create.mockResolvedValue({ ok: true, data: { id: "fixture-classroom" } });
    const navigate = vi.fn();
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<ClassroomStudio path="/teacher/classrooms/new" navigate={navigate} />));
    const title = container.querySelector<HTMLInputElement>('input[name="title"]')!;
    const subject = container.querySelector<HTMLInputElement>('input[name="subject"]')!;
    const form = container.querySelector<HTMLFormElement>("form.cs-form")!;
    title.value = "Programación móvil";
    subject.value = "Desarrollo de software";

    await act(async () => { form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

    expect(classroomApi.create).toHaveBeenCalledWith({ title: "Programación móvil", subject: "Desarrollo de software", period: null, context: null });
    expect(navigate).toHaveBeenCalledWith("/teacher/classrooms/fixture-classroom");
  });

  it("keeps the save confirmation visible after refreshing persisted classroom data", async () => {
    const classroom = {
      id: "fixture-classroom-a", title: "Aula original", subject: "Programación", groupLabel: "G1",
      period: null, context: null, status: "active" as const,
      createdAt: "2026-11-20T00:00:00.000Z", updatedAt: "2026-11-20T00:00:00.000Z",
    };
    const updated = { ...classroom, title: "Aula editada" };
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [classroom], nextOffset: null } });
    classroomApi.get.mockResolvedValue({ ok: true, data: updated });
    classroomApi.enrollments.mockResolvedValue({ ok: true, data: [] });
    classroomApi.classroomSkills.mockResolvedValue({ ok: true, data: [] });
    classroomApi.students.mockResolvedValue({ ok: true, data: { items: [] } });
    classroomApi.update.mockResolvedValue({ ok: true, data: updated });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<ClassroomStudio path={`/teacher/classrooms/${classroom.id}`} navigate={vi.fn()} />));
    const title = container.querySelector<HTMLInputElement>('input[name="title"]');
    const form = container.querySelector<HTMLFormElement>("form.cs-form");
    expect(title).not.toBeNull();
    expect(form).not.toBeNull();
    title!.value = "Aula editada";

    await act(async () => { form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });

    expect(classroomApi.update).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Cambios guardados.");
  });

  it("links from the empty classroom skills state to the skills catalog", async () => {
    const classroom = {
      id: "fixture-classroom-skills", title: "Aula de prueba", subject: "Programación", groupLabel: "G1",
      period: null, context: null, status: "active" as const,
      createdAt: "2026-11-20T00:00:00.000Z", updatedAt: "2026-11-20T00:00:00.000Z",
    };
    const navigate = vi.fn();
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [classroom], nextOffset: null } });
    classroomApi.get.mockResolvedValue({ ok: true, data: classroom });
    classroomApi.enrollments.mockResolvedValue({ ok: true, data: [] });
    classroomApi.classroomSkills.mockResolvedValue({ ok: true, data: [] });
    classroomApi.students.mockResolvedValue({ ok: true, data: { items: [] } });
    assignmentsApi.listTeacher.mockResolvedValue({ ok: true, data: [] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<ClassroomStudio path={`/teacher/classrooms/${classroom.id}`} navigate={navigate} />));

    const availability = container.querySelector(".cs-availability")!;
    expect(availability.textContent).toContain("Crea habilidades en el catálogo para habilitarlas aquí.");
    const catalogLink = availability.querySelector<HTMLAnchorElement>('a[href="/teacher/skills"]');
    expect(catalogLink?.textContent).toContain("Ir al catálogo de habilidades");
    await act(async () => catalogLink?.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })));
    expect(navigate).toHaveBeenCalledWith("/teacher/skills");
  });

  it("keeps archived classroom skills visible and links to the catalog when all are archived", async () => {
    const classroom = {
      id: "fixture-classroom-archived-skills", title: "Aula de prueba", subject: "Programación", groupLabel: "G1",
      period: null, context: null, status: "active" as const,
      createdAt: "2026-11-20T00:00:00.000Z", updatedAt: "2026-11-20T00:00:00.000Z",
    };
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [classroom], nextOffset: null } });
    classroomApi.get.mockResolvedValue({ ok: true, data: classroom });
    classroomApi.enrollments.mockResolvedValue({ ok: true, data: [] });
    classroomApi.classroomSkills.mockResolvedValue({ ok: true, data: [{ id: "fixture-skill-archived", name: "Habilidad archivada", description: null, archived: true, enabled: false }] });
    classroomApi.students.mockResolvedValue({ ok: true, data: { items: [] } });
    assignmentsApi.listTeacher.mockResolvedValue({ ok: true, data: [] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<ClassroomStudio path={`/teacher/classrooms/${classroom.id}`} navigate={vi.fn()} />));

    const availability = container.querySelector(".cs-availability")!;
    expect(availability.textContent).toContain("Habilidad archivada");
    expect(availability.textContent).toContain("Archivada; se conservan sus referencias.");
    expect(availability.querySelector('a[href="/teacher/skills"]')?.textContent).toContain("Ir al catálogo de habilidades");
  });
});
