// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import type { ProposalDraftResponse, StudentAssignment } from "@fragments/contracts";

const { studentApi, assignmentsApi } = vi.hoisted(() => ({
  studentApi: { getMyClassroomSkills: vi.fn(), getMySubmissions: vi.fn(), getMissionDeliveryHistory: vi.fn(), requestClassroom: vi.fn() },
  assignmentsApi: { listStudent: vi.fn() },
}));
vi.mock("../../lib/api/student-api-instance", () => ({ studentApi }));
vi.mock("../assignments/assignments-api.js", () => ({ assignmentsApi }));

import { StudentClassroomsScreen } from "./StudentClassroomsScreen.js";

const room = { id: "fixture-room", title: "Aula de prueba", subject: "Ciencias", groupLabel: "7A", period: null, status: "active" as const, createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" };
const pending = { id: "fixture-request", status: "pending" as const, source: "join_code" as const, requestedAt: "2026-11-19T12:00:00.000Z", decidedAt: null };
const mission = {
  id: "fixture-mission-version", assignmentId: "fixture-mission", version: 1, classroomId: room.id, classroomTitle: room.title, subject: room.subject,
  title: "Misión recuperada", instructions: "Describe una observación.", objectives: ["Registrar evidencia"],
  requiredSkills: [{ id: "fixture-skill", name: "Observación", description: "Describe datos." }], optionalSkills: [], status: "published",
  missionPlanVersion: 1, missionRubric: { title: "Rúbrica de misión", criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cita observaciones verificables.", weight: 100 }] },
  deliverables: [{ id: "deliverable-1", order: 1, title: "Registro", type: "proposal", requirements: ["Incluye observaciones"], dueDate: null, criterionIds: ["criterion-1"] }],
  mentorContextVersion: 2, mentorContext: { version: 2, publishedAt: "2026-11-19T12:00:00.000Z", config: {
    subject: room.subject, theme: "Observar", assignment: "Describe una observación.", expectedLevel: "Bachillerato", rubricTitle: "Rúbrica del aula",
    criteria: [{ id: "class-criterion", title: "Claridad", description: "Explica con claridad.", weight: 100 }], requirements: ["Registrar evidencia"],
  } }, createdAt: "2026-11-19T12:00:00.000Z",
} as unknown as StudentAssignment;
const fakeOwnProposal = { id: "fixture-own-proposal", version: 2, proposal: { title: "Propuesta propia" }, assignmentVersionId: mission.id, updatedAt: "2026-11-24T00:00:00.000Z" } as unknown as ProposalDraftResponse;
const skill = (id: string, name: string) => ({ id, name, description: `${name} descripción`, archived: false, createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" });
const props = { classrooms: [room], requests: [pending], loading: false, error: null, onRefresh: vi.fn() };
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.defineProperty(window, "scrollTo", { configurable: true, value: vi.fn() });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

async function mount(ui: ReactNode) {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root?.render(ui));
  return container;
}

async function click(selector: string) {
  const button = container?.querySelector<HTMLButtonElement>(selector);
  expect(button, `Expected control ${selector}`).toBeTruthy();
  await act(async () => button?.click());
}

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  for (const mock of Object.values(studentApi)) mock.mockReset();
  assignmentsApi.listStudent.mockReset();
});

describe("StudentClassroomsScreen V5", () => {
  it("shows active classroom cards only, eight initially, and no classroom content until selection", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [] });
    const classrooms = Array.from({ length: 9 }, (_, index) => ({ ...room, id: `room-${index}`, title: `Aula ${index + 1}` }));
    const view = await mount(<StudentClassroomsScreen {...props} classrooms={classrooms} />);
    expect(view.querySelectorAll('[aria-label^="Abrir aula"]').length).toBe(8);
    expect(view.textContent).toContain("Aula 8");
    expect(view.textContent).not.toContain("Aula 9");
    expect(view.textContent).not.toContain("Misión recuperada");
    await click('button[aria-label="Ver más aulas"]');
    expect(view.textContent).toContain("Aula 9");
    const search = view.querySelector<HTMLInputElement>('input[placeholder="Buscar aula, asignatura o grupo"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "Aula 9");
      search?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.querySelectorAll('[aria-label^="Abrir aula"]').length).toBe(1);
    expect(view.textContent).toContain("Aula 9");
    expect(view.textContent).not.toContain("Aula 8");
  });

  it("opens one active classroom and reveals published mission details on request", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: Array.from({ length: 4 }, (_, index) => ({ ...mission, id: `mission-${index}`, title: `Misión ${index + 1}` })) });
    const onStartProposal = vi.fn();
    const view = await mount(<StudentClassroomsScreen {...props} proposals={[]} proposalsLoading={false} onStartProposal={onStartProposal} />);
    await click('button[aria-label="Abrir aula Aula de prueba"]');
    expect(view.textContent).toContain("Volver a mis aulas");
    expect(view.textContent).toContain("Habilidades del aula");
    expect(view.textContent).toContain("Misión 3");
    expect(view.textContent).not.toContain("Misión 4");
    expect(view.textContent).not.toContain("Describe una observación.");
    await click('button[aria-label="Ver misión Misión 1"]');
    expect(view.textContent).toContain("Describe una observación.");
    expect(view.textContent).toContain("Registrar evidencia");
    expect(view.textContent).toContain("Observación");
    expect(view.textContent).toContain("Rúbrica de misión");
    expect(view.textContent).toContain("Registro");
    expect(view.textContent).toContain("Contexto Mentor v2");
    expect(view.textContent).toContain("Fase académica");
    expect(view.textContent).toContain("Iniciar propuesta");
    expect(view.querySelector('[aria-label="Iniciar propuesta: Misión 1"]')).toBeTruthy();
    await click('button[aria-label="Ver más misiones"]');
    expect(view.textContent).toContain("Misión 4");
  });

  it("deduplicates inventory by skill ID, shows classroom origins, and filters by classroom and query", async () => {
    studentApi.getMyClassroomSkills.mockImplementation(async (classroomId: string) => ({ ok: true, data: classroomId === "room-a" ? [skill("skill-same", "Observación"), skill("skill-one", "Análisis")] : [skill("skill-same", "Observación"), skill("skill-two", "Observación")] }));
    assignmentsApi.listStudent.mockImplementation(async (classroomId: string) => ({ ok: true, data: [{ ...mission, classroomId, classroomTitle: classroomId === "room-a" ? "Aula A" : "Aula B" }] }));
    const classrooms = [{ ...room, id: "room-a", title: "Aula A" }, { ...room, id: "room-b", title: "Aula B" }];
    const view = await mount(<StudentClassroomsScreen {...props} classrooms={classrooms} />);
    await click('button[aria-label="Inventario de habilidades"]');
    expect(view.querySelectorAll('[data-skill-id="skill-same"]').length).toBe(1);
    expect(view.querySelectorAll('[data-skill-id="skill-one"]').length).toBe(1);
    expect(view.querySelectorAll('[data-skill-id="skill-two"]').length).toBe(1);
    const sharedSkill = view.querySelector('[data-skill-id="skill-same"]');
    expect(sharedSkill?.textContent).toContain("Aula A");
    expect(sharedSkill?.textContent).toContain("Aula B");
    const search = view.querySelector<HTMLInputElement>('input[placeholder="Buscar habilidad"]');
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "Análisis");
      search?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(view.querySelectorAll('[data-skill-id="skill-one"]').length).toBe(1);
    expect(view.querySelectorAll('[data-skill-id="skill-same"]').length).toBe(0);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "");
      search?.dispatchEvent(new Event("input", { bubbles: true }));
    });
    const filter = view.querySelector<HTMLSelectElement>("#skillScope");
    expect(filter).toBeTruthy();
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(filter, "room-a");
      filter?.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(view.querySelectorAll('[data-skill-id="skill-same"]').length).toBe(1);
    expect(view.querySelector('[data-skill-id="skill-same"]')?.textContent).not.toContain("Aula B");
  });

  it("uses only active enrollments to request private classroom content", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [] });
    const inactive = { ...room, id: "inactive-room", title: "Aula archivada", status: "archived" as const };
    const view = await mount(<StudentClassroomsScreen {...props} classrooms={[room, inactive]} />);
    expect(view.textContent).not.toContain("Aula archivada");
    expect(studentApi.getMyClassroomSkills).toHaveBeenCalledTimes(1);
    expect(studentApi.getMyClassroomSkills).toHaveBeenCalledWith(room.id);
    expect(assignmentsApi.listStudent).toHaveBeenCalledTimes(1);
    expect(assignmentsApi.listStudent).toHaveBeenCalledWith(room.id);
  });

  it("shows the persisted phase and routes through the existing continuation callback", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [{ id: "mentor-result", kind: "mentor", sourceId: fakeOwnProposal.id }] });
    studentApi.getMissionDeliveryHistory.mockResolvedValue({ ok: true, data: { nextDeliverableId: "deliverable-1", deliveries: [] } });
    const onContinueProposal = vi.fn();
    const view = await mount(<StudentClassroomsScreen {...props} proposals={[fakeOwnProposal]} proposalsLoading={false} onContinueProposal={onContinueProposal} />);
    await click('button[aria-label="Abrir aula Aula de prueba"]');
    await click('button[aria-label="Ver misión Misión recuperada"]');
    expect(view.textContent).toContain("Fase académica: Review");
    expect(view.textContent).toContain("Siguiente acción: Continuar en Review");
    await click('button[aria-label="Continuar misión: Misión recuperada"]');
    expect(onContinueProposal).toHaveBeenCalledExactlyOnceWith(fakeOwnProposal);
    expect(studentApi.getMySubmissions).toHaveBeenCalledOnce();
    expect(studentApi.getMissionDeliveryHistory).toHaveBeenCalledExactlyOnceWith(fakeOwnProposal.id);
  });

  it("fails closed when the persisted academic phase cannot be confirmed", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    studentApi.getMySubmissions.mockResolvedValue({ ok: false, error: { code: "SERVICE_UNAVAILABLE", message: "hidden" } });
    const view = await mount(<StudentClassroomsScreen {...props} proposals={[fakeOwnProposal]} proposalsLoading={false} onContinueProposal={vi.fn()} />);
    await click('button[aria-label="Abrir aula Aula de prueba"]');
    await click('button[aria-label="Ver misión Misión recuperada"]');
    expect(view.textContent).toContain("No pudimos confirmar la fase guardada.");
    expect(view.textContent).not.toContain("Continuar en Review");
    expect(view.querySelector('[aria-label="Continuar misión: Misión recuperada"]')).toBeNull();
  });

  it("preserves request status history and submits a valid invitation code via the existing API", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [] });
    studentApi.requestClassroom.mockResolvedValue({ ok: true, data: pending });
    const view = await mount(<StudentClassroomsScreen {...props} requests={[pending, { ...pending, id: "rejected", status: "rejected" }]} />);
    await click('button[aria-label="Solicitudes"]');
    expect(view.textContent).toContain("Pendiente de aprobación");
    expect(view.textContent).toContain("Rechazada");
    const input = view.querySelector<HTMLInputElement>("#classroom-join-code");
    const code = "a".repeat(32);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, code);
      input?.dispatchEvent(new Event("input", { bubbles: true }));
      input?.dispatchEvent(new Event("change", { bubbles: true }));
      input?.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(studentApi.requestClassroom).toHaveBeenCalledExactlyOnceWith(code);
    expect(view.textContent).toContain("Solicitud enviada");
  });

  it("shows a server validation error without clearing the entered join code", async () => {
    studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
    assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [] });
    studentApi.requestClassroom.mockResolvedValue({ ok: false, error: { code: "INVALID_JOIN_CODE", message: "hidden" } });
    const view = await mount(<StudentClassroomsScreen {...props} />);
    await click('button[aria-label="Solicitudes"]');
    const input = view.querySelector<HTMLInputElement>("#classroom-join-code");
    const code = "b".repeat(32);
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, code);
      input?.dispatchEvent(new Event("input", { bubbles: true }));
      input?.form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    });
    expect(view.textContent).toContain("El código no es válido o ya no está activo.");
    expect(input?.value).toBe(code);
    expect(view.textContent).not.toContain("Solicitud enviada");
  });

  it("renders honest loading, error, and empty states", () => {
    const render = (props: Parameters<typeof StudentClassroomsScreen>[0]) => renderToStaticMarkup(<StudentClassroomsScreen {...props} />);
    expect(render({ classrooms: [], requests: [], loading: true, error: null, onRefresh: () => undefined })).toContain("Cargando tus aulas");
    expect(render({ classrooms: [], requests: [], loading: false, error: "No pudimos cargar tus aulas.", onRefresh: () => undefined })).toContain("No pudimos cargar tus aulas.");
    expect(render({ classrooms: [], requests: [], loading: false, error: null, onRefresh: () => undefined })).toContain("Aún no tienes matrículas activas");
  });
});
