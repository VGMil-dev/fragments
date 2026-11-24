// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ProposalDraftResponse, StudentAssignment, StudentMe } from "@fragments/contracts";
import { StudentDashboard } from "./StudentDashboard";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
let interactionContainer: HTMLDivElement | undefined;
let interactionRoot: Root | undefined;
afterEach(() => { if (interactionRoot) act(() => interactionRoot?.unmount()); interactionContainer?.remove(); interactionRoot = undefined; interactionContainer = undefined; });

const student: StudentMe = { authenticated: true, id: "fixture-student", githubLogin: "fixture-student", avatarUrl: null, profileUrl: "https://github.com/fixture-student", registeredAt: "2026-11-19T12:00:00.000Z" };
const proposal = { id: "fixture-proposal", version: 2, proposal: { title: "Bitácora de jardín" }, updatedAt: "2026-11-19T12:00:00.000Z" };
const defaultProps = { student, classrooms: [], classroomRequests: [], classroomsLoading: false, classroomsError: null, onRetryClassrooms: vi.fn(), proposals: [], proposalsLoading: false, proposalsError: false, onRetryProposals: vi.fn(), missions: [], missionsLoading: false, missionsError: false, onRetryMissions: vi.fn(), submissions: { status: "empty" as const }, onRetrySubmissions: vi.fn(), onContinueProposal: vi.fn(), onStartMission: vi.fn(), onCreateProposal: vi.fn(), onNavigate: vi.fn() };

