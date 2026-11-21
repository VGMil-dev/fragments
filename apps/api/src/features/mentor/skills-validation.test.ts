import { describe, expect, it, vi } from "vitest";
import { validateStudentSkillSelection } from "./skills-validation.js";

describe("Mentor skill selection validation", () => {
  it("resolves names from the authorized classroom catalog instead of trusting client labels", async () => {
    const listStudentSkills = vi.fn(async (studentId: string, classroomId: string) => {
      expect(studentId).toBe("fixture-student-a");
      expect(classroomId).toBe("fixture-class-a");
      return [
        { id: "fixture-skill-a", name: "Bases de datos" },
        { id: "fixture-skill-b", name: "Accesibilidad" },
      ];
    });
    const result = await validateStudentSkillSelection({ listStudentSkills }, {
      title: "Propuesta",
      skills: ["Habilidad inventada"],
      mentorSkills: { classroomId: "fixture-class-a", selectedSkillIds: ["fixture-skill-b"] },
    }, "fixture-student-a", true);
    expect(result).toEqual({ ok: true, proposal: {
      title: "Propuesta",
      skills: ["Accesibilidad"],
      mentorSkills: { classroomId: "fixture-class-a", selectedSkillIds: ["fixture-skill-b"] },
    } });
  });

  it.each([
    ["otra aula", "fixture-class-b", ["fixture-skill-a"], null],
    ["ID arbitrario", "fixture-class-a", ["fixture-arbitrary"], [{ id: "fixture-skill-a", name: "Habilidad válida" }]],
    ["deshabilitada", "fixture-class-a", ["fixture-disabled"], [{ id: "fixture-skill-a", name: "Habilidad válida" }]],
    ["archivada", "fixture-class-a", ["fixture-archived"], [{ id: "fixture-skill-a", name: "Habilidad válida" }]],
  ] as const)("rechaza una selección %s", async (_case, classroomId, ids, catalog) => {
    const listStudentSkills = vi.fn(async () => catalog);
    const result = await validateStudentSkillSelection({ listStudentSkills }, {
      mentorSkills: { classroomId, selectedSkillIds: [...ids] },
    }, "fixture-student-a", false);
    expect(result).toEqual({ ok: false });
  });

  it("rejects free-form skill names on new drafts", async () => {
    const listStudentSkills = vi.fn();
    const result = await validateStudentSkillSelection({ listStudentSkills }, { skills: ["TypeScript libre"] }, "fixture-student-a", true);
    expect(result).toEqual({ ok: false });
    expect(listStudentSkills).not.toHaveBeenCalled();
  });

  it("leaves historical selection untouched when a patch omits skill fields", async () => {
    const listStudentSkills = vi.fn();
    const patch = { title: "Título actualizado" };
    const result = await validateStudentSkillSelection({ listStudentSkills }, patch, "fixture-student-a", false);
    expect(result).toEqual({ ok: true, proposal: patch });
    expect(listStudentSkills).not.toHaveBeenCalled();
  });

  it("accepts an explicit empty selection without an aula", async () => {
    const listStudentSkills = vi.fn();
    const result = await validateStudentSkillSelection({ listStudentSkills }, {
      skills: ["stale client name"],
      mentorSkills: { classroomId: null, selectedSkillIds: [] },
    }, "fixture-student-a", false);
    expect(result).toEqual({ ok: true, proposal: { skills: [], mentorSkills: { classroomId: null, selectedSkillIds: [] } } });
    expect(listStudentSkills).not.toHaveBeenCalled();
  });
});
