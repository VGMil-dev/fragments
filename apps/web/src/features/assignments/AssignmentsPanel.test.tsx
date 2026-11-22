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

  it("renders only the published mission content passed to the student view", () => {
    const studentAssignment = {
      id: "fixture-version", assignmentId: "fixture-assignment", version: 1, classroomId: "fixture-class", classroomTitle: "Ciencias", subject: "Ciencias",
      title: "Explora tu entorno", instructions: "Describe lo que observas.", objectives: ["Registrar hallazgos"],
      requiredSkills: [{ id: skill.id, name: skill.name, description: null }], optionalSkills: [], status: "published",
      mentorContextVersion: 3, createdAt: "2026-11-22T00:00:00.000Z",
    } as StudentAssignment;
    const html = renderToStaticMarkup(<StudentAssignmentsList assignments={[studentAssignment]} />);
    expect(html).toContain("Misiones del aula");
    expect(html).toContain("Habilidades requeridas");
    expect(html).toContain("Observación");
  });
});