describe("StudentDashboard", () => {
  it("uses the student's saved proposal and renders truthful classroom and empty states", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} />);

    expect(html).toContain("@fixture-student");
    expect(html).toContain('href="https://github.com/fixture-student"');
    expect(html).toContain('target="_blank" rel="noreferrer"');
    expect(html).toContain("CENTRO DE MISIONES");
    expect(html).toContain("Siguiente paso");
    expect(html).toContain("Bitácora de jardín");
    expect(html).toContain("Siguiente paso · propuesta v2");
    expect(html).toContain('aria-label="Abrir propuesta en Mentor: Bitácora de jardín"');
    expect(html).toContain("student-dashboard--has-proposal");
    expect(html).toContain("Aún no tienes aulas activas");
    expect(html).toContain("Aún no tienes entregas generadas");
    expect(html).toContain("Explorar Galería");
    expect(html).not.toContain("Programación Móvil");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
    expect(html).not.toContain("% completado");
    expect(html).not.toContain("racha");
  });

  it("continues the most recently updated proposal even when the API list is out of order", () => {
    const olderProposal = { ...proposal, id: "older-proposal", version: 1, proposal: { title: "Borrador anterior" }, updatedAt: "2026-11-18T12:00:00.000Z" };
    const newestProposal = { ...proposal, id: "newest-proposal", version: 3, proposal: { title: "Propuesta más reciente" }, updatedAt: "2026-11-20T12:00:00.000Z" };
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[olderProposal, newestProposal]} />);

    expect(html).toContain("Propuesta más reciente");
    expect(html).toContain("Siguiente paso · propuesta v3");
    expect(html).not.toContain("Borrador anterior");
  });

  it("shows the exact linked mission and its saved classroom context with the primary proposal", () => {
    const assignmentVersionId = "mission-v1";
    const mission = { id: assignmentVersionId, version: 1, mentorContextVersion: 2, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", subject: "Aplicaciones móviles", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [{ id: "skill-navigation", name: "React Native", description: null }] } as StudentAssignment;
    const linkedProposal = { ...proposal, assignmentVersionId, assignmentContext: { assignmentVersionId, requiredSkills: [{ id: "skill-navigation", name: "React Native" }], mentorContext: { version: 2 } } } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} missions={[mission]} />);

    expect(html).toContain('aria-label="Contexto académico de la propuesta"');
    expect(html).toContain("Programación Móvil");
    expect(html).toContain("Navegación con Expo");
    expect(html).toContain("Navegación con Expo · v1");
    expect(html).toContain(">Contexto Mentor</dt><dd>v2</dd>");
    expect(html).toContain("React Native");
    expect(html).toContain("Abrir en Mentor");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });

  it("uses the proposal's matching snapshot when the mission list has no matching item", () => {
    const linkedProposal = { ...proposal, assignmentVersionId: "mission-v1", assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: [{ id: "skill-navigation", name: "React Native" }], mentorContext: { version: 2 } } } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} />);

    expect(html).toContain(">Contexto Mentor</dt><dd>v2</dd>");
    expect(html).toContain("React Native");
    expect(html).toContain("Aula y misión no disponibles en esta consulta.");
    expect(html).not.toContain("Programación Móvil");
    expect(html).not.toContain("Navegación con Expo");
  });

  it("does not attach saved context when its mission version conflicts with the proposal link", () => {
    const linkedProposal = { ...proposal, assignmentVersionId: "mission-v2", assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: [{ id: "skill-navigation", name: "React Native" }], mentorContext: { version: 2 } } } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} />);

    expect(html).toContain('aria-label="Contexto académico de la propuesta"');
    expect(html).not.toContain("React Native");
    expect(html).not.toContain(">Contexto Mentor</dt><dd>v2</dd>");
  });

  it("does not show a stale mission title while the mission query is loading", () => {
    const mission = { id: "mission-v1", version: 1, mentorContextVersion: 2, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Aula anterior", subject: "Aplicaciones móviles", title: "Misión anterior", objectives: [], requiredSkills: [] } as unknown as StudentAssignment;
    const linkedProposal = { ...proposal, assignmentVersionId: mission.id } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} missions={[mission]} missionsLoading />);

    expect(html).toContain("Consultando datos de aula…");
    expect(html).not.toContain("Aula anterior");
    expect(html).not.toContain("Misión anterior");
  });

  it("offers a secondary retry when the linked mission cannot be loaded", () => {
    const linkedProposal = { ...proposal, assignmentVersionId: "mission-v1", assignmentContext: { assignmentVersionId: "mission-v1", requiredSkills: [], mentorContext: { version: 2 } } } as unknown as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} missionsError onRetryMissions={() => {}} />);

    expect(html).toContain("No pudimos consultar el aula y el título de la misión.");
    expect(html).toContain("Reintentar consulta de aula");
    expect(html).toContain("Abrir en Mentor");
  });

  it("surfaces the published classroom mission as the next step when no proposal exists", () => {
    const mission = { id: "mission-v4", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [{ id: "skill-navigation", name: "Navegación móvil", description: null }] } as StudentAssignment;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} missions={[mission]} />);

    expect(html).toContain("Misión publicada · Programación Móvil");
    expect(html).toContain("student-dashboard--single-mission");
    expect(html).toContain("Misión publicada v4");
    expect(html).toContain("Contexto Mentor v7");
    expect(html).toContain("Habilidades obligatorias");
    expect(html).toContain("Navegación móvil");
    expect(html).toContain("Navegación con Expo");
    expect(html).toContain("Implementa una navegación observable");
    expect(html).toContain("Iniciar misión en Mentor");
    expect(html).not.toContain("Crear mi primer proyecto");
  });

  it("uses one action when the mission-linked proposal is already the primary proposal", async () => {
    const mission = { id: "mission-v4", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [] } as unknown as StudentAssignment;
    const linkedProposal = { ...proposal, assignmentVersionId: mission.id } as unknown as ProposalDraftResponse;
    const onContinueProposal = vi.fn();
    const onStartMission = vi.fn();
    interactionContainer = document.createElement("div"); document.body.append(interactionContainer); interactionRoot = createRoot(interactionContainer);
    await act(async () => { interactionRoot?.render(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} missions={[mission]} onContinueProposal={onContinueProposal} onStartMission={onStartMission} />); });

    const missionAction = interactionContainer.querySelector<HTMLButtonElement>(".student-dashboard__mission-action");
    const primaryAction = interactionContainer.querySelector<HTMLButtonElement>(".student-dashboard__project-action button");
    const missionNote = interactionContainer.querySelector<HTMLElement>(".student-dashboard__mission-linked-note");
    expect(missionAction).toBeNull();
    expect(missionNote?.textContent).toContain("Tu propuesta vinculada está en el siguiente paso destacado.");
    expect(primaryAction?.getAttribute("aria-label")).toBe("Abrir propuesta en Mentor: Bitácora de jardín");
    await act(async () => { primaryAction?.click(); });

    expect(onContinueProposal).toHaveBeenCalledExactlyOnceWith(linkedProposal);
    expect(onStartMission).not.toHaveBeenCalled();
  });

  it("keeps the mission action when its linked proposal is not the primary proposal", async () => {
    const mission = { id: "mission-v4", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [] } as unknown as StudentAssignment;
    const linkedProposal = { ...proposal, id: "linked-proposal", assignmentVersionId: mission.id } as unknown as ProposalDraftResponse;
    const latestProposal = { ...proposal, id: "latest-proposal", version: 3, proposal: { title: "Propuesta más reciente" }, updatedAt: "2026-11-20T12:00:00.000Z" } as unknown as ProposalDraftResponse;
    const onContinueProposal = vi.fn();
    interactionContainer = document.createElement("div"); document.body.append(interactionContainer); interactionRoot = createRoot(interactionContainer);
    await act(async () => { interactionRoot?.render(<StudentDashboard {...defaultProps} proposals={[linkedProposal, latestProposal]} missions={[mission]} onContinueProposal={onContinueProposal} />); });

    const missionAction = interactionContainer.querySelector<HTMLButtonElement>(".student-dashboard__mission-action");
    expect(missionAction?.getAttribute("aria-label")).toBe("Abrir propuesta vinculada a misión: Navegación con Expo");
    await act(async () => { missionAction?.click(); });

    expect(onContinueProposal).toHaveBeenCalledExactlyOnceWith(linkedProposal);
  });

  it("does not treat assignmentContext as a version match without the top-level assignmentVersionId", async () => {
    const mission = { id: "mission-v4", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [] } as unknown as StudentAssignment;
    const linkedProposal = { ...proposal, assignmentContext: { assignmentVersionId: mission.id } } as unknown as ProposalDraftResponse;
    const onContinueProposal = vi.fn();
    const onStartMission = vi.fn();
    interactionContainer = document.createElement("div"); document.body.append(interactionContainer); interactionRoot = createRoot(interactionContainer);
    await act(async () => { interactionRoot?.render(<StudentDashboard {...defaultProps} proposals={[linkedProposal]} missions={[mission]} onContinueProposal={onContinueProposal} onStartMission={onStartMission} />); });

    const missionAction = interactionContainer.querySelector<HTMLButtonElement>(".student-dashboard__mission-action");
    expect(missionAction?.textContent).toContain("Iniciar en Mentor");
    expect(missionAction?.getAttribute("aria-label")).toBe("Iniciar misión: Navegación con Expo");
    await act(async () => { missionAction?.click(); });

    expect(onStartMission).toHaveBeenCalledExactlyOnceWith(mission);
    expect(onContinueProposal).not.toHaveBeenCalled();
  });

  it("starts the mission when no proposal matches its published version", async () => {
    const mission = { id: "mission-v4", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [] } as unknown as StudentAssignment;
    const unlinkedProposal = { ...proposal, assignmentVersionId: "mission-v3", assignmentContext: { assignmentVersionId: "mission-v3" } } as unknown as ProposalDraftResponse;
    const onContinueProposal = vi.fn();
    const onStartMission = vi.fn();
    interactionContainer = document.createElement("div"); document.body.append(interactionContainer); interactionRoot = createRoot(interactionContainer);
    await act(async () => { interactionRoot?.render(<StudentDashboard {...defaultProps} proposals={[unlinkedProposal]} missions={[mission]} onContinueProposal={onContinueProposal} onStartMission={onStartMission} />); });

    const missionAction = interactionContainer.querySelector<HTMLButtonElement>(".student-dashboard__mission-action");
    await act(async () => { missionAction?.click(); });

    expect(onStartMission).toHaveBeenCalledExactlyOnceWith(mission);
    expect(onContinueProposal).not.toHaveBeenCalled();
  });

  it("asks the student to choose when several missions are published", () => {
    const earlierMission = { id: "mission-earlier", version: 2, mentorContextVersion: 4, createdAt: "2026-11-20T12:00:00.000Z", classroomTitle: "Aula de diseño", subject: "Aplicaciones móviles", title: "Diseño de pantallas", objectives: ["Presenta una pantalla accesible"], requiredSkills: [{ id: "skill-a11y", name: "Accesibilidad", description: null }] } as StudentAssignment;
    const latestMission = { id: "mission-latest", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Aula de Expo", subject: "Aplicaciones móviles", title: "Navegación con Expo", objectives: ["Implementa navegación observable"], requiredSkills: [{ id: "skill-navigation", name: "Navegación móvil", description: null }] } as StudentAssignment;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} missions={[earlierMission, latestMission]} />);

    expect(html).toContain("Elige una misión para comenzar");
    expect(html).toContain("student-dashboard--mission-choice");
    expect(html).toContain("Hay varias misiones publicadas en tus aulas. Puedes elegir cuál explorar primero.");
    expect(html).not.toContain("Misión publicada · Aula de Expo");
    expect(html).toContain("Navegación con Expo");
    expect(html).toContain("Aplicaciones móviles");
    expect(html).toContain("Misiones en tus aulas");
    expect(html).toContain("Diseño de pantallas");
    expect(html).toContain("Presenta una pantalla accesible");
    expect(html).toContain("Habilidades obligatorias");
    expect(html).toMatch(/<ul[^>]*aria-label="Habilidades obligatorias"[^>]*>[\s\S]*?<li>Accesibilidad<\/li>[\s\S]*?<\/ul>/);
    expect(html).toContain("student-dashboard__mission-action--secondary");
    expect(html).toContain("Ir a Mis aulas");
    expect(html.indexOf('<section class="student-dashboard__missions"')).toBeLessThan(html.indexOf('<section class="student-dashboard__project"'));
    expect(html).not.toContain("0 XP");
    expect(html).not.toContain("0% de progreso");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });

  it("navigates to Mis aulas from the primary action when several missions are available", async () => {
    const earlierMission = { id: "mission-earlier", version: 2, mentorContextVersion: 4, createdAt: "2026-11-20T12:00:00.000Z", classroomTitle: "Aula de diseño", subject: "Aplicaciones móviles", title: "Diseño de pantallas", objectives: ["Presenta una pantalla accesible"], requiredSkills: [] } as unknown as StudentAssignment;
    const latestMission = { ...earlierMission, id: "mission-latest", createdAt: "2026-11-23T12:00:00.000Z", title: "Navegación con Expo" };
    const onNavigate = vi.fn();
    interactionContainer = document.createElement("div"); document.body.append(interactionContainer); interactionRoot = createRoot(interactionContainer);
    await act(async () => { interactionRoot?.render(<StudentDashboard {...defaultProps} missions={[earlierMission, latestMission]} onNavigate={onNavigate} />); });

    const primaryAction = Array.from(interactionContainer.querySelectorAll<HTMLButtonElement>(".student-dashboard__project-action button"))[0];
    await act(async () => { primaryAction?.click(); });

    expect(onNavigate).toHaveBeenCalledExactlyOnceWith("/student/classrooms");
  });

  it("keeps the latest proposal as the only primary action while published missions remain secondary", () => {
    const mission = { id: "mission-secondary", version: 1, mentorContextVersion: 2, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Aula de Expo", subject: "Aplicaciones móviles", title: "Primera navegación", objectives: ["Muestra el flujo de pantallas"], requiredSkills: [] } as unknown as StudentAssignment;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} missions={[mission]} />);

    expect(html).toContain("Bitácora de jardín");
    expect(html).toContain("student-dashboard--has-proposal");
    expect(html).toContain("Abrir en Mentor");
    expect(html).toContain("Primera navegación");
    expect(html).not.toContain("Misión publicada v1");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
    expect(html.indexOf('<section class="student-dashboard__project"')).toBeLessThan(html.indexOf('<section class="student-dashboard__missions"'));
  });

  it("does not imply this is the student's first project when no proposal or mission is available", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} />);

    expect(html).toContain("Aún no hay una misión activa en tus aulas");
    expect(html).toContain("Crear propuesta en Mentor");
    expect(html).not.toContain("Tu primer proyecto");
    expect(html).not.toContain("Crear mi primer proyecto");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });

  it("keeps a saved proposal primary while retaining published mission context", () => {
    const mission = { id: "mission-v1", version: 1, mentorContextVersion: 2, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [{ id: "skill-navigation", name: "Navegación móvil", description: null }] } as StudentAssignment;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} missions={[mission]} />);

    expect(html).toContain("Bitácora de jardín");
    expect(html).not.toContain("Misión publicada v1");
    expect(html).not.toContain("Versiones fijadas");
    expect(html).toContain("Misiones en tus aulas");
  });

  it("limits mission choices to three and links to the remaining missions", () => {
    const earlierMission = { id: "mission-earlier", version: 2, mentorContextVersion: 4, createdAt: "2026-11-20T12:00:00.000Z", classroomTitle: "Programación Móvil", subject: "Aplicaciones móviles", title: "Diseño de pantallas", objectives: ["Presenta una pantalla accesible"], requiredSkills: [{ id: "skill-a11y", name: "Accesibilidad", description: null }] } as StudentAssignment;
    const latestMission = { id: "mission-latest", version: 4, mentorContextVersion: 7, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", subject: "Aplicaciones móviles", title: "Navegación con Expo", objectives: ["Implementa una navegación observable"], requiredSkills: [{ id: "skill-navigation", name: "Navegación móvil", description: null }] } as StudentAssignment;
    const thirdMission = { ...earlierMission, id: "mission-third", title: "Prototipo", objectives: ["Valida el prototipo"] };
    const fourthMission = { ...latestMission, id: "mission-fourth", title: "Prueba final", objectives: ["Comprueba el flujo"] };
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} missions={[earlierMission, latestMission, thirdMission, fourthMission]} />);

    expect(html).toContain("Misiones en tus aulas");
    expect(html).toContain("Diseño de pantallas");
    expect(html).toContain("Navegación con Expo");
    expect(html).toContain("Prueba final");
    expect(html).not.toContain("Prototipo");
    expect(html.match(/student-dashboard__mission-card/g)).toHaveLength(3);
    expect(html).toContain("Ver todas tus misiones (1 más)");
  });

  it("keeps the most recent proposal primary while retaining missions as secondary options", () => {
    const mission = { id: "mission-secondary", version: 1, mentorContextVersion: 2, createdAt: "2026-11-23T12:00:00.000Z", classroomTitle: "Programación Móvil", subject: "Aplicaciones móviles", title: "Primera navegación", objectives: ["Muestra el flujo de pantallas"], requiredSkills: [{ id: "skill-navigation", name: "Navegación móvil", description: null }] } as StudentAssignment;
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} proposals={[proposal]} missions={[mission]} />);

    expect(html).toContain("Bitácora de jardín");
    expect(html).toContain("Abrir en Mentor");
    expect(html).toContain("Misiones en tus aulas");
    expect(html).toContain("Primera navegación");
    expect(html).not.toContain("Misión publicada v1");
    expect(html).not.toContain("Crear mi primer proyecto");
  });

  it("summarizes authorized classes and pending enrollment truthfully", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} classrooms={[{ id: "fixture-room", title: "Aula de prueba", subject: "Ciencias", groupLabel: "7A", period: null, status: "active", createdAt: "2026-11-19T12:00:00.000Z", updatedAt: "2026-11-19T12:00:00.000Z" }]} classroomRequests={[{ id: "fixture-request", status: "pending", source: "join_code", requestedAt: "2026-11-19T12:00:00.000Z", decidedAt: null }]} />);
    expect(html).toContain("Tienes 1 aula activa y solicitudes pendientes de aprobación");
    expect(html).toContain("Aula de prueba");
    expect(html).toContain("Ciencias · 7A");
  });

  it("offers one create action when no proposal exists and shows a real latest submission", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} submissions={{ status: "success", data: [{ id: "fixture-submission", kind: "mentor", sourceId: "fixture-proposal", label: "Bitácora evaluada", score: 72, rubricVersion: "fake-rubric-v1", createdAt: "2026-11-19T13:00:00.000Z" }] }} />);

    expect(html).toContain("Crear propuesta en Mentor");
    expect(html).toContain("Bitácora evaluada");
    expect(html).toContain("72/100");
    expect(html).toContain("no es aprobación docente");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
  });

  it("keeps the GitHub identity and one real first action when data is empty", () => {
    const html = renderToStaticMarkup(<StudentDashboard {...defaultProps} />);

    expect(html).toContain("@fixture-student");
    expect(html).toContain("Empieza con una idea propia");
    expect(html).toContain("Crear propuesta en Mentor");
    expect(html.match(/class="button button--primary"/g)).toHaveLength(1);
    expect(html).not.toContain("0 puntos");
    expect(html).not.toContain("0% de progreso");
  });
});
