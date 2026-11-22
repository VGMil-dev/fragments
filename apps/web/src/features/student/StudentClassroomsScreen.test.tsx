// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const { studentApi, assignmentsApi } = vi.hoisted(() => ({ studentApi: { getMyClassroomSkills: vi.fn() }, assignmentsApi: { listStudent: vi.fn() } }));
vi.mock("../../lib/api/student-api-instance", () => ({ studentApi }));
vi.mock("../assignments/assignments-api.js", () => ({ assignmentsApi }));

import { StudentClassroomsScreen } from "./StudentClassroomsScreen.js";

const room = { id: "fixture-room", title: "Aula de prueba", subject: "Ciencias", groupLabel: "7A", period: null, status: "active" as const, createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" };
const pending = { id: "fixture-request", status: "pending" as const, source: "join_code" as const, requestedAt: "2026-11-19T12:00:00.000Z", decidedAt: null };
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  studentApi.getMyClassroomSkills.mockReset();
  assignmentsApi.listStudent.mockReset();
});

describe("StudentClassroomsScreen", () => {
  it("renders active authorized classes, a join form, pending status, and an honest mission empty state", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);
    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[pending]} loading={false} error={null} onRefresh={() => undefined} />));
    const markup = container.innerHTML;
    expect(markup).toContain("Aula de prueba");
    expect(markup).toContain("Código de incorporación");
    expect(markup).toContain("Pendiente de aprobación");
    expect(markup).toContain("queda pendiente hasta que el docente la apruebe");
    expect(markup).toContain("Tu docente aún no ha publicado misiones en esta aula.");
    expect(markup).not.toMatch(/prácticas|rúbrica/i);
  });

  it("renders honest loading, error, and empty states", () => {
    const render = (props: Parameters<typeof StudentClassroomsScreen>[0]) => {
      return renderToStaticMarkup(<StudentClassroomsScreen {...props} />);
    };
    const loading = render({ classrooms: [], requests: [], loading: true, error: null, onRefresh: () => undefined });
    const failed = render({ classrooms: [], requests: [], loading: false, error: "No pudimos cargar tus aulas.", onRefresh: () => undefined });
    const empty = render({ classrooms: [], requests: [], loading: false, error: null, onRefresh: () => undefined });
    expect(loading).toContain("Cargando tus aulas y solicitudes");
    expect(failed).toContain("No pudimos cargar tus aulas");
    expect(empty).toContain("Aún no tienes matrículas activas");
  });

  it("shows mission and skill errors when classroom requests reject", async () => {
    studentApi.getMyClassroomSkills.mockRejectedValue(new Error("network"));
    assignmentsApi.listStudent.mockRejectedValue(new Error("network"));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[]} loading={false} error={null} onRefresh={() => undefined} />));

    expect(container.textContent).toContain("No pudimos cargar las misiones de esta aula.");
    expect(container.textContent).toContain("No pudimos cargar las habilidades de esta aula.");
    expect(container.textContent).not.toContain("Cargando misiones");
  });
});
