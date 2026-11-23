// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ClassroomAssignment, SkillCatalogEntry, StudentAssignment } from "@fragments/contracts";
import { AssignmentsPanel, StudentAssignmentsList } from "./AssignmentsPanel.js";

const skill: SkillCatalogEntry = { id: "fixture-skill", name: "Observación", description: null, archived: false, createdAt: "2026-11-22T00:00:00.000Z", updatedAt: "2026-11-22T00:00:00.000Z" };
const assignment = {
  id: "fixture-assignment", classroomId: "fixture-class", status: "published", draftVersion: 2, publishedVersion: 1,
  draft: { title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: ["Registrar hallazgos"], requiredSkillIds: [skill.id], optionalSkillIds: [] },
  versions: [], updatedAt: "2026-11-22T00:00:00.000Z",
} as ClassroomAssignment;

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
    } as ClassroomAssignment;

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

  it("shows the mission action and passes its exact published snapshot to the callback", async () => {
    const studentAssignment = {
      id: "fixture-version", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias",
      title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: ["Registrar hallazgos"],
      requiredSkills: [{ id: skill.id, name: skill.name, description: "Registra hallazgos verificables en el entorno." }],
      optionalSkills: [{ id: "fixture-optional-skill", name: "Accesibilidad", description: "Comprueba el contenido con lector de pantalla." }], status: "published",
      mentorContextVersion: 3, mentorContext: { version: 3, publishedAt: "2026-11-22T00:00:00.000Z", config: {
        subject: "Ciencias", theme: "Explora tu entorno", assignment: "Describe lo que observas.", requirements: ["Registrar hallazgos"], expectedLevel: "Bachillerato",
        rubricTitle: "Rúbrica de prueba", criteria: [{ id: "criterion-1", title: "Evidencia", description: "Cita observaciones verificables.", weight: 100 }],
      } }, createdAt: "2026-11-22T00:00:00.000Z",
    } as StudentAssignment;
    const onStartProposal = vi.fn();
    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} onStartProposal={onStartProposal} />);
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
    expect(html).not.toContain("Cita observaciones verificables.");

    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    try {
      await act(async () => root.render(<StudentAssignmentsList assignments={[studentAssignment]} onStartProposal={onStartProposal} />));
      const context = container.querySelector<HTMLDetailsElement>(".student-assignments__context");
      const contextSummary = context?.querySelector("summary");
      expect(context?.open).toBe(false);
      expect(container.querySelector(".student-assignments__mission-version")?.textContent).toBe("Misión publicada v1 · Contexto Mentor v3");
      await act(async () => contextSummary?.click());
      expect(context?.open).toBe(true);
      const button = container.querySelector<HTMLButtonElement>('button[aria-label="Iniciar propuesta para Explora tu entorno"]');
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
});
