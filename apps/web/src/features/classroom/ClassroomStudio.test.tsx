// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";

const { classroomApi } = vi.hoisted(() => ({
  classroomApi: {
    list: vi.fn(),
    get: vi.fn(),
    enrollments: vi.fn(),
    classroomSkills: vi.fn(),
    students: vi.fn(),
  },
}));

vi.mock("../../lib/api/classroom-api.js", () => ({ classroomApi }));

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
});

describe("ClassroomStudio", () => {
  it("renders the new classroom form without treating 'new' as an aula id", async () => {
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [] } });
    classroomApi.get.mockResolvedValue({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró el aula." } });
    classroomApi.enrollments.mockResolvedValue({ ok: true, data: [] });
    classroomApi.classroomSkills.mockResolvedValue({ ok: true, data: [] });
    classroomApi.students.mockResolvedValue({ ok: true, data: { items: [] } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<ClassroomStudio path="/teacher/classrooms/new" navigate={vi.fn()} />));

    expect(container.querySelector('input[name="title"]')).not.toBeNull();
    expect(container.textContent).not.toContain("No se encontró el aula.");
    expect(classroomApi.get).not.toHaveBeenCalled();
  });
});
