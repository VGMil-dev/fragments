// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentAssignment } from "@fragments/contracts";

const mocks = vi.hoisted(() => {
  const studentApi = {
    getMe: vi.fn(), getMyClassrooms: vi.fn(), getMyClassroomRequests: vi.fn(),
    getMyClassroomSkills: vi.fn(), getMentorContext: vi.fn(), getMyProposals: vi.fn(), getGallery: vi.fn(),
    saveProposalDraft: vi.fn(),
  };
  return { studentApi, assignmentsApi: { listStudent: vi.fn() } };
});

vi.mock("./lib/api/api-client", () => ({ createApiClient: vi.fn(() => ({})) }));
vi.mock("./lib/api/student-api", () => ({ createStudentApi: vi.fn(() => mocks.studentApi) }));
vi.mock("./lib/api/trainer-api", () => ({ createTrainerApi: vi.fn(() => ({})) }));
vi.mock("./lib/api/student-api-instance", () => ({ studentApi: mocks.studentApi }));
vi.mock("./features/assignments/assignments-api.js", () => ({ assignmentsApi: mocks.assignmentsApi }));
vi.mock("./features/mentor", () => ({
  MentorScreen: ({ contextState, onSave, onBack }: { contextState: { status: string; data?: { version: number } }; onSave: (draft: object) => Promise<unknown>; onBack: () => void }) => (
    <section>
      <p data-testid="mentor-context">{contextState.status === "success" ? contextState.data?.version : contextState.status}</p>
      <button type="button" onClick={() => void onSave({ proposal: { title: "Borrador de misión" } })}>Guardar borrador</button>
      <button type="button" onClick={onBack}>Volver al catálogo</button>
    </section>
  ),
}));

import { App } from "./App";

const classroom = { id: "class-1", title: "Programación Móvil", subject: "Desarrollo", groupLabel: "Tercero", period: "2026–2027", status: "active", createdAt: "2026-11-22T00:00:00.000Z", updatedAt: "2026-11-22T00:00:00.000Z" };
const mission = {
  id: "mission-v1", assignmentId: "mission", version: 1, classroomId: classroom.id, classroomTitle: classroom.title, subject: classroom.subject,
  title: "Aplicación móvil", instructions: "Define una pantalla inicial.", objectives: ["Explicar la navegación"], requiredSkills: [], optionalSkills: [], status: "published",
  mentorContextVersion: 7, mentorContext: { version: 7, publishedAt: "2026-11-22T00:00:00.000Z", config: {
    subject: classroom.subject, theme: "Navegación", assignment: "Define una pantalla inicial.", expectedLevel: "Bachillerato", rubricTitle: "Contexto QA", requirements: ["Explicar la navegación"], criteria: [],
  } }, createdAt: "2026-11-22T00:00:00.000Z",
} as StudentAssignment;

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let root: ReturnType<typeof createRoot> | undefined;
let container: HTMLDivElement | undefined;

beforeEach(() => {
  window.history.replaceState({}, "", "/student/classrooms");
  window.scrollTo = vi.fn();
  mocks.studentApi.getMe.mockResolvedValue({ ok: true, data: { authenticated: true, githubLogin: "qa-student", profileUrl: "https://github.com/qa-student" } });
  mocks.studentApi.getMyClassrooms.mockResolvedValue({ ok: true, data: [classroom] });
  mocks.studentApi.getMyClassroomRequests.mockResolvedValue({ ok: true, data: [] });
  mocks.studentApi.getMyClassroomSkills.mockResolvedValue({ ok: true, data: [] });
  mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [] });
  mocks.studentApi.getGallery.mockResolvedValue({ ok: true, data: { items: [], nextOffset: null } });
  mocks.studentApi.getMentorContext.mockResolvedValue({ ok: true, data: { version: 2 } });
  mocks.studentApi.saveProposalDraft.mockResolvedValue({ ok: true, data: { id: "proposal-1", version: 1, proposal: { title: "Borrador de misión" } } });
  mocks.assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) act(() => root?.unmount());
  root = undefined;
  container?.remove();
  container = undefined;
  for (const fn of Object.values(mocks.studentApi)) fn.mockReset();
  mocks.assignmentsApi.listStudent.mockReset();
});

describe("student mission to Mentor flow", () => {
  it("keeps the published context and version when the student starts and saves a proposal", async () => {
    await act(async () => root?.render(<App />));
    const start = container?.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta para Aplicación móvil"]');
    expect(start).toBeTruthy();

    await act(async () => start?.click());
    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("7");

    const saveButton = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Guardar borrador");
    await act(async () => saveButton?.click());
    expect(mocks.studentApi.saveProposalDraft).toHaveBeenCalledWith({
      proposal: { title: "Borrador de misión" }, assignmentVersionId: mission.id,
    });

    const back = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Volver al catálogo");
    await act(async () => back?.click());
    const mentorLink = [...(container?.querySelectorAll<HTMLAnchorElement>("a") ?? [])].find((link) => link.textContent === "Mentor");
    await act(async () => mentorLink?.click());
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("2");
    const saveAgain = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Guardar borrador");
    await act(async () => saveAgain?.click());
    expect(mocks.studentApi.saveProposalDraft).toHaveBeenLastCalledWith({ proposal: { title: "Borrador de misión" } });
  });
});
