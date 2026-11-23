// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { classroomApi, teacherReviewApi } = vi.hoisted(() => ({
  classroomApi: { list: vi.fn() },
  teacherReviewApi: { list: vi.fn() },
}));
vi.mock("../../lib/api/classroom-api.js", () => ({ classroomApi }));
vi.mock("../../lib/api/teacher-review-api.js", () => ({ teacherReviewApi }));

import { TeacherReviewWorkspace } from "./TeacherReviewWorkspace.js";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  classroomApi.list.mockReset();
  teacherReviewApi.list.mockReset();
});
afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
});

describe("TeacherReviewWorkspace", () => {
  it("renders only the selected classroom's explicitly shared formative reviews", async () => {
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [
      { id: "class-active", title: "Programación móvil", subject: "React Native", status: "active" },
      { id: "class-archived", title: "Aula archivada", subject: "Otro", status: "archived" },
    ] } });
    teacherReviewApi.list.mockResolvedValue({ ok: true, data: [{ reviewId: "review-1", studentLabel: "alumno-demo", proposalTitle: "App de rutas",
      proposalVersion: 2, missionTitle: "Navegación móvil", missionVersion: 1, mentorContextVersion: 3, repositoryOwner: "alumno-demo",
      repositoryName: "app-rutas", commitSha: "a".repeat(40), status: "completed", score: 82, updatedAt: "2026-11-22T12:00:00.000Z" }] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherReviewWorkspace />));

    expect(teacherReviewApi.list).toHaveBeenCalledOnce();
    expect(teacherReviewApi.list).toHaveBeenCalledWith("class-active");
    expect(container.textContent).toContain("App de rutas");
    expect(container.textContent).toContain("Puntuación orientativa: 82/100");
    expect(container.textContent).toContain("no una calificación oficial");
    expect(container.textContent).not.toContain("Aula archivada");
  });

  it("keeps the empty state when the teacher has no active classrooms", async () => {
    classroomApi.list.mockResolvedValue({ ok: true, data: { items: [{ id: "archived", title: "Archivada", subject: "Demo", status: "archived" }] } });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<TeacherReviewWorkspace />));

    expect(container.textContent).toContain("No tienes aulas activas");
    expect(teacherReviewApi.list).not.toHaveBeenCalled();
  });
});
