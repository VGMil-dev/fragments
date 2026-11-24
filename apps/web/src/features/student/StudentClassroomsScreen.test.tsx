// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProposalDraftResponse, StudentAssignment } from "@fragments/contracts";

const { studentApi, assignmentsApi } = vi.hoisted(() => ({ studentApi: { getMyClassroomSkills: vi.fn() }, assignmentsApi: { listStudent: vi.fn() } }));
vi.mock("../../lib/api/student-api-instance", () => ({ studentApi }));
vi.mock("../assignments/assignments-api.js", () => ({ assignmentsApi }));

import { StudentClassroomsScreen } from "./StudentClassroomsScreen.js";

const room = { id: "fixture-room", title: "Aula de prueba", subject: "Ciencias", groupLabel: "7A", period: null, status: "active" as const, createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" };
const pending = { id: "fixture-request", status: "pending" as const, source: "join_code" as const, requestedAt: "2026-11-19T12:00:00.000Z", decidedAt: null };
const mission = {
  id: "fixture-mission-version", assignmentId: "fixture-mission", version: 1, classroomId: room.id, classroomTitle: room.title, subject: room.subject,
  title: "Misión recuperada", instructions: "Describe una observación.", objectives: ["Registrar evidencia"],
  requiredSkills: [{ id: "fixture-skill", name: "Observación", description: null }], optionalSkills: [], status: "published",
  mentorContextVersion: 2, mentorContext: { version: 2, publishedAt: "2026-11-19T12:00:00.000Z", config: {
    subject: room.subject, theme: "Observar", assignment: "Describe una observación.", expectedLevel: "Bachillerato", rubricTitle: "Rúbrica de prueba",
    criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cita observaciones verificables.", weight: 100 }], requirements: ["Registrar evidencia"],
  } }, createdAt: "2026-11-19T12:00:00.000Z",
} as unknown as StudentAssignment;
const fakeOwnProposal = { id: "fixture-own-proposal", version: 2, proposal: { title: "Propuesta propia" }, assignmentVersionId: mission.id, updatedAt: "2026-11-24T00:00:00.000Z" } as unknown as ProposalDraftResponse;
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
    expect(markup).toContain("student-classrooms--pixel");
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

  it("retries a failed mission request for only that classroom resource", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, data: [mission] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[]} loading={false} error={null} onRefresh={() => undefined} />));

    const retry = container.querySelector<HTMLButtonElement>('button[aria-label="Reintentar misiones de Aula de prueba"]');
    expect(container.textContent).toContain("No pudimos cargar las misiones de esta aula.");
    expect(retry).toBeTruthy();
    await act(async () => retry?.click());

    expect(assignmentsApi.listStudent).toHaveBeenCalledTimes(2);
    expect(studentApi.getMyClassroomSkills).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Misión recuperada");
    expect(container.querySelector('[role="alert"]')).toBeNull();
  });

  it("passes own proposals to the mission list and continues only the exact linked proposal", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    const onContinueProposal = vi.fn();
    const onStartProposal = vi.fn();
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[]} loading={false} error={null} onRefresh={() => undefined} proposals={[fakeOwnProposal]} proposalsLoading={false} proposalsError={false} onRetryProposals={vi.fn()} onContinueProposal={onContinueProposal} onStartProposal={onStartProposal} />));

    const action = container.querySelector<HTMLButtonElement>('button[aria-label="Abrir propuesta vinculada: Misión recuperada"]');
    expect(action?.textContent).toContain("Abrir propuesta vinculada");
    await act(async () => action?.click());
    expect(onContinueProposal).toHaveBeenCalledExactlyOnceWith(fakeOwnProposal);
    expect(onStartProposal).not.toHaveBeenCalled();
  });

  it("blocks mission starts by default until the own-proposals state is supplied", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    const onStartProposal = vi.fn();
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[]} loading={false} error={null} onRefresh={() => undefined} onStartProposal={onStartProposal} />));
    expect(container.textContent).toContain("Espera mientras consultamos tus propuestas antes de iniciar.");
    expect(container.querySelector('button[aria-label="Iniciar propuesta: Misión recuperada"]')).toBeNull();
    expect(onStartProposal).not.toHaveBeenCalled();
  });

  it("retries a failed skill request for only that classroom resource", async () => {
    studentApi.getMyClassroomSkills.mockRejectedValueOnce(new Error("network")).mockResolvedValueOnce({ ok: true, data: [{ id: "fixture-skill", name: "Observación", description: null, archived: false, createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" }] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [] });
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[]} loading={false} error={null} onRefresh={() => undefined} />));

    const retry = container.querySelector<HTMLButtonElement>('button[aria-label="Reintentar habilidades de Aula de prueba"]');
    expect(container.textContent).toContain("No pudimos cargar las habilidades de esta aula.");
    expect(retry).toBeTruthy();
    await act(async () => retry?.click());

    expect(studentApi.getMyClassroomSkills).toHaveBeenCalledTimes(2);
    expect(assignmentsApi.listStudent).toHaveBeenCalledOnce();
    expect(container.textContent).toContain("Observación");
    expect(container.textContent).not.toContain("No pudimos cargar las habilidades de esta aula.");
  });

  it("deduplicates simultaneous per-resource retries and announces their loading state", async () => {
    let resolveSkills!: (value: unknown) => void;
    let resolveMissions!: (value: unknown) => void;
    studentApi.getMyClassroomSkills.mockRejectedValueOnce(new Error("network")).mockImplementationOnce(() => new Promise((resolve) => { resolveSkills = resolve; }));
    assignmentsApi.listStudent.mockRejectedValueOnce(new Error("network")).mockImplementationOnce(() => new Promise((resolve) => { resolveMissions = resolve; }));
    container = document.createElement("div");
    document.body.append(container);
    root = createRoot(container);

    await act(async () => root?.render(<StudentClassroomsScreen classrooms={[room]} requests={[]} loading={false} error={null} onRefresh={() => undefined} />));
    const retrySkills = container.querySelector<HTMLButtonElement>('button[aria-label="Reintentar habilidades de Aula de prueba"]');
    const retryMissions = container.querySelector<HTMLButtonElement>('button[aria-label="Reintentar misiones de Aula de prueba"]');
    expect(retrySkills).toBeTruthy();
    expect(retryMissions).toBeTruthy();

    await act(async () => { retrySkills?.click(); retrySkills?.click(); retryMissions?.click(); retryMissions?.click(); });

    expect(studentApi.getMyClassroomSkills).toHaveBeenCalledTimes(2);
    expect(assignmentsApi.listStudent).toHaveBeenCalledTimes(2);
    expect(container.textContent).toContain("Cargando habilidades…");
    expect([...container.querySelectorAll('[role="status"]')].some((status) => status.textContent?.includes("Cargando misiones…"))).toBe(true);

    await act(async () => {
      resolveSkills({ ok: true, data: [] });
      resolveMissions({ ok: true, data: [] });
    });
    expect(container.textContent).toContain("Aún no hay habilidades habilitadas.");
    expect(container.textContent).toContain("Tu docente aún no ha publicado misiones en esta aula.");
  });
});
