import { describe, expect, it } from "vitest";
import { validateProposalDraft } from "./proposal-validation";

describe("validateProposalDraft", () => {
  it("reports the fields the student needs to complete", () => {
    const result = validateProposalDraft({
      title: "",
      problem: "",
      solution: "",
      description: "",
      purpose: "",
      goals: "",
      skills: "",
      technologies: "",
      expectedOutcome: "",
      scope: "",
      constraints: "",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.fieldErrors.title).toContain("título");
      expect(result.fieldErrors.goals).toContain("objetivo");
    }
  });

  it("splits list fields into contract values and accepts a valid proposal", () => {
    const result = validateProposalDraft({
      title: "Diario de plantas",
      problem: "No recuerdo los cambios del jardín.",
      solution: "Registrar observaciones por fecha.",
      description: "Una bitácora para ver cómo cambia el jardín.",
      purpose: "Ayudarme a observar mejor las plantas.",
      goals: "Crear un registro\nConsultar observaciones",
      skills: "HTML\nCSS",
      technologies: "TypeScript\nSQLite",
      expectedOutcome: "Un prototipo que registre observaciones.",
      scope: "Una bitácora personal sin cuentas.",
      constraints: "Funciona sin conexión",
    });

    expect(result).toEqual({
      ok: true,
      data: {
        title: "Diario de plantas",
        problem: "No recuerdo los cambios del jardín.",
        solution: "Registrar observaciones por fecha.",
        description: "Una bitácora para ver cómo cambia el jardín.",
        purpose: "Ayudarme a observar mejor las plantas.",
        goals: ["Crear un registro", "Consultar observaciones"],
        skills: ["HTML", "CSS"],
        technologies: ["TypeScript", "SQLite"],
        expectedOutcome: "Un prototipo que registre observaciones.",
        tags: [],
        scope: "Una bitácora personal sin cuentas.",
        constraints: ["Funciona sin conexión"],
      },
    });
  });
});
