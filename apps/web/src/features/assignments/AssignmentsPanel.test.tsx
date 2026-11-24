// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClassroomAssignment, ProposalDraftResponse, SkillCatalogEntry, StudentAssignment } from "@fragments/contracts";
import { AssignmentsPanel, StudentAssignmentsList } from "./AssignmentsPanel.js";

const skill: SkillCatalogEntry = { id: "fixture-skill", name: "Observación", description: null, archived: false, createdAt: "2026-11-22T00:00:00.000Z", updatedAt: "2026-11-22T00:00:00.000Z" };
const assignment = {
  id: "fixture-assignment", classroomId: "fixture-class", status: "published", draftVersion: 2, publishedVersion: 1,
  draft: { title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: ["Registrar hallazgos"], requiredSkillIds: [skill.id], optionalSkillIds: [],
    missionRubric: { title: "Rúbrica propia", criteria: [{ id: "criterion-observation", title: "Observación verificable", description: "Registra evidencia comprobable.", weight: 100 }] },
    deliverables: [
      { id: "delivery-proposal", order: 1, title: "Propuesta", type: "proposal" as const, requirements: ["Describe la pregunta."], dueDate: null, criterionIds: ["criterion-observation"] },
      { id: "delivery-final", order: 2, title: "Informe final", type: "final" as const, requirements: ["Incluye evidencia."], dueDate: null, criterionIds: ["criterion-observation"] },
    ] },
  versions: [], updatedAt: "2026-11-22T00:00:00.000Z",
} as unknown as ClassroomAssignment;
const fakeProposal = (assignmentVersionId: string): ProposalDraftResponse => ({
  id: "fixture-proposal-own", version: 1, proposal: { title: "Propuesta QA propia" },
  assignmentVersionId, updatedAt: "2026-11-24T00:00:00.000Z",
} as unknown as ProposalDraftResponse);

