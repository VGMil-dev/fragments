// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MissionDeliveryHistory, ProposalDraftResponse, StudentAssignment, StudentMe } from "@fragments/contracts";
import { StudentDashboard } from "./StudentDashboard";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let container: HTMLDivElement | undefined;
let root: Root | undefined;
afterEach(() => { if (root) act(() => root?.unmount()); container?.remove(); root = undefined; container = undefined; });

const student: StudentMe = { authenticated: true, id: "fixture-student", githubLogin: "fixture-student", avatarUrl: "https://avatars.example.test/student.png", profileUrl: "https://github.com/fixture-student", registeredAt: "2026-11-19T12:00:00.000Z" };
const proposal = { id: "fixture-proposal", version: 2, assignmentVersionId: "mission-1", proposal: { title: "Bitácora de jardín" }, updatedAt: "2026-11-19T12:00:00.000Z" } as ProposalDraftResponse;
const mission = (id: string, title = id) => ({ id, version: 1, mentorContextVersion: 2, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Aula de prueba", subject: "Ciencias", title, objectives: ["Construye una solución observable"], requiredSkills: [] }) as unknown as StudentAssignment;
const defaultProps = { student, classrooms: [], classroomRequests: [], classroomsLoading: false, classroomsError: null, onRetryClassrooms: vi.fn(), proposals: [], proposalsLoading: false, proposalsError: false, onRetryProposals: vi.fn(), missions: [], missionsLoading: false, missionsError: false, onRetryMissions: vi.fn(), submissions: { status: "empty" as const }, onRetrySubmissions: vi.fn(), onContinueProposal: vi.fn(), onStartMission: vi.fn(), onLoadDeliveryHistory: vi.fn(async () => ({ ok: false as const, error: { code: "TEMPORARY_UNAVAILABLE", message: "Unavailable" } })), onCreateProposal: vi.fn(), onNavigate: vi.fn() };

describe("StudentDashboard V4", () => {
  it("renders the real GitHub identity and the approved V4 sections without fictional data", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} missions={[mission("mission-1")]} />);

    expect(html).toContain("Mi espacio");
    expect(html).toContain("@fixture-student");
    expect(html).toContain('href="https://github.com/fixture-student"');
    expect(html).toContain("Continúa donde lo dejaste");
    expect(html).toContain("Mis misiones");
    expect(html).toContain("Todas");
    expect(html).toContain("En curso");
    expect(html).toContain("Por iniciar");
    expect(html).toContain("Completadas");
    expect(html).not.toContain("racha");
    expect(html).not.toContain("% completado");
    expect(html).not.toContain("Mi portafolio");
  });

  it("keeps the linked mission in the primary continuation area without duplicating it below", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} missions={[mission("mission-1"), mission("mission-2")] } />);
    expect(html).toContain("Bitácora de jardín");
    expect(html).toContain("mission-2");
    expect(html).not.toContain('data-mission-id="mission-1"');
  });

  it("derives real filter counts and begins with no more than three missions", () => {
    const missions = Array.from({ length: 5 }, (_, index) => mission(`mission-${index + 1}`));
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} missions={missions} />);
    expect(html).toContain('aria-label="Todas, 5 misiones"');
    expect(html).toContain('aria-label="Por iniciar, 5 misiones"');
    expect(html.match(/data-mission-id=/g)).toHaveLength(3);
    expect(html).toContain("Ver más");
  });

  it("filters missions and toggles the list between three and all items", async () => {
    const missions = Array.from({ length: 5 }, (_, index) => mission(`mission-${index + 1}`));
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StudentDashboard {...defaultProps} missions={missions} />));
    expect(container.querySelectorAll("[data-mission-id]")).toHaveLength(3);
    const allButton = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.startsWith("Todas"));
    expect(allButton?.getAttribute("aria-pressed")).toBe("true");
    const more = container.querySelector<HTMLButtonElement>(".mi-space__expand");
    expect(more?.textContent).toContain("Ver más");
    await act(async () => more?.click());
    expect(container.querySelectorAll("[data-mission-id]")).toHaveLength(5);
    const inProgress = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.startsWith("En curso"));
    await act(async () => inProgress?.click());
    expect(inProgress?.getAttribute("aria-pressed")).toBe("true");
    expect(container.querySelectorAll("[data-mission-id]")).toHaveLength(0);
  });

  it("uses the existing academic delivery history to show Trainer only after every delivery is complete", async () => {
    const completedHistory: MissionDeliveryHistory = {
      proposalId: proposal.id, assignmentVersionId: "mission-1", nextDeliverableId: null,
      deliveries: [{ deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: [], dueDate: null, criterionIds: [] }, status: "completed", attempts: [{ reviewId: "review-final", commitSha: "a".repeat(40), status: "completed", createdAt: "2026-11-25T10:00:00.000Z", updatedAt: "2026-11-25T10:00:00.000Z" }] }],
    };
    const onLoadDeliveryHistory = vi.fn(async () => ({ ok: true as const, data: completedHistory }));
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StudentDashboard {...defaultProps} proposals={[proposal]} missions={[mission("mission-1"), mission("mission-2")]} submissions={{ status: "success", data: [{ id: "mentor-result", kind: "mentor", sourceId: proposal.id, label: "Bitácora", score: 80, rubricVersion: "fixture-v1", createdAt: "2026-11-24T10:00:00.000Z" }] }} onLoadDeliveryHistory={onLoadDeliveryHistory} />));
    expect(onLoadDeliveryHistory).toHaveBeenCalledExactlyOnceWith(proposal.id);
    expect(container.textContent).toContain("Trainer");
    expect(Array.from(container.querySelectorAll(".mi-space__mission .mi-space__phase")).map((node) => node.textContent)).not.toContain("Completada");
  });

  it("distinguishes queued, processing, and failed Review deliveries from the real history", async () => {
    const baseHistory: MissionDeliveryHistory = {
      proposalId: proposal.id, assignmentVersionId: "mission-1", nextDeliverableId: "delivery-1",
      deliveries: [{ deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal", requirements: [], dueDate: null, criterionIds: [] }, status: "queued", attempts: [] }],
    };
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    const props = { ...defaultProps, proposals: [proposal], missions: [mission("mission-1")], submissions: { status: "success" as const, data: [{ id: "mentor-result", kind: "mentor" as const, sourceId: proposal.id, label: "Bitácora", score: 80, rubricVersion: "fixture-v1", createdAt: "2026-11-24T10:00:00.000Z" }] } };
    const renderHistory = async (history: MissionDeliveryHistory) => act(async () => {
      root?.unmount();
      root = createRoot(container!);
      root.render(<StudentDashboard {...props} onLoadDeliveryHistory={async () => ({ ok: true as const, data: history })} />);
    });
    await renderHistory(baseHistory);
    expect(container.querySelector(".mi-space__continue-copy .mi-space__phase")?.textContent).toBe("Review · análisis en cola");

    const runningHistory = { ...baseHistory, deliveries: [{ ...baseHistory.deliveries[0]!, status: "running" as const }] };
    await renderHistory(runningHistory);
    expect(container.querySelector(".mi-space__continue-copy .mi-space__phase")?.textContent).toBe("Review · análisis en curso");

    const failedHistory = { ...baseHistory, deliveries: [{ ...baseHistory.deliveries[0]!, status: "failed" as const }] };
    await renderHistory(failedHistory);
    expect(container.querySelector(".mi-space__continue-copy .mi-space__phase")?.textContent).toBe("Review · requiere un nuevo intento");
  });

  it("routes available missions through their existing Mentor action and keeps retry states", async () => {
    const onStartMission = vi.fn();
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StudentDashboard {...defaultProps} missions={[mission("mission-2", "Accesibilidad móvil")]} onStartMission={onStartMission} />));
    const start = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Iniciar misión en Mentor"));
    await act(async () => start?.click());
    expect(onStartMission).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ id: "mission-2" }));
    const errorHtml = renderToStaticMarkup(<StudentDashboard {...defaultProps} missionsError missionsLoading={false} />);
    expect(errorHtml).toContain("No pudimos consultar tus misiones");
    expect(errorHtml).toContain("Reintentar");
  });

  it("continues the most recently updated proposal and keeps its exact mission context", () => {
    const older = { ...proposal, id: "older-proposal", assignmentVersionId: "mission-2", proposal: { title: "Borrador anterior" }, updatedAt: "2026-11-18T12:00:00.000Z" };
    const current = { ...proposal, proposal: { title: "Propuesta más reciente" }, assignmentContext: { assignmentVersionId: "mission-1", requiredSkills: [{ id: "skill-1", name: "Observación" }], mentorContext: { version: 3 } } } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[older, current]} missions={[mission("mission-1", "Diario de plantas")]} />);
    expect(html).toContain("Propuesta más reciente");
    expect(html).not.toContain("Borrador anterior");
    expect(html).toContain("Diario de plantas · v1");
    expect(html).toContain("Observación");
    expect(html).toContain("Contexto Mentor");
  });

  it("does not show a stale snapshot context whose assignment version conflicts", () => {
    const staleProposal = { ...proposal, assignmentContext: { assignmentVersionId: "old-mission", requiredSkills: [{ id: "skill-1", name: "Habilidad obsoleta" }], mentorContext: { version: 2 } } } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[staleProposal]} missions={[mission("mission-1", "Misión actual")]} />);
    expect(html).toContain("Misión actual");
    expect(html).not.toContain("Habilidad obsoleta");
    expect(html).not.toContain("Contexto Mentor");
  });

  it("offers Mis aulas when the student must choose among multiple published missions", async () => {
    const onNavigate = vi.fn();
    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    await act(async () => root?.render(<StudentDashboard {...defaultProps} missions={[mission("mission-a"), mission("mission-b")]} onNavigate={onNavigate} />));
    const choose = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Elegir en Mis aulas"));
    expect(choose).toBeTruthy();
    await act(async () => choose?.click());
    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("/student/classrooms");
  });

  it("preserves an actual latest submission summary and retries when its query failed", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} submissions={{ status: "success", data: [{ id: "submission-1", kind: "review", sourceId: "review-1", label: "Navegación entre pantallas", score: 84, rubricVersion: "fixture-v1", createdAt: "2026-11-25T12:00:00.000Z" }] }} />);
    expect(html).toContain("Último resultado:");
    expect(html).toContain("Navegación entre pantallas");
    expect(html).toContain("Review");

    container = document.createElement("div"); document.body.append(container); root = createRoot(container);
    const onRetrySubmissions = vi.fn();
    act(() => root?.render(<StudentDashboard {...defaultProps} submissions={{ status: "error", retry: onRetrySubmissions }} onRetrySubmissions={onRetrySubmissions} />));
    const retry = Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Reintentar"));
    expect(retry).toBeTruthy();
    act(() => retry?.click());
    expect(onRetrySubmissions).toHaveBeenCalledOnce();
  });
});
