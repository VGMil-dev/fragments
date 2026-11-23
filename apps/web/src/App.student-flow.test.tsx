// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentAssignment } from "@fragments/contracts";

const mocks = vi.hoisted(() => {
  const studentApi = {
    getMe: vi.fn(), getMyClassrooms: vi.fn(), getMyClassroomRequests: vi.fn(),
    getMyClassroomSkills: vi.fn(), getMentorContext: vi.fn(), getMyProposals: vi.fn(), getMySubmissions: vi.fn(), getGallery: vi.fn(),
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
  MentorScreen: ({ contextState, initialProposal, restoreEvaluation, requiredMissionSkills = [], onSave, onBack }: { contextState: { status: string; data?: { version: number } }; initialProposal?: { id: string; proposal: { title: string } }; restoreEvaluation?: boolean; requiredMissionSkills?: string[]; onSave: (draft: object) => Promise<unknown>; onBack: () => void }) => (
    <section>
      <p data-testid="mentor-context">{contextState.status === "success" ? contextState.data?.version : contextState.status}</p>
      <p data-testid="mentor-required-skills">{requiredMissionSkills.join("|")}</p>
      {initialProposal ? <p data-testid="mentor-proposal">{initialProposal.id}:{initialProposal.proposal.title}</p> : null}
      <p data-testid="mentor-restore-evaluation">{String(Boolean(restoreEvaluation))}</p>
      <button type="button" onClick={() => void onSave({ proposal: { title: "Borrador de misión" } })}>Guardar borrador</button>
      <button type="button" onClick={onBack}>Volver al catálogo</button>
    </section>
  ),
}));
vi.mock("./features/review", () => ({
  ReviewScreen: ({ onBack, linkedProposals }: { onBack: () => void; linkedProposals?: Array<{ id: string; proposal: { title: string } }> }) => <section><p data-testid="review-linked-proposals">{linkedProposals?.map((item) => `${item.id}:${item.proposal.title}`).join(",")}</p><button type="button" onClick={onBack}>Volver desde Review</button></section>,
}));

import { App } from "./App";

