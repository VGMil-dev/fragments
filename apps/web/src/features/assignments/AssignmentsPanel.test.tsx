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
