import { describe, expect, it } from "vitest";
import { buildAssignmentMentorConfig } from "./mentor-context.js";

const base = { subject: "Base", theme: "Tema base", assignment: "Consigna base", requirements: ["Restricción F11"], expectedLevel: "Bachillerato", rubricTitle: "Rúbrica F11", criteria: [{ id: "criterion-a", title: "Evidencia", description: "Señales comprobables", weight: 100 }] };

describe("assignment mentor context", () => {
  it("combines the immutable mission snapshot with the exact published F11 rubric", () => {
    const value = buildAssignmentMentorConfig(base, { title: "Misión v1", instructions: "Consigna v1", objectives: ["Objetivo v1"], requiredSkills: [{ id: "skill", name: "Navegación", description: null }] }, "Aplicaciones móviles");
    expect(value).toMatchObject({ subject: "Aplicaciones móviles", theme: "Misión v1", assignment: "Consigna v1", requirements: ["Objetivo v1", "Habilidad requerida: Navegación", "Restricción F11"], rubricTitle: "Rúbrica F11", criteria: base.criteria });
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