const classroom = { id: "class-1", title: "Programación Móvil", subject: "Desarrollo", groupLabel: "Tercero", period: "2026–2027", status: "active", createdAt: "2026-11-22T00:00:00.000Z", updatedAt: "2026-11-22T00:00:00.000Z" };
const mission = {
  id: "mission-v1", assignmentId: "mission", version: 1, classroomId: classroom.id, classroomTitle: classroom.title, subject: classroom.subject,
  title: "Aplicación móvil", instructions: "Define una pantalla inicial.", objectives: ["Explicar la navegación"], requiredSkills: [{ id: "required-navigation", name: "Navegación", description: null }], optionalSkills: [{ id: "optional-accessibility", name: "Accesibilidad", description: null }], status: "published",
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
  mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [] });
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
  it("offers only owned proposals still carrying their published mission context in Review", async () => {
    window.history.replaceState({}, "", "/student/review");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-proposal", version: 1, proposal: { title: "Navegación con Expo" }, assignmentVersionId: mission.id,
        assignmentContext: { assignmentVersionId: mission.id, requiredSkills: ["Navegación"], mentorContext: { version: 7, config: { theme: "Navegación" } } } },
      { id: "stale-proposal", version: 1, proposal: { title: "Sin contexto" }, assignmentVersionId: "old-mission",
        assignmentContext: { assignmentVersionId: "other-mission", requiredSkills: ["Otra"], mentorContext: { version: 1, config: { theme: "Otro" } } } },
    ] });

    await act(async () => root?.render(<App />));

    expect(mocks.studentApi.getMyProposals).toHaveBeenCalledOnce();
    expect(container?.querySelector("[data-testid=review-linked-proposals]")?.textContent).toBe("linked-proposal:Navegación con Expo");
  });

  it("recovers structured required skills from the proposal's pinned context", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-proposal", version: 2, proposal: { title: "Navegación accesible" }, assignmentVersionId: "mission-v1", updatedAt: "2026-11-22T00:00:00.000Z",
        assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: ["Navegación"], mentorContext: { version: 7, config: { requirements: ["Habilidad optativa: Accesibilidad", "Restricción de aula"] } } } },
    ] });

    await act(async () => root?.render(<App />));
    const continueProposal = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Navegación accesible"]');
    await act(async () => continueProposal?.click());

    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
  });

  it("does not restore required skills from a context pinned to a different assignment version", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "stale-context-proposal", version: 2, proposal: { title: "Contexto desactualizado" }, assignmentVersionId: "mission-v1", updatedAt: "2026-11-22T00:00:00.000Z",
        assignmentContext: { assignmentVersionId: "mission-v2", requiredSkills: ["No debe mostrarse"], mentorContext: { version: 8, config: { requirements: [] } } } },
    ] });

    await act(async () => root?.render(<App />));
    const continueProposal = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Contexto desactualizado"]');
    await act(async () => continueProposal?.click());

    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("");
  });

  it("identifies each saved proposal in the Mis proyectos continuation action", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "proposal-one", version: 1, proposal: { title: "Huerto escolar" }, updatedAt: "2026-11-22T00:00:00.000Z" },
      { id: "proposal-two", version: 1, proposal: { title: "" }, updatedAt: "2026-11-22T00:00:00.000Z" },
    ] });

    await act(async () => root?.render(<App />));

    const labels = [...(container?.querySelectorAll<HTMLButtonElement>(".student-project-list button") ?? [])]
      .map((button) => button.getAttribute("aria-label"));
    expect(labels).toEqual([
      "Continuar propuesta: Huerto escolar",
      "Continuar propuesta: Borrador sin título",
    ]);

    const continueProposal = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Huerto escolar"]');
    await act(async () => continueProposal?.click());
    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-proposal]")?.textContent).toBe("proposal-one:Huerto escolar");
    expect(container?.querySelector("[data-testid=mentor-restore-evaluation]")?.textContent).toBe("true");
  });

  it("keeps the published context and version when the student starts and saves a proposal", async () => {
    await act(async () => root?.render(<App />));
    const start = container?.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta para Aplicación móvil"]');
    expect(start).toBeTruthy();

    await act(async () => start?.click());
    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("7");

    const saveButton = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Guardar borrador");
    await act(async () => saveButton?.click());
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
    expect(mocks.studentApi.saveProposalDraft).toHaveBeenCalledWith({
      proposal: { title: "Borrador de misión" }, assignmentVersionId: mission.id,
    });

    const submissionsLink = [...(container?.querySelectorAll<HTMLAnchorElement>("a") ?? [])].find((link) => link.textContent?.includes("Mis entregas"));
    await act(async () => submissionsLink?.click());
    const openMentor = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Abrir Mentor");
    await act(async () => openMentor?.click());
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("2");
    const saveAgain = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Guardar borrador");
    await act(async () => saveAgain?.click());
    expect(mocks.studentApi.saveProposalDraft).toHaveBeenLastCalledWith({ proposal: { title: "Borrador de misión" } });
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("");

    const classroomsLink = [...(container?.querySelectorAll<HTMLAnchorElement>("a") ?? [])].find((link) => link.textContent?.includes("Mis aulas"));
    await act(async () => classroomsLink?.click());
    const startAgain = container?.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta para Aplicación móvil"]');
    await act(async () => startAgain?.click());
    const reviewLink = [...(container?.querySelectorAll<HTMLAnchorElement>("a") ?? [])].find((link) => link.textContent === "Review");
    await act(async () => reviewLink?.click());
    const reviewBack = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Volver desde Review");
    await act(async () => reviewBack?.click());
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("2");
    const saveFromReview = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Guardar borrador");
    await act(async () => saveFromReview?.click());
    expect(mocks.studentApi.saveProposalDraft).toHaveBeenLastCalledWith({ proposal: { title: "Borrador de misión" } });
  });
});
