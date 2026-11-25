// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentAssignment } from "@fragments/contracts";

type ProposalContextProbe = {
  assignmentVersionId?: string;
  mentorContext: { config: { theme?: string; rubricTitle?: string } };
  requiredSkills: Array<{ name: string }>;
};

const mocks = vi.hoisted(() => {
  const studentApi = {
    getMe: vi.fn(), getMyClassrooms: vi.fn(), getMyClassroomRequests: vi.fn(),
    getMyClassroomSkills: vi.fn(), getMentorContext: vi.fn(), getMyProposals: vi.fn(), getMySubmissions: vi.fn(), getMissionDeliveryHistory: vi.fn(), getGallery: vi.fn(),
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
  MentorScreen: ({ contextState, initialProposal, savedProposals = [], restoreEvaluation, missionClassroomId, requiredMissionSkills = [], onSave, onBack }: { contextState: { status: string; data?: { version: number; config?: { theme?: string } } }; initialProposal?: { id: string; proposal: { title: string }; assignmentVersionId?: string; assignmentContext?: ProposalContextProbe }; savedProposals?: Array<{ assignmentContext?: ProposalContextProbe }>; restoreEvaluation?: boolean; missionClassroomId?: string; requiredMissionSkills?: Array<{ id: string; name: string }>; onSave: (draft: object) => Promise<unknown>; onBack: () => void }) => (
    <section>
      <p data-testid="mentor-context">{contextState.status === "success" ? contextState.data?.version : contextState.status}</p>
      <p data-testid="mentor-context-theme">{contextState.status === "success" ? contextState.data?.config?.theme ?? "" : ""}</p>
      <p data-testid="mentor-required-skills">{requiredMissionSkills.map((skill) => skill.name).join("|")}</p>
      <p data-testid="mentor-required-skill-ids">{requiredMissionSkills.map((skill) => skill.id).join("|")}</p>
      <p data-testid="mentor-mission-classroom">{missionClassroomId ?? ""}</p>
      <p data-testid="mentor-proposal-assignment-version">{initialProposal?.assignmentVersionId ?? ""}</p>
      <p data-testid="mentor-proposal-context-assignment-version">{initialProposal?.assignmentContext?.assignmentVersionId ?? ""}</p>
      <p data-testid="mentor-proposal-context-theme">{initialProposal?.assignmentContext?.mentorContext.config.theme ?? ""}</p>
      <p data-testid="mentor-proposal-context-rubric">{initialProposal?.assignmentContext?.mentorContext.config.rubricTitle ?? ""}</p>
      <p data-testid="mentor-saved-proposal-contexts">{savedProposals.map((item) => `${item.assignmentContext?.mentorContext.config.theme ?? ""}:${item.assignmentContext?.mentorContext.config.rubricTitle ?? ""}:${item.assignmentContext?.requiredSkills.map((skill) => skill.name).join(",") ?? ""}`).join("|")}</p>
      {initialProposal ? <p data-testid="mentor-proposal">{initialProposal.id}:{initialProposal.proposal.title}</p> : null}
      <p data-testid="mentor-restore-evaluation">{String(Boolean(restoreEvaluation))}</p>
      <button type="button" onClick={() => void onSave({ proposal: { title: "Borrador de misión" } })}>Guardar borrador</button>
      <button type="button" onClick={onBack}>Volver al catálogo</button>
    </section>
  ),
}));
vi.mock("./features/review", () => ({
  ReviewScreen: ({ onBack, onOpenTrainer, linkedProposals, initialProposalId }: { onBack: () => void; onOpenTrainer?: (reviewId?: string) => void; linkedProposals?: Array<{ id: string; proposal: { title: string } }>; initialProposalId?: string }) => <section><p data-testid="review-linked-proposals">{linkedProposals?.map((item) => `${item.id}:${item.proposal.title}`).join(",")}</p><p data-testid="review-initial-proposal">{initialProposalId}</p><button type="button" onClick={onBack}>Volver desde Review</button><button type="button" data-testid="review-to-trainer" onClick={() => onOpenTrainer?.("review-42")}>Continuar en Trainer</button></section>,
}));
vi.mock("./features/trainer", () => ({
  TrainerScreen: ({ onStartReview, initialReviewId }: { onStartReview?: () => void; initialReviewId?: string }) => <section><p data-testid="trainer-review-id">{initialReviewId}</p><button type="button" data-testid="trainer-to-review" onClick={onStartReview}>Empezar en Review</button></section>,
}));