describe("AssignmentsPanel", () => {
  it("shows draft editing and publication actions with skill categories", () => {
    const html = renderToStaticMarkup(<AssignmentsPanel assignments={[assignment]} skills={[skill]} onCreate={vi.fn()} onUpdate={vi.fn()} onPublish={vi.fn()} />);
    expect(html).toContain("Crear misión");
    expect(html).toContain("Explora tu entorno");
    expect(html).toContain("Editar borrador");
    expect(html).toContain("Publicar");
    expect(html).toContain("Hay cambios sin publicar");
  });

  it("shows the immutable published skill and Mentor context snapshots", () => {
    const published = {
      ...assignment,
      draftVersion: 3,
      publishedVersion: 1,
      versions: [{
        id: "fixture-assignment-version-1", assignmentId: assignment.id, version: 1, status: "published" as const,
        title: "Misión publicada v1", instructions: "Consigna guardada en v1.", objectives: ["Objetivo fijado"],
        requiredSkills: [{ id: skill.id, name: "Habilidad requerida v1", description: "Snapshot requerido." }],
        optionalSkills: [{ id: "fixture-skill-optional", name: "Habilidad optativa v1", description: "Snapshot optativo." }],
        mentorContextVersion: 4, createdAt: "2026-11-22T00:00:00.000Z",
      }, {
        id: "fixture-assignment-version-2", assignmentId: assignment.id, version: 2, status: "published" as const,
        title: "Misión publicada v2", instructions: "Consigna guardada en v2.", objectives: ["Segundo objetivo"],
        requiredSkills: [{ id: skill.id, name: "Habilidad requerida v2", description: null }],
        optionalSkills: [], mentorContextVersion: 5, createdAt: "2026-11-23T00:00:00.000Z",
      }],
    } as unknown as ClassroomAssignment;

    const html = renderToStaticMarkup(<AssignmentsPanel assignments={[published]} skills={[skill]} onCreate={vi.fn()} onUpdate={vi.fn()} onPublish={vi.fn()} />);

    expect(html).toContain("Revisar versiones publicadas");
    expect(html).toContain("Versión publicada 1 · Contexto Mentor v4");
    expect(html).toContain("Misión publicada v1");
    expect(html).toContain("Consigna guardada en v1.");
    expect(html).toContain("Habilidad requerida v1");
    expect(html).toContain("Habilidad optativa v1");
    expect(html).toContain("Versión publicada 2 · Contexto Mentor v5");
    expect(html).toContain("Consigna guardada en v2.");
    expect(html).not.toMatch(/<details[^>]*open/);
  });

  it("lets the teacher preview the student-facing draft", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<AssignmentsPanel assignments={[]} skills={[skill]} onCreate={vi.fn()} onUpdate={vi.fn()} onPublish={vi.fn()} />));
      const createButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Crear misión");
      expect(createButton).toBeTruthy();
      await act(async () => createButton?.click());
      const title = container.querySelector<HTMLInputElement>('input:not([type="checkbox"])');
      const instruction = container.querySelector("textarea");
      expect(title).toBeTruthy();
      expect(instruction).toBeTruthy();
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(title, "Explora el patio");
        title!.dispatchEvent(new Event("input", { bubbles: true }));
        Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(instruction, "Registra tres observaciones.");
        instruction!.dispatchEvent(new Event("input", { bubbles: true }));
      });
      const previewButton = [...container.querySelectorAll("button")].find((button) => button.textContent === "Vista previa estudiantil");
      expect(previewButton).toBeTruthy();
      await act(async () => previewButton?.click());
      expect(container.textContent).toContain("VISTA DEL ESTUDIANTE");
      expect(container.textContent).toContain("Explora el patio");
      expect(container.textContent).toContain("Registra tres observaciones.");
      expect(container.textContent).toContain("Observación");
      expect(container.querySelector('[aria-expanded="true"]')).toBeTruthy();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("shows the applicable criteria for each deliverable in the teacher preview", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(<AssignmentsPanel assignments={[assignment]} skills={[skill]} onCreate={vi.fn()} onUpdate={vi.fn()} onPublish={vi.fn()} />));
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Editar borrador")?.click());
      await act(async () => [...container.querySelectorAll("button")].find((button) => button.textContent === "Vista previa estudiantil")?.click());
      expect(container.textContent).toContain("Informe final");
      expect(container.textContent).toContain("Criterios: Observación verificable");
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it("shows the mission action and passes its exact published snapshot to the callback", async () => {
    const studentAssignment = {
      id: "fixture-version", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias",
      title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: ["Registrar hallazgos"],
      requiredSkills: [{ id: skill.id, name: skill.name, description: "Registra hallazgos verificables en el entorno." }],
      optionalSkills: [{ id: "fixture-optional-skill", name: "Accesibilidad", description: "Comprueba el contenido con lector de pantalla." }], status: "published",
      missionRubric: { title: "Rúbrica de exploración", criteria: [{ id: "criterion-observation", title: "Observaciones", description: "Registra evidencias del entorno.", weight: 100 }] },
      deliverables: [
        { id: "deliverable-proposal", order: 1, title: "Propuesta", type: "proposal", requirements: ["Describe una pregunta."], dueDate: null, criterionIds: ["criterion-observation"] },
        { id: "deliverable-final", order: 2, title: "Informe final", type: "final", requirements: ["Incluye tres observaciones."], dueDate: "2026-12-15", criterionIds: ["criterion-observation"] },
      ],
      mentorContextVersion: 3, mentorContext: { version: 3, publishedAt: "2026-11-22T00:00:00.000Z", config: {
        subject: "Ciencias", theme: "Explora tu entorno", assignment: "Describe lo que observas.", requirements: ["Registrar hallazgos"], expectedLevel: "Bachillerato",
        rubricTitle: "Rúbrica de prueba", criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cita observaciones verificables.", weight: 100 }],
      } }, createdAt: "2026-11-22T00:00:00.000Z",
    } as unknown as StudentAssignment;
    const onStartProposal = vi.fn();
    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[]} proposalsLoading={false} proposalsError={false} onStartProposal={onStartProposal} />);
    expect(html).toContain("Misiones del aula");
    expect(html).toContain("Habilidades requeridas");
    expect(html).toContain("Observación");
    expect(html).toContain("Registra hallazgos verificables en el entorno.");
    expect(html).toContain("Habilidades optativas");
    expect(html).toContain("Accesibilidad");
    expect(html).toContain("Comprueba el contenido con lector de pantalla.");
    expect(html).toContain("Iniciar propuesta");
    expect(html).toContain("Contexto para tu propuesta · versión 3");
    expect(html).toContain("Misión publicada v1 · Contexto Mentor v3");
    expect(html).toContain("Bachillerato");
    expect(html).toContain("Explora tu entorno");
    expect(html).toContain("Registrar hallazgos");
    expect(html).toContain("Rúbrica de exploración");
    expect(html).toContain("Observaciones");
    expect(html).toContain("Registra evidencias del entorno.");
    expect(html).toContain("Entregas del proyecto");
    expect(html).toContain("Informe final");
    expect(html).toContain("Incluye tres observaciones.");
    expect(html).not.toContain("Cita observaciones verificables.");

    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[]} proposalsLoading={false} proposalsError={false} onStartProposal={onStartProposal} />));
      const context = container.querySelector<HTMLDetailsElement>(".student-assignments__context");
      const contextSummary = context?.querySelector("summary");
      expect(context?.open).toBe(false);
      expect(container.querySelector(".student-assignments__mission-version")?.textContent).toBe("Misión publicada v1 · Contexto Mentor v3");
      await act(async () => contextSummary?.click());
      expect(context?.open).toBe(true);
      const button = container.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta: Explora tu entorno"]');
      expect(button).toBeTruthy();
      await act(async () => button?.click());
      expect(onStartProposal).toHaveBeenCalledExactlyOnceWith(studentAssignment);
      expect(onStartProposal.mock.calls[0]?.[0]).toMatchObject({
        id: "fixture-version",
        assignmentId: "fixture-assignment",
        version: 1,
        requiredSkills: [{ id: "fixture-skill", name: "Observación", description: "Registra hallazgos verificables en el entorno." }],
        optionalSkills: [{ id: "fixture-optional-skill", name: "Accesibilidad", description: "Comprueba el contenido con lector de pantalla." }],
        mentorContextVersion: 3,
      });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("opens only the proposal whose assignmentVersionId exactly matches the mission id", async () => {
    const studentAssignment = { id: "fixture-version-match", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias", title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: [], requiredSkills: [], optionalSkills: [], status: "published", mentorContextVersion: 3, mentorContext: { version: 3, publishedAt: "2026-11-22T00:00:00.000Z", config: { subject: "Ciencias", theme: "Explora", assignment: "Describe.", requirements: [], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica fake", criteria: [] } }, createdAt: "2026-11-22T00:00:00.000Z" } as unknown as StudentAssignment;
    const linked = fakeProposal(studentAssignment.id);
    const onContinueProposal = vi.fn();
    const onStartProposal = vi.fn();
    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[linked]} proposalsLoading={false} proposalsError={false} onContinueProposal={onContinueProposal} onStartProposal={onStartProposal} />);

    expect(html).toContain("Abrir propuesta vinculada");
    expect(html).not.toContain("Iniciar propuesta");
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[linked]} proposalsLoading={false} proposalsError={false} onContinueProposal={onContinueProposal} onStartProposal={onStartProposal} />));
      const action = container.querySelector<HTMLButtonElement>('button[aria-label="Abrir propuesta vinculada: Explora tu entorno"]');
      await act(async () => action?.click());
      expect(onContinueProposal).toHaveBeenCalledExactlyOnceWith(linked);
      expect(onStartProposal).not.toHaveBeenCalled();
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it("continues the most recently updated proposal when several match the same mission version", () => {
    const studentAssignment = { id: "fixture-version-match", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias", title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: [], requiredSkills: [], optionalSkills: [], status: "published", mentorContextVersion: 3, mentorContext: { version: 3, publishedAt: "2026-11-22T00:00:00.000Z", config: { subject: "Ciencias", theme: "Explora", assignment: "Describe.", requirements: [], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica fake", criteria: [] } }, createdAt: "2026-11-22T00:00:00.000Z" } as unknown as StudentAssignment;
    const older = { ...fakeProposal(studentAssignment.id), id: "fixture-proposal-older", updatedAt: "2026-11-20T00:00:00.000Z" };
    const newer = { ...fakeProposal(studentAssignment.id), id: "fixture-proposal-newer", updatedAt: "2026-11-23T00:00:00.000Z" };
    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[older, newer]} proposalsLoading={false} proposalsError={false} onContinueProposal={vi.fn()} />);
    expect(html).toContain("Abrir propuesta vinculada");
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container); const onContinueProposal = vi.fn();
    try {
      act(() => root.render(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[older, newer]} proposalsLoading={false} proposalsError={false} onContinueProposal={onContinueProposal} />));
      const action = container.querySelector<HTMLButtonElement>('button[aria-label="Abrir propuesta vinculada: Explora tu entorno"]');
      act(() => action?.click());
      expect(onContinueProposal).toHaveBeenCalledExactlyOnceWith(newer);
    } finally { act(() => root.unmount()); container.remove(); }
  });

  it("does not use nested context ids or different mission versions as a proposal match", () => {
    const studentAssignment = { id: "fixture-version-match", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias", title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: [], requiredSkills: [], optionalSkills: [], status: "published", mentorContextVersion: 3, mentorContext: { version: 3, publishedAt: "2026-11-22T00:00:00.000Z", config: { subject: "Ciencias", theme: "Explora", assignment: "Describe.", requirements: [], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica fake", criteria: [] } }, createdAt: "2026-11-22T00:00:00.000Z" } as unknown as StudentAssignment;
    const stale = { ...fakeProposal("fixture-version-old"), assignmentContext: { assignmentVersionId: studentAssignment.id } } as ProposalDraftResponse;
    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[stale]} proposalsLoading={false} proposalsError={false} />);
    expect(html).toContain("Iniciar propuesta");
    expect(html).not.toContain("Abrir propuesta vinculada");
  });

  it("blocks starting while proposals are loading or unavailable and offers retry on error", async () => {
    const studentAssignment = { id: "fixture-version-match", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias", title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: [], requiredSkills: [], optionalSkills: [], status: "published", mentorContextVersion: 3, mentorContext: { version: 3, publishedAt: "2026-11-22T00:00:00.000Z", config: { subject: "Ciencias", theme: "Explora", assignment: "Describe.", requirements: [], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica fake", criteria: [] } }, createdAt: "2026-11-22T00:00:00.000Z" } as unknown as StudentAssignment;
    const onStartProposal = vi.fn();
    const loading = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[]} proposalsLoading proposalsError={false} onStartProposal={onStartProposal} />);
    expect(loading).toContain("Espera mientras consultamos tus propuestas antes de iniciar.");
    expect(loading).not.toContain("Iniciar propuesta");

    const onRetryProposals = vi.fn();
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div"); document.body.append(container); const root = createRoot(container);
    try {
      await act(async () => root.render(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[]} proposalsLoading={false} proposalsError onRetryProposals={onRetryProposals} onStartProposal={onStartProposal} />));
      expect(container.textContent).toContain("No pudimos consultar tus propuestas. Para evitar duplicados, vuelve a intentarlo antes de iniciar.");
      expect(container.textContent).not.toContain("Iniciar propuesta");
      await act(async () => container.querySelector<HTMLButtonElement>("button")?.click());
      expect(onRetryProposals).toHaveBeenCalledOnce();
      expect(onStartProposal).not.toHaveBeenCalled();
    } finally { await act(async () => root.unmount()); container.remove(); }
  });

  it("keeps skill names visible and puts only existing descriptions behind individual disclosures", async () => {
    const longDescription = "D".repeat(1000);
    const studentAssignment = {
      id: "fixture-version-long-skills", assignmentId: "fixture-assignment", version: 2, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias",
      title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: ["Registrar hallazgos"],
      requiredSkills: [
        { id: "fixture-long", name: "Arquitectura", description: longDescription },
        { id: "fixture-empty-description", name: "Lectura", description: null },
      ], optionalSkills: [], status: "published",
      mentorContextVersion: 4, mentorContext: { version: 4, publishedAt: "2026-11-23T00:00:00.000Z", config: {
        subject: "Ciencias", theme: "Explora tu entorno", assignment: "Describe lo que observas.", requirements: ["Registrar hallazgos"], expectedLevel: "Bachillerato",
        rubricTitle: "Rúbrica de prueba", criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cita observaciones verificables.", weight: 100 }],
      } }, createdAt: "2026-11-23T00:00:00.000Z",
    } as unknown as StudentAssignment;

    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[]} proposalsLoading={false} proposalsError={false} />);
    expect(html).toContain("Arquitectura");
    expect(html).toContain("Lectura");
    expect(html).toContain(longDescription);
    expect(html).toContain('aria-label="Ver descripción de Arquitectura"');
    expect(html).not.toContain('aria-label="Ver descripción de Lectura"');
    expect(html).not.toContain("Habilidades optativas");
    expect(html).not.toMatch(/<details[^>]*open/);

    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<StudentAssignmentsList assignments={[studentAssignment]} proposals={[]} proposalsLoading={false} proposalsError={false} />));
      const details = container.querySelector<HTMLDetailsElement>(".student-assignments__skill-description");
      const summary = details?.querySelector("summary");
      expect(details?.open).toBe(false);
      expect(container.querySelector(".student-assignments__skill-group li > strong")?.textContent).toBe("Arquitectura");
      expect(summary?.tabIndex).toBe(0);
      summary?.focus();
      expect(document.activeElement).toBe(summary);
      await act(async () => summary?.click());
      expect(details?.open).toBe(true);
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
