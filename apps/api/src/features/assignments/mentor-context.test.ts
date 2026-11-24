import { describe, expect, it } from "vitest";
import { assignmentSkillSnapshots, buildAssignmentMentorConfig } from "./mentor-context.js";

const base = { subject: "Base", theme: "Tema base", assignment: "Consigna base", requirements: ["Restricción F11"], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica F11", criteria: [{ id: "criterion-a", title: "Evidencia", description: "Señales comprobables", weight: 100 }] };

describe("assignment mentor context", () => {
  it("projects only bounded valid identities and names from the selected snapshot skill list", () => {
    expect(assignmentSkillSnapshots({ requiredSkills: [
      { id: "required", name: " Navegación " }, null, { id: "blank", name: "   " }, { id: 3, name: "Inválida" },
    ] }, "requiredSkills")).toEqual([{ id: "required", name: "Navegación" }]);
    expect(assignmentSkillSnapshots({ requiredSkills: Array.from({ length: 21 }, (_, index) => ({ id: `skill-${index + 1}`, name: `Habilidad ${index + 1}` })) }, "requiredSkills"))
      .toHaveLength(20);
    expect(assignmentSkillSnapshots(null, "requiredSkills")).toEqual([]);
  });

  it("combines the immutable mission snapshot with the exact published F11 rubric", () => {
    const value = buildAssignmentMentorConfig(base, { title: "Misión v1", instructions: "Consigna v1", objectives: ["Objetivo v1"], requiredSkills: [{ id: "skill", name: "Navegación", description: null }] }, "Aplicaciones móviles");
    expect(value).toMatchObject({ subject: "Aplicaciones móviles", theme: "Misión v1", assignment: "Consigna v1", requirements: ["Objetivo v1", "Habilidad requerida: Navegación", "Restricción F11"], rubricTitle: "Rúbrica F11", criteria: base.criteria });
  });

  it("evaluates a mission with its published rubric instead of a later global F11 rubric", () => {
    const missionRubric = { title: "Rúbrica móvil v1", criteria: [{ id: "criterion-navigation", title: "Navegación", description: "Comprueba el recorrido entre pantallas.", weight: 100 }] };
    const value = buildAssignmentMentorConfig(base, { title: "Misión v1", instructions: "Conecta pantallas.", objectives: ["Navegación verificable"], missionRubric }, "Aplicaciones móviles");
    expect(value.rubricTitle).toBe("Rúbrica móvil v1");
    expect(value.criteria).toEqual(missionRubric.criteria);
    expect(value.criteria).not.toEqual(base.criteria);
  });

  it("uses the subject captured by the published mission rather than a later classroom subject", () => {
    const snapshot = { title: "Misión v1", instructions: "Consigna v1", objectives: ["Objetivo"], requiredSkills: [], optionalSkills: [], _classroomSubject: "Programación móvil" };

    const value = buildAssignmentMentorConfig(base, snapshot, "Asignatura editada después de publicar");

    expect(value.subject).toBe("Programación móvil");
  });

  it("validates and bounds all context fields", () => {
    expect(() => buildAssignmentMentorConfig(base, { instructions: "x".repeat(3001) }, "Materia")).not.toThrow();
    expect(() => buildAssignmentMentorConfig({ ...base, criteria: [] }, {}, "Materia")).toThrow();
  });

  it("preserves every objective, required and optional skill, and F11 requirement", () => {
    const objectives = Array.from({ length: 12 }, (_, index) => `Objetivo ${index + 1}`);
    const requiredSkills = Array.from({ length: 20 }, (_, index) => ({ id: `required-${index + 1}`, name: `Skill requerida ${index + 1}` }));
    const optionalSkills = Array.from({ length: 20 }, (_, index) => ({ id: `optional-${index + 1}`, name: `Skill optativa ${index + 1}` }));
    const f11Requirements = Array.from({ length: 20 }, (_, index) => `Restricción F11 ${index + 1}`);
    const value = buildAssignmentMentorConfig({ ...base, requirements: f11Requirements }, {
      objectives, requiredSkills, optionalSkills,
    }, "Aplicaciones móviles");

    expect(value.requirements).toEqual([
      ...objectives,
      ...requiredSkills.map((skill) => `Habilidad requerida: ${skill.name}`),
      ...optionalSkills.map((skill) => `Habilidad optativa: ${skill.name}`),
      ...f11Requirements,
    ]);
    expect(value.requirements).toHaveLength(72);
  });
});