import { App } from "./App";

const classroom = { id: "class-1", title: "Programación Móvil", subject: "Desarrollo", groupLabel: "Tercero", period: "2026–2027", status: "active", createdAt: "2026-11-22T00:00:00.000Z", updatedAt: "2026-11-22T00:00:00.000Z" };
const otherClassroom = { ...classroom, id: "class-2", title: "Otra aula" };
const mission = {
  id: "mission-v1", assignmentId: "mission", version: 1, classroomId: classroom.id, classroomTitle: classroom.title, subject: classroom.subject,
  title: "Aplicación móvil", instructions: "Define una pantalla inicial.", objectives: ["Explicar la navegación"], requiredSkills: [{ id: "required-navigation", name: "Navegación", description: null }], optionalSkills: [{ id: "optional-accessibility", name: "Accesibilidad", description: null }], status: "published",
  mentorContextVersion: 7, mentorContext: { version: 7, publishedAt: "2026-11-22T00:00:00.000Z", config: {
    subject: classroom.subject, theme: "Navegación", assignment: "Define una pantalla inicial.", expectedLevel: "Bachillerato", rubricTitle: "Contexto QA", requirements: ["Explicar la navegación"], criteria: [],
  } }, createdAt: "2026-11-22T00:00:00.000Z",
} as unknown as StudentAssignment;

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
  mocks.studentApi.getMissionDeliveryHistory.mockResolvedValue({ ok: true, data: { proposalId: "qa-proposal", assignmentVersionId: "mission-v1", nextDeliverableId: "delivery-1", deliveries: [] } });
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
  it("shows each saved Review commit and rubric in the delivery history", async () => {
    window.history.replaceState({}, "", "/student/submissions");
    const olderSha = "a".repeat(40);
    const newerSha = "b".repeat(40);
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [
      { id: "review-new", kind: "review", sourceId: "job-new", label: "qa-student/demo", score: 82, rubricVersion: "mission-v2-rubric", commitSha: newerSha, createdAt: "2026-11-25T12:00:00.000Z" },
      { id: "review-old", kind: "review", sourceId: "job-old", label: "qa-student/demo", score: 71, rubricVersion: "mission-v1-rubric", commitSha: olderSha, createdAt: "2026-11-24T12:00:00.000Z" },
    ] });

    await act(async () => root?.render(<App />));

    const rows = [...(container?.querySelectorAll<HTMLLIElement>(".student-submission-list li") ?? [])];
    expect(rows).toHaveLength(2);
    expect(rows[0]?.textContent).toContain(`Commit: ${newerSha}`);
    expect(rows[0]?.textContent).toContain("Rúbrica: mission-v2-rubric");
    expect(rows[1]?.textContent).toContain(`Commit: ${olderSha}`);
    expect(rows[1]?.textContent).toContain("Rúbrica: mission-v1-rubric");
    expect(rows[0]?.querySelector("code")?.textContent).toBe(newerSha);
  });

  it("starts the only published classroom mission directly from the Dashboard with its pinned context and skills", async () => {
    window.history.replaceState({}, "", "/student/dashboard");
    mocks.studentApi.getMyClassrooms.mockResolvedValue({ ok: true, data: [otherClassroom, classroom] });
    mocks.assignmentsApi.listStudent.mockImplementation(async (classroomId: string) => ({ ok: true, data: classroomId === classroom.id ? [mission] : [] }));
    await act(async () => root?.render(<App />));

    const start = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent?.includes("Iniciar misión en Mentor"));
    expect(start).toBeDefined();
    await act(async () => start?.click());

    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("7");
    expect(container?.querySelector("[data-testid=mentor-context-theme]")?.textContent).toBe("Navegación");
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
    expect(container?.querySelector("[data-testid=mentor-required-skill-ids]")?.textContent).toBe("required-navigation");
    expect(container?.querySelector("[data-testid=mentor-mission-classroom]")?.textContent).toBe(classroom.id);
  });

  it("starts a new published mission from Mis aulas with its exact pinned context and without an existing proposal", async () => {
    window.history.replaceState({}, "", "/student/classrooms");
    mocks.assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [] });
    await act(async () => root?.render(<App />));

    const start = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.getAttribute("aria-label") === "Iniciar propuesta: Aplicación móvil");
    expect(start).toBeDefined();
    expect(mocks.studentApi.saveProposalDraft).not.toHaveBeenCalled();
    await act(async () => start?.click());

    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-mission-classroom]")?.textContent).toBe(classroom.id);
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("7");
    expect(container?.querySelector("[data-testid=mentor-context-theme]")?.textContent).toBe("Navegación");
    expect(container?.querySelector("[data-testid=mentor-required-skill-ids]")?.textContent).toBe("required-navigation");
    expect(container?.querySelector("[data-testid=mentor-proposal]")).toBeNull();
  });

  it("continues the exact proposal linked to a mission opened from Mis aulas", async () => {
    window.history.replaceState({}, "", "/student/classrooms");
    mocks.assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{
      id: "linked-classroom-proposal",
      version: 4,
      proposal: { title: "Propuesta móvil" },
      assignmentVersionId: mission.id,
      updatedAt: "2026-11-23T12:00:00.000Z",
      assignmentContext: {
        assignmentVersionId: mission.id,
        requiredSkills: [{ id: "required-navigation", name: "Navegación" }],
        mentorContext: { version: 7, config: { theme: "Navegación fijada", rubricTitle: "Rúbrica fijada" } },
      },
    }] });

    await act(async () => root?.render(<App />));

    const linked = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Continuar misión");
    expect(linked).toBeDefined();
    await act(async () => linked?.click());

    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-proposal]")?.textContent).toBe("linked-classroom-proposal:Propuesta móvil");
    expect(container?.querySelector("[data-testid=mentor-proposal-assignment-version]")?.textContent).toBe(mission.id);
    expect(container?.querySelector("[data-testid=mentor-context-theme]")?.textContent).toBe("Navegación fijada");
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
  });

  it("continues to Review when the linked proposal already has a persisted Mentor evaluation", async () => {
    window.history.replaceState({}, "", "/student/classrooms");
    mocks.assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{
      id: "evaluated-mission-proposal", version: 2, proposal: { title: "Navegación Expo" }, assignmentVersionId: mission.id,
      updatedAt: "2026-11-23T12:00:00.000Z", assignmentContext: { assignmentVersionId: mission.id, requiredSkills: [], mentorContext: { version: 7, config: { theme: "Navegación" } } },
    }] });
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [{ kind: "mentor", sourceId: "evaluated-mission-proposal" }] });
    await act(async () => root?.render(<App />));
    const linked = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Continuar misión");
    await act(async () => linked?.click());
    expect(window.location.pathname).toBe("/student/review");
    expect(container?.querySelector("[data-testid=review-initial-proposal]")?.textContent).toBe("evaluated-mission-proposal");
  });

  it("continues to Trainer after every published delivery has a completed Review", async () => {
    window.history.replaceState({}, "", "/student/classrooms");
    mocks.assignmentsApi.listStudent.mockResolvedValue({ ok: true, data: [mission] });
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{
      id: "completed-mission-proposal", version: 2, proposal: { title: "Navegación Expo" }, assignmentVersionId: mission.id,
      updatedAt: "2026-11-23T12:00:00.000Z", assignmentContext: { assignmentVersionId: mission.id, requiredSkills: [], mentorContext: { version: 7, config: { theme: "Navegación" } } },
    }] });
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [{ kind: "mentor", sourceId: "completed-mission-proposal" }] });
    mocks.studentApi.getMissionDeliveryHistory.mockResolvedValue({ ok: true, data: {
      proposalId: "completed-mission-proposal", assignmentVersionId: mission.id, nextDeliverableId: null,
      deliveries: [
        { deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: [], dueDate: null, criterionIds: [] }, status: "completed", attempts: [] },
        { deliverable: { id: "delivery-2", order: 2, title: "Avance", type: "progress", requirements: [], dueDate: null, criterionIds: [] }, status: "completed", attempts: [{
          reviewId: "final-delivery-review", commitSha: "c".repeat(40), status: "completed", createdAt: "2026-11-25T10:00:00.000Z", updatedAt: "2026-11-25T10:00:00.000Z",
        }] },
      ],
    } });
    await act(async () => root?.render(<App />));
    const linked = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Continuar misión");
    await act(async () => linked?.click());
    expect(window.location.pathname).toBe("/student/trainer");
    expect(window.location.search).toBe("?reviewId=final-delivery-review");
  });

  it("continues a saved project from Mis proyectos according to its persisted academic state", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{
      id: "project-own", version: 3, proposal: { title: "Navegación Expo" }, assignmentVersionId: mission.id,
      assignmentContext: { assignmentVersionId: mission.id, requiredSkills: [], mentorContext: { version: 7, config: { theme: "Navegación" } } },
    }] });
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [{ kind: "mentor", sourceId: "project-own" }] });
    mocks.studentApi.getMissionDeliveryHistory.mockResolvedValue({ ok: true, data: {
      proposalId: "project-own", assignmentVersionId: mission.id, nextDeliverableId: null,
      deliveries: [{ deliverable: { id: "final-delivery", order: 1, title: "Entrega final", type: "final", requirements: [], dueDate: null, criterionIds: [] }, status: "completed", attempts: [
        { reviewId: "final-review-own", commitSha: "c".repeat(40), status: "completed", createdAt: "2026-11-25T10:00:00.000Z", updatedAt: "2026-11-25T10:15:00.000Z" },
      ] }],
    } });

    await act(async () => root?.render(<App />));
    const continueButton = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Navegación Expo"]');
    await act(async () => continueButton?.click());

    expect(mocks.studentApi.getMySubmissions).toHaveBeenCalledOnce();
    expect(mocks.studentApi.getMissionDeliveryHistory).toHaveBeenCalledWith("project-own");
    expect(window.location.pathname).toBe("/student/trainer");
    expect(window.location.search).toBe("?reviewId=final-review-own");
  });

  it("stays in Mis proyectos when the evaluation history cannot be read", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{ id: "project-unlinked", version: 1, proposal: { title: "Proyecto propio" } }] });
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: false, error: { code: "TEMPORARY_UNAVAILABLE", message: "Unavailable" } });

    await act(async () => root?.render(<App />));
    const continueButton = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Proyecto propio"]');
    await act(async () => continueButton?.click());

    expect(window.location.pathname).toBe("/student/projects");
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain("No pudimos confirmar el estado guardado de tu proyecto");
    expect(container?.querySelector('[role="alert"] button')?.textContent).toBe("Reintentar");
  });

  it("continues to Mentor without querying delivery history when no Mentor evaluation exists", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{ id: "project-linked", version: 1, proposal: { title: "Proyecto vinculado" }, assignmentVersionId: mission.id }] });
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [] });
    mocks.studentApi.getMissionDeliveryHistory.mockResolvedValue({ ok: false, error: { code: "TEMPORARY_UNAVAILABLE", message: "Unavailable" } });

    await act(async () => root?.render(<App />));
    const continueButton = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Proyecto vinculado"]');
    await act(async () => continueButton?.click());

    expect(mocks.studentApi.getMissionDeliveryHistory).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-proposal]")?.textContent).toContain("project-linked");
  });

  it("does not continue to Review when an evaluated mission's delivery history fails", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [{ id: "project-reviewed", version: 1, proposal: { title: "Proyecto evaluado" }, assignmentVersionId: mission.id }] });
    mocks.studentApi.getMySubmissions.mockResolvedValue({ ok: true, data: [{ kind: "mentor", sourceId: "project-reviewed" }] });
    mocks.studentApi.getMissionDeliveryHistory.mockResolvedValue({ ok: false, error: { code: "TEMPORARY_UNAVAILABLE", message: "Unavailable" } });

    await act(async () => root?.render(<App />));
    const continueButton = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Proyecto evaluado"]');
    await act(async () => continueButton?.click());

    expect(window.location.pathname).toBe("/student/projects");
    expect(container?.querySelector('[role="alert"]')?.textContent).toContain("No pudimos confirmar el estado guardado de tu proyecto");
  });

  it("waits for owned proposals before allowing a new classroom proposal", async () => {
    let finishProposals: () => void = () => undefined;
    mocks.studentApi.getMyProposals.mockImplementation(() => new Promise((resolve) => {
      finishProposals = () => resolve({ ok: true, data: [] });
    }));

    await act(async () => root?.render(<App />));

    expect(container?.textContent).toContain("Espera mientras consultamos tus propuestas antes de iniciar.");
    expect(container?.querySelector('button[aria-label="Iniciar propuesta: Aplicación móvil"]')).toBeNull();

    await act(async () => finishProposals());

    expect(container?.querySelector('button[aria-label="Iniciar propuesta: Aplicación móvil"]')).not.toBeNull();
  });

  it("does not offer a generic proposal when classrooms cannot be checked and retries the classroom query", async () => {
    window.history.replaceState({}, "", "/student/dashboard");
    mocks.studentApi.getMyClassrooms.mockResolvedValueOnce({ ok: false, error: { code: "UNAVAILABLE", message: "No disponible" } });
    await act(async () => root?.render(<App />));

    expect(container?.textContent).toContain("No pudimos consultar tus misiones");
    expect(container?.textContent).not.toContain("Crear mi primer proyecto");
    const retry = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Reintentar misiones");
    await act(async () => retry?.click());

    expect(mocks.studentApi.getMyClassrooms).toHaveBeenCalledTimes(2);
    expect(container?.textContent).toContain("Iniciar misión en Mentor");
  });

  it("navigates between Review and Trainer through their integrated continuation links", async () => {
    window.history.replaceState({}, "", "/student/trainer");
    await act(async () => root?.render(<App />));

    await act(async () => container?.querySelector<HTMLButtonElement>("[data-testid=trainer-to-review]")?.click());
    expect(window.location.pathname).toBe("/student/review");
    expect(container?.querySelector("[data-testid=review-linked-proposals]")).not.toBeNull();

    await act(async () => container?.querySelector<HTMLButtonElement>("[data-testid=review-to-trainer]")?.click());
    expect(window.location.pathname).toBe("/student/trainer");
    expect(window.location.search).toBe("?reviewId=review-42");
    expect(container?.querySelector("[data-testid=trainer-review-id]")?.textContent).toBe("review-42");
    expect(container?.querySelector("[data-testid=trainer-to-review]")).not.toBeNull();
  });

  it("offers only owned proposals still carrying their published mission context in Review", async () => {
    window.history.replaceState({}, "", "/student/review");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-proposal", version: 1, proposal: { title: "Navegación con Expo" }, assignmentVersionId: mission.id,
        assignmentContext: { assignmentVersionId: mission.id, requiredSkills: [{ id: "required-navigation", name: "Navegación" }], mentorContext: { version: 7, config: { theme: "Navegación" } } } },
      { id: "stale-proposal", version: 1, proposal: { title: "Sin contexto" }, assignmentVersionId: "old-mission",
        assignmentContext: { assignmentVersionId: "other-mission", requiredSkills: [{ id: "other", name: "Otra" }], mentorContext: { version: 1, config: { theme: "Otro" } } } },
    ] });

    await act(async () => root?.render(<App />));

    expect(mocks.studentApi.getMyProposals).toHaveBeenCalledOnce();
    expect(container?.querySelector("[data-testid=review-linked-proposals]")?.textContent).toBe("linked-proposal:Navegación con Expo");
  });

  it("recovers structured required skills from the proposal's pinned context", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-proposal", version: 2, proposal: { title: "Navegación accesible" }, assignmentVersionId: "mission-v1", updatedAt: "2026-11-22T00:00:00.000Z",
        assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: [{ id: "required-navigation", name: "Navegación" }], mentorContext: { version: 7, config: { requirements: ["Habilidad optativa: Accesibilidad", "Restricción de aula"] } } } },
    ] });

    await act(async () => root?.render(<App />));
    const continueProposal = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Navegación accesible"]');
    await act(async () => continueProposal?.click());

    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
  });

  it("restores the requested own proposal when Mentor is opened from its URL", async () => {
    window.history.replaceState({}, "", "/student/mentor?proposalId=linked-proposal");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-proposal", version: 2, proposal: { title: "Navegación accesible" }, assignmentVersionId: "mission-v1",
        assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: [{ id: "required-navigation", name: "Navegación" }], mentorContext: { version: 7, config: { theme: "Navegación para la aplicación" } } } },
    ] });

    await act(async () => root?.render(<App />));

    expect(container?.querySelector("[data-testid=mentor-proposal]")?.textContent).toBe("linked-proposal:Navegación accesible");
    expect(container?.querySelector("[data-testid=mentor-context-theme]")?.textContent).toBe("Navegación para la aplicación");
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
  });

  it("does not show an empty Mentor form when a requested proposal is not owned", async () => {
    window.history.replaceState({}, "", "/student/mentor?proposalId=not-owned");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "another-proposal", version: 1, proposal: { title: "Otra propuesta" } },
    ] });

    await act(async () => root?.render(<App />));

    expect(container?.querySelector("[role=alert]")?.textContent).toContain("No encontramos esa propuesta en tu cuenta");
    expect(container?.querySelector("[data-testid=mentor-proposal]")).toBeNull();
    expect(container?.querySelector("[data-testid=mentor-context]")).toBeNull();
  });

  it("keeps a requested proposal out of the empty editor when loading proposals fails", async () => {
    window.history.replaceState({}, "", "/student/mentor?proposalId=linked-proposal");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: false, error: { code: "OTHER", message: "Unavailable" } });

    await act(async () => root?.render(<App />));

    expect(container?.querySelector("[role=alert]")?.textContent).toContain("No pudimos comprobar tus propuestas guardadas");
    expect(container?.querySelector("[role=alert] button")?.textContent).toBe("Reintentar");
    expect(container?.querySelector("[data-testid=mentor-proposal]")).toBeNull();
  });

  it("restores the proposal on Review and preserves it when returning to Mentor", async () => {
    window.history.replaceState({}, "", "/student/review?proposalId=linked-proposal");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-proposal", version: 1, proposal: { title: "Navegación accesible" } },
    ] });

    await act(async () => root?.render(<App />));

    expect(container?.querySelector("[data-testid=review-initial-proposal]")?.textContent).toBe("linked-proposal");
    const back = [...(container?.querySelectorAll<HTMLButtonElement>("button") ?? [])].find((button) => button.textContent === "Volver desde Review");
    await act(async () => back?.click());

    expect(window.location.pathname).toBe("/student/mentor");
    expect(new URLSearchParams(window.location.search).get("proposalId")).toBe("linked-proposal");
    expect(container?.querySelector("[data-testid=mentor-proposal]")?.textContent).toBe("linked-proposal:Navegación accesible");
  });

  it("shows the linked mission context in Mis proyectos and continues with the same version and required skills", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "linked-project", version: 3, proposal: { title: "Navegación accesible" }, assignmentVersionId: "mission-v1", updatedAt: "2026-11-23T00:00:00.000Z",
        assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: [{ id: "required-navigation", name: "Navegación" }], mentorContext: { version: 7, config: { theme: "Navegación para la aplicación", rubricTitle: "No mostrar rúbrica", criteria: [{ id: "private", title: "Criterio privado", weight: 100 }] } } } },
    ] });

    await act(async () => root?.render(<App />));

    const missionDisclosure = container?.querySelector<HTMLDetailsElement>(".student-project-list__mission");
    expect(missionDisclosure?.open).toBe(false);
    expect(missionDisclosure?.querySelector("summary")?.textContent).toContain("Misión vinculada");
    expect(missionDisclosure?.querySelector("summary")?.textContent).toContain("Navegación para la aplicación");
    expect(missionDisclosure?.querySelector("summary")?.textContent).toContain("Contexto Mentor v7");
    await act(async () => missionDisclosure?.querySelector("summary")?.click());
    expect(missionDisclosure?.open).toBe(true);
    expect(missionDisclosure?.textContent).toContain("Navegación");
    expect(container?.querySelector(".student-project-list")?.textContent).not.toContain("No mostrar rúbrica");
    expect(container?.querySelector(".student-project-list")?.textContent).not.toContain("Criterio privado");

    const continueProposal = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Navegación accesible"]');
    await act(async () => continueProposal?.click());

    expect(window.location.pathname).toBe("/student/mentor");
    expect(container?.querySelector("[data-testid=mentor-proposal-assignment-version]")?.textContent).toBe("mission-v1");
    expect(container?.querySelector("[data-testid=mentor-proposal-context-assignment-version]")?.textContent).toBe("mission-v1");
    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("7");
    expect(container?.querySelector("[data-testid=mentor-context-theme]")?.textContent).toBe("Navegación para la aplicación");
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("Navegación");
    expect(container?.querySelector("[data-testid=mentor-required-skill-ids]")?.textContent).toBe("required-navigation");
  });

  it("does not restore required skills from a context pinned to a different assignment version", async () => {
    window.history.replaceState({}, "", "/student/projects");
    mocks.studentApi.getMyProposals.mockResolvedValue({ ok: true, data: [
      { id: "stale-context-proposal", version: 2, proposal: { title: "Contexto desactualizado" }, assignmentVersionId: "mission-v1", updatedAt: "2026-11-22T00:00:00.000Z",
        assignmentContext: { assignmentVersionId: "mission-v2", requiredSkills: [{ id: "stale", name: "No debe mostrarse" }], mentorContext: { version: 8, config: { theme: "Tema obsoleto", rubricTitle: "Rúbrica obsoleta", requirements: [] } } } },
    ] });

    await act(async () => root?.render(<App />));
    expect(container?.querySelector(".student-project-list__mission summary")?.textContent).toBe("Misión vinculada · contexto no disponible");
    expect(container?.querySelector(".student-project-list__mission")?.textContent).not.toContain("No debe mostrarse");
    const continueProposal = container?.querySelector<HTMLButtonElement>('.student-project-list button[aria-label="Continuar propuesta: Contexto desactualizado"]');
    await act(async () => continueProposal?.click());

    expect(container?.querySelector("[data-testid=mentor-context]")?.textContent).toBe("error");
    expect(container?.querySelector("[data-testid=mentor-context-theme]")?.textContent).toBe("");
    expect(container?.querySelector("[data-testid=mentor-required-skills]")?.textContent).toBe("");
    expect(container?.querySelector("[data-testid=mentor-proposal-context-assignment-version]")?.textContent).toBe("");
    expect(container?.querySelector("[data-testid=mentor-proposal-context-theme]")?.textContent).toBe("");
    expect(container?.querySelector("[data-testid=mentor-proposal-context-rubric]")?.textContent).toBe("");
    expect(container?.querySelector("[data-testid=mentor-saved-proposal-contexts]")?.textContent).not.toContain("Tema obsoleto");
    expect(container?.querySelector("[data-testid=mentor-saved-proposal-contexts]")?.textContent).not.toContain("No debe mostrarse");
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
    expect(new URLSearchParams(window.location.search).get("proposalId")).toBe("proposal-one");
    expect(container?.querySelector("[data-testid=mentor-proposal]")?.textContent).toBe("proposal-one:Huerto escolar");
    expect(container?.querySelector("[data-testid=mentor-restore-evaluation]")?.textContent).toBe("true");
  });

  it("keeps the published context and version when the student starts and saves a proposal", async () => {
    await act(async () => root?.render(<App />));
    const start = container?.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta: Aplicación móvil"]');
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
    const startAgain = container?.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta: Aplicación móvil"]');
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
