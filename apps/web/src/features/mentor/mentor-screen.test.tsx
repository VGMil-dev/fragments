// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../lib/api/student-api-instance", () => ({ studentApi: {
  getTechnologyCatalog: vi.fn(async () => ({ ok: true, data: { items: [], nextCursor: null } })),
  getSuggestedTechnologies: vi.fn(async () => ({ ok: true, data: { items: [], nextCursor: null } })),
} }));
import type { ClassroomSummary, SkillCatalogEntry } from "@fragments/contracts";
import { MentorScreen } from "./mentor-screen";

const mentorCss = readFileSync("src/features/mentor/mentor-screen.css", "utf8");

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function openEvaluationStage() {
  const stage = Array.from(mountedContainer?.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button") ?? []).find((button) => button.textContent?.includes("Evaluación"));
  await act(async () => stage?.click());
}

async function openIdeaStage() {
  const stage = Array.from(mountedContainer?.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button") ?? []).find((button) => button.textContent?.includes("Idea"));
  await act(async () => stage?.click());
}

const proposal = {
  id: "proposal-1",
  version: 1,
  proposal: {
    title: "Diario de plantas",
    problem: "No registro los cambios del jardín.",
    solution: "Anotar observaciones por fecha.",
    description: "Una bitácora para registrar los cambios del jardín.",
    purpose: "Observar el crecimiento de las plantas.",
    goals: ["Guardar una observación", "Comparar crecimiento"],
    skills: ["HTML"],
    technologies: ["TypeScript"],
    expectedOutcome: "Una bitácora que permita consultar observaciones.",
    tags: [],
    scope: "Una bitácora personal.",
    constraints: ["Sin cuentas de usuario"],
  },
  updatedAt: "2026-11-04T12:00:00.000Z",
};

const linkedProposal = {
  ...proposal,
  assignmentVersionId: "assignment-version-1",
  assignmentContext: {
    assignmentVersionId: "assignment-version-1",
    requiredSkills: [{ id: "required-navigation", name: "Navegación con Expo" }],
    mentorContext: {
      version: 4,
      publishedAt: "2026-11-03T12:00:00.000Z",
      config: {
        subject: "Programación Móvil",
        theme: "Navegación con Expo Router",
        assignment: "Diseña una navegación comprobable.",
        expectedLevel: "Tercero de bachillerato",
        rubricTitle: "Rúbrica privada del docente",
        criteria: [{ id: "private-criterion", title: "Criterio privado", description: "Detalle privado", weight: 100 }],
        requirements: ["Requisito privado"],
      },
    },
  },
};

const evaluation = {
  evaluationId: "evaluation-1",
  proposalId: "proposal-1",
  proposalVersion: 1,
  viability: "needs_revision" as const,
  analysis: {
    rubricVersion: "v1",
    score: 72,
    findings: [{
      criterionId: "scope",
      status: "not_verified" as const,
      evidence: [{ source: "proposal" as const, field: "scope", digest: "a".repeat(64) }],
      reason: "El alcance necesita un límite más concreto.",
      guidanceLevel: 1 as const,
    }],
    limitations: [],
    modelId: "fake-provider:mentor-fixture",
    inputDigest: "b".repeat(64),
  },
  guidance: ["Prueba primero con dos entradas."],
  similarityMatches: [],
  evaluatedAt: "2026-11-04T12:00:00.000Z",
};

const actions = {
  savedProposals: [] as typeof proposal[],
  proposalsLoading: false,
  onOpenProposal: vi.fn(),
  onSave: vi.fn(async () => ({ ok: true as const, data: proposal })),
  onUpdate: vi.fn(async () => ({ ok: true as const, data: proposal })),
  onEvaluate: vi.fn(async () => ({ ok: true as const, data: evaluation })),
  onRecoverEvaluation: vi.fn(async () => ({ ok: true as const, data: evaluation })),
  onGenerateSubmission: vi.fn(async () => ({ ok: false as const, error: { code: "TEST", message: "hidden" } })),
  onReadme: vi.fn(async () => ({ ok: true as const, data: "# README" })),
  onPdf: vi.fn(async () => ({ ok: true as const, data: new Blob(["pdf"]) })),
};

const classroom: ClassroomSummary = {
  id: "class-a",
  title: "Aula de programación",
  subject: "Programación",
  groupLabel: "Grupo A",
  period: "2026-2",
  status: "active",
  createdAt: "2026-08-01T12:00:00.000Z",
  updatedAt: "2026-08-01T12:00:00.000Z",
};

function skillFixture(index: number): SkillCatalogEntry {
  const stamp = "2026-08-01T12:00:00.000Z";
  return { id: "skill-" + index, name: "Habilidad " + String(index).padStart(3, "0"), description: null, archived: false, createdAt: stamp, updatedAt: stamp };
}

let mountedRoot: ReturnType<typeof createRoot> | undefined;
let mountedContainer: HTMLDivElement | undefined;

afterEach(() => {
  if (mountedRoot) act(() => mountedRoot?.unmount());
  mountedRoot = undefined;
  mountedContainer?.remove();
  mountedContainer = undefined;
  vi.clearAllMocks();
});

describe("MentorScreen", () => {
  it("presenta una sola etapa activa en la ruta de proyecto", () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    act(() => { mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} />); });

    expect(mountedContainer?.querySelector(".student-screen__eyebrow")?.textContent).toContain("RUTA DE PROYECTO");
    expect(mountedContainer?.querySelectorAll(".mentor-stage-nav li button[aria-current='step']")).toHaveLength(1);
  });

  it("shows mission-required skills read-only without merging them into the optional classroom selection", async () => {
    const requiredSkill = { ...skillFixture(1), id: "required-1", name: "Navegación renombrada" };
    const optionalSkill = { ...skillFixture(2), id: "optional-1", name: "Accesibilidad" };
    const otherClassroom = { ...classroom, id: "class-b", title: "Otra aula" };
    const loadSkills = vi.fn(async () => ({ ok: true as const, data: [requiredSkill, optionalSkill] }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} missionClassroomId={classroom.id} requiredMissionSkills={[{ id: "required-1", name: "Navegación fijada" }]} classrooms={[otherClassroom, classroom]} onLoadClassroomSkills={loadSkills} onBack={vi.fn()} />); });

    const skillsStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Habilidades"));
    await act(async () => { skillsStage?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(mountedContainer.querySelector<HTMLSelectElement>(".mentor-skills__classroom select")?.value).toBe(classroom.id);
    expect(loadSkills).toHaveBeenCalledWith(classroom.id);
    const required = mountedContainer.querySelector(".mentor-skills__required");
    expect(required?.textContent).toContain("Navegación fijada");
    expect(required?.textContent).not.toContain("Sin asignación");
    expect(required?.querySelectorAll("button")).toHaveLength(0);
    expect(mountedContainer.querySelector(".mentor-skills__selected")?.textContent ?? "").not.toContain("Navegación fijada");

    const optionalButtons = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-skills__option"));
    expect(optionalButtons.map((button) => button.lastElementChild?.textContent?.trim())).toEqual(["Accesibilidad"]);
    const optional = optionalButtons[0];
    await act(async () => optional?.click());
    expect(required?.textContent).toContain("Navegación fijada");
    expect(mountedContainer.querySelector(".mentor-skills__selected")?.textContent).toContain("Accesibilidad");

    await act(async () => mountedContainer?.querySelector<HTMLFormElement>("#mentor-proposal-form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(actions.onSave).toHaveBeenCalledWith(expect.objectContaining({
      proposal: expect.objectContaining({ mentorSkills: { classroomId: classroom.id, selectedSkillIds: ["optional-1"] } }),
    }));
  });

  it("muestra un stepper horizontal en todas las etapas y un resumen real en evaluación", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />));

    await openEvaluationStage();

    expect(mountedContainer.querySelector("h1")?.textContent).toBe("Evalúa tu propuesta");
    expect(mountedContainer.querySelectorAll(".mentor-stage-nav--horizontal li")).toHaveLength(6);
    expect(mountedContainer.querySelector(".mentor-stage-nav--horizontal li button[aria-current='step']")?.textContent).toContain("Evaluación");
    expect(Array.from(mountedContainer.querySelectorAll(".mentor-stage-nav__state")).map((state) => state.textContent)).toEqual([
      "Completada", "Modo personal", "Completada", "Completada", "Etapa actual", "Pendiente",
    ]);
    expect(mountedContainer.querySelector("[aria-label='Preparación de la propuesta']")?.getAttribute("aria-valuenow")).toBe("100");
    const evaluationForm = mountedContainer.querySelector<HTMLFormElement>(".mentor-form--evaluation");
    expect(evaluationForm?.childElementCount).toBe(0);
    expect(mountedContainer.querySelector<HTMLButtonElement>(".mentor-save-button")?.getAttribute("form")).toBe(evaluationForm?.id);
    expect(mountedContainer.textContent).toContain("Diario de plantas");
    expect(mountedContainer.textContent).toContain("Una bitácora para registrar los cambios del jardín.");
    expect(mountedContainer.textContent).toContain("Observar el crecimiento de las plantas.");
    expect(mountedContainer.textContent).toContain("TypeScript");
    expect(mountedContainer.textContent).toContain("Guardar borrador");
    expect(mountedContainer.textContent).toContain("Si cumple los criterios, la propuesta se publicará automáticamente");
    expect(mountedContainer.querySelector<HTMLButtonElement>(".mentor-evaluate-button")?.disabled).toBe(false);
    expect(mountedContainer.querySelector(".mentor-progress-card")?.textContent).toContain("Borrador completado: 100 %");
    expect(mountedContainer.querySelector(".mentor-progress-card [role='progressbar']")?.getAttribute("aria-valuenow")).toBe("100");
    expect(mountedContainer.textContent).not.toContain("Descargar plantilla Word");
    expect(mountedContainer.textContent).not.toContain("Importar propuesta (.docx)");
  });

  it("separa en la evaluación las habilidades requeridas por la misión de las habilidades propias", async () => {
    const linked = { ...linkedProposal, proposal: { ...linkedProposal.proposal, skills: [] } };
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(
      <MentorScreen {...actions} initialProposal={linked} requiredMissionSkills={linked.assignmentContext.requiredSkills} onBack={vi.fn()} />,
    ));

    await openEvaluationStage();

    expect(mountedContainer.textContent).toContain("No has guardado habilidades propias en esta propuesta.");
    expect(mountedContainer.querySelector('[aria-label="Habilidades requeridas por la misión"]')?.textContent).toContain("Navegación con Expo");
    expect(mountedContainer.textContent).not.toContain("No hay habilidades guardadas.");
  });

  it.each(["sin requisitos", "sin snapshot disponible"] as const)("distingue una misión vinculada %s en el resumen de evaluación", async (caseName) => {
    const linked = caseName === "sin requisitos"
      ? { ...linkedProposal, assignmentContext: { ...linkedProposal.assignmentContext, requiredSkills: [] } }
      : { ...linkedProposal, assignmentContext: undefined };
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={linked} onBack={vi.fn()} />));

    await openEvaluationStage();

    expect(mountedContainer.textContent).toContain("Habilidades requeridas por la misión");
    expect(mountedContainer.textContent).toContain(caseName === "sin requisitos"
      ? "La misión vinculada no requiere habilidades específicas."
      : "No se pudieron recuperar las habilidades requeridas de la misión.");
  });

  it("guarda el borrador antes de avanzar y expone el estado actual de cada etapa", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />));

    expect(mountedContainer.querySelectorAll(".mentor-stage-nav--horizontal li")).toHaveLength(6);
    expect(mountedContainer.querySelector(".mentor-stage-nav--horizontal li button[aria-current='step']")?.textContent).toContain("Idea");
    expect(mountedContainer.querySelector(".mentor-stage-nav__state--current")?.textContent).toBe("Etapa actual");
    const continueButton = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-form__actions button")).find((button) => button.textContent?.includes("Guardar y continuar"));
    expect(continueButton).toBeDefined();

    await act(async () => continueButton?.click());

    expect(actions.onUpdate).toHaveBeenCalledWith(proposal.id, expect.objectContaining({ expectedVersion: proposal.version }));
    expect(mountedContainer.querySelector("h1")?.textContent).toBe("Tu proyecto en contexto");
  });

  it("no marca como anterior completada una etapa incompleta", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} />));

    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => context?.click());

    const idea = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Idea"));
    expect(idea?.getAttribute("aria-label")).toBe("Idea: Pendiente");
    expect(idea?.querySelector(".mentor-stage-nav__state")?.textContent).toBe("Pendiente");
  });

  it("no marca el contexto personal vacío como completado en el stepper", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} />));

    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));

    expect(context?.getAttribute("aria-label")).toBe("Contexto: Modo personal");
    expect(context?.classList.contains("is-complete")).toBe(false);
    expect(context?.querySelector(".mentor-stage-nav__state")?.textContent).toBe("Modo personal");
  });

  it.each([
    ["título", { title: "T".repeat(161) }],
    ["propósito", { purpose: "P".repeat(1001) }],
  ])("mantiene Idea pendiente cuando el %s excede su límite", async (_field, values) => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    const invalidIdea = { ...proposal, proposal: { ...proposal.proposal, ...values } };
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={invalidIdea} onBack={vi.fn()} />));

    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => context?.click());

    const idea = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Idea"));
    expect(idea?.getAttribute("aria-label")).toBe("Idea: Pendiente");
  });

  it("mantiene la etapa cuando falla Guardar y continuar", async () => {
    const onSave = vi.fn(async () => ({ ok: false as const, error: { code: "UNAVAILABLE", message: "Temporalmente no disponible." } }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} onSave={onSave} onBack={vi.fn()} />));

    const continueButton = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-form__actions button")).find((button) => button.textContent?.includes("Guardar y continuar"));
    await act(async () => continueButton?.click());

    expect(onSave).toHaveBeenCalledOnce();
    expect(mountedContainer.querySelector("h1")?.textContent).toBe("Tu idea toma forma");
    expect(mountedContainer.textContent).toContain("No pudimos guardar tu propuesta.");
  });

  it("no habilita evaluar con un borrador incompleto y mantiene la etapa pendiente", async () => {
    const incomplete = { ...proposal, proposal: { title: "Diario de plantas" } } as typeof proposal;
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={incomplete} onBack={vi.fn()} />));

    await openEvaluationStage();

    expect(mountedContainer.querySelector<HTMLButtonElement>(".mentor-evaluate-button")?.disabled).toBe(true);
    expect(mountedContainer.querySelector("[aria-label='Preparación de la propuesta']")?.getAttribute("aria-valuenow")).toBe("14");
    expect(mountedContainer.querySelectorAll(".mentor-stage-nav li button.is-complete")).toHaveLength(1);
  });

  it("bloquea la evaluación cuando hay cambios pendientes de guardar", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />));
    await openIdeaStage();
    const title = mountedContainer.querySelector<HTMLInputElement>(".mentor-field input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(title, "Diario cambiado");
    await act(async () => title?.dispatchEvent(new Event("input", { bubbles: true })));

    await openEvaluationStage();

    expect(mountedContainer.querySelector<HTMLButtonElement>(".mentor-evaluate-button")?.disabled).toBe(true);
    expect(mountedContainer.textContent).toContain("Tienes cambios pendientes de guardar.");
  });

  it("lleva Editar y Ver contexto a la etapa correspondiente", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />));
    await openEvaluationStage();

    await act(async () => mountedContainer?.querySelectorAll<HTMLButtonElement>(".mentor-summary-row button")[0]?.click());
    expect(mountedContainer.querySelector("h1")?.textContent).toBe("Tu idea toma forma");
    await openEvaluationStage();
    await act(async () => mountedContainer?.querySelectorAll<HTMLButtonElement>(".mentor-summary-row button")[1]?.click());
    expect(mountedContainer.querySelector("h1")?.textContent).toBe("Tu proyecto en contexto");
    expect(mountedContainer.querySelector(".mentor-context--personal")).not.toBeNull();
    expect(mountedContainer.querySelector(".mentor-field")).toBeNull();
  });

  it("el resumen mantiene tecnologías y textos persistidos mientras hay cambios sin guardar", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />));

    await openIdeaStage();

    const title = mountedContainer.querySelector<HTMLInputElement>(".mentor-field input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(title, "Título sin guardar");
    await act(async () => title?.dispatchEvent(new Event("input", { bubbles: true })));
    const objectives = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Objetivos y alcance"));
    await act(async () => objectives?.click());
    const scope = mountedContainer.querySelector<HTMLTextAreaElement>(".mentor-project-outcomes__card textarea");
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")?.set?.call(scope, "Alcance sin guardar");
    await act(async () => scope?.dispatchEvent(new Event("input", { bubbles: true })));
    await openEvaluationStage();

    expect(mountedContainer.textContent).toContain("Diario de plantas");
    expect(mountedContainer.textContent).not.toContain("Título sin guardar");
    expect(mountedContainer.textContent).toContain("TypeScript");
    expect(mountedContainer.textContent).toContain("Una bitácora personal.");
    expect(mountedContainer.textContent).not.toContain("Alcance sin guardar");
    expect(mountedContainer.textContent).toContain("Observar el crecimiento de las plantas.");
    expect(mountedContainer.textContent).toContain("Tienes cambios pendientes de guardar.");
    await act(async () => mountedContainer?.querySelector<HTMLButtonElement>(".mentor-save-button")?.click());
    expect(actions.onUpdate).toHaveBeenCalledWith(proposal.id, expect.objectContaining({ expectedVersion: proposal.version }));
  });

  it("loads the authorized catalog, expands incrementally, searches, preserves selection, and saves IDs", async () => {
    const skills = Array.from({ length: 100 }, (_, index) => skillFixture(index + 1));
    const loadSkills = vi.fn(async () => ({ ok: true as const, data: skills }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} classrooms={[classroom]} onLoadClassroomSkills={loadSkills} onBack={vi.fn()} />);
    });
    const skillsStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Habilidades"));
    await act(async () => { skillsStage?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(loadSkills).toHaveBeenCalledWith(classroom.id);
    expect(mountedContainer.textContent).toContain("Revisa las habilidades de tu actividad y elige en cuáles quieres enfocarte.");
    expect(mountedContainer.textContent).toContain("Descargar plantilla Word");
    expect(mountedContainer.textContent).toContain("Importar propuesta (.docx)");
    expect(mountedContainer.textContent).toContain("100 disponibles");
    expect(mountedContainer.textContent).toContain("No hay habilidades marcadas como obligatorias");
    expect(mountedContainer.querySelectorAll(".mentor-skills__option")).toHaveLength(6);
    const more = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-skills__more")).find((button) => button.textContent?.includes("Mostrar más"));
    await act(async () => more?.click());
    expect(mountedContainer.querySelectorAll(".mentor-skills__option")).toHaveLength(12);

    const firstSkill = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-skills__option")).find((button) => button.textContent?.includes("Habilidad 001"));
    await act(async () => firstSkill?.click());
    expect(mountedContainer.querySelector(".mentor-skills__selected")?.textContent).toContain("Habilidad 001");

    const search = mountedContainer.querySelector<HTMLInputElement>(".mentor-skills__search input");
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(search, "sin coincidencias");
    await act(async () => search?.dispatchEvent(new Event("input", { bubbles: true })));
    expect(mountedContainer.textContent).toContain("No encontramos habilidades con ese nombre");
    expect(mountedContainer.querySelector(".mentor-skills__selected")?.textContent).toContain("Habilidad 001");

    const objectives = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Objetivos y alcance"));
    await act(async () => objectives?.click());
    await act(async () => skillsStage?.click());
    expect(mountedContainer.querySelector(".mentor-skills__selected")?.textContent).toContain("Habilidad 001");

    const form = mountedContainer.querySelector("form");
    await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(actions.onUpdate).toHaveBeenCalledWith(proposal.id, expect.objectContaining({
      expectedVersion: proposal.version,
      proposal: expect.objectContaining({ mentorSkills: { classroomId: classroom.id, selectedSkillIds: ["skill-1"] } }),
    }));
    expect(loadSkills).toHaveBeenCalledTimes(1);
  });

  it("preserves a recovered proposal's classroom instead of applying the mission default", async () => {
    const otherClassroom = { ...classroom, id: "class-b", title: "Otra aula" };
    const recoveredProposal = { ...proposal, proposal: { ...proposal.proposal, mentorSkills: { classroomId: otherClassroom.id, selectedSkillIds: ["skill-1"] } } };
    const loadSkills = vi.fn(async () => ({ ok: true as const, data: [skillFixture(1)] }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} initialProposal={recoveredProposal} missionClassroomId={classroom.id} classrooms={[classroom, otherClassroom]} onLoadClassroomSkills={loadSkills} onBack={vi.fn()} />); });

    const skillsStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Habilidades"));
    await act(async () => { skillsStage?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(mountedContainer.querySelector<HTMLSelectElement>(".mentor-skills__classroom select")?.value).toBe(otherClassroom.id);
    expect(loadSkills).toHaveBeenCalledWith(otherClassroom.id);
    expect(loadSkills).not.toHaveBeenCalledWith(classroom.id);
  });

  it("does not substitute another classroom when the mission classroom is not active", async () => {
    const otherClassroom = { ...classroom, id: "class-b", title: "Otra aula" };
    const loadSkills = vi.fn(async () => ({ ok: true as const, data: [skillFixture(1)] }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} missionClassroomId="inactive-mission-class" classrooms={[classroom, otherClassroom]} onLoadClassroomSkills={loadSkills} onBack={vi.fn()} />); });

    const skillsStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Habilidades"));
    await act(async () => { skillsStage?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });

    expect(mountedContainer.querySelector<HTMLSelectElement>(".mentor-skills__classroom select")?.value).toBe("");
    expect(mountedContainer.textContent).toContain("Elige un aula para consultar las habilidades autorizadas");
    expect(loadSkills).not.toHaveBeenCalled();
  });

  it("shows a recoverable catalog error and retries the same classroom", async () => {
    const loadSkills = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "NETWORK_ERROR", message: "hidden" } })
      .mockResolvedValueOnce({ ok: true as const, data: [skillFixture(1), skillFixture(2), skillFixture(3)] });
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} classrooms={[classroom]} onLoadClassroomSkills={loadSkills} onBack={vi.fn()} />); });
    const skillsStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Habilidades"));
    await act(async () => { skillsStage?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(mountedContainer.textContent).toContain("No pudimos consultar las habilidades");
    const retry = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-skills__state button")).find((button) => button.textContent?.includes("Volver a cargar"));
    await act(async () => { retry?.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(loadSkills).toHaveBeenCalledTimes(2);
    expect(mountedContainer.querySelectorAll(".mentor-skills__option")).toHaveLength(3);
  });
  it("shows one independent stage at a time with contextual navigation", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} />); });
    expect(mountedContainer.querySelector(".mentor-field input")).not.toBeNull();
    expect(mountedContainer.querySelector(".mentor-context")).toBeNull();
    expect(mountedContainer.querySelector(".mentor-stage-nav")).not.toBeNull();
    expect(mountedContainer.textContent).toContain("Borrador completado: 0 %");
    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    expect(mountedContainer.querySelector(".mentor-stage-nav--horizontal li button[aria-current='step']")?.textContent).toContain("Idea");
    expect(context?.getAttribute("aria-current")).toBeNull();
    await act(async () => context?.click());
    expect(mountedContainer.textContent).toContain("Modo personal");
    expect(mountedContainer.querySelector(".mentor-field")).toBeNull();
    expect(mountedContainer.querySelector(".mentor-context--academic")).toBeNull();
  });

  it("keeps stage labels and real statuses visible in the compact stepper breakpoint", () => {
    expect(mentorCss).toContain("@media (max-width: 1100px)");
    expect(mentorCss).toContain(".mentor-stage-nav--horizontal ol { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: .4rem; }");
    expect(mentorCss).toContain(".mentor-stage-nav__state { position: static; grid-column: 2;");
    expect(mentorCss).toContain("@media (max-width: 520px) {");
    expect(mentorCss).toContain(".mentor-stage-nav--horizontal ol { grid-template-columns: repeat(2, minmax(0, 1fr)); }");
  });

  it("shows only the authorized read-only academic context when one is published", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} contextState={{ status: "success", data: {
        version: 3,
        publishedAt: "2026-11-20T12:00:00.000Z",
        config: {
          subject: "Proyectos de aula",
          theme: "Investigación escolar",
          assignment: "Delimita un problema observable y plantea una solución inicial.",
          requirements: ["Entrega individual", "Entrega individual"],
          expectedLevel: "Proyecto inicial con alcance acotado.",
          rubricTitle: "Propuesta inicial",
          criteria: [{ id: "scope", title: "Alcance", description: "Define un resultado verificable.", weight: 30 }],
        },
      } }} />);
    });
    const contextStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => contextStage?.click());
    expect(mountedContainer.querySelector("#mentor-title")?.textContent).toBe("Tu proyecto en contexto");
    expect(mountedContainer.querySelector(".student-screen__lead")?.textContent).toBe("Relaciona tu idea con la materia, la consigna y las condiciones de tu aula.");
    expect(mountedContainer.textContent).toContain("Contexto académico disponible");
    expect(mountedContainer.textContent).toContain("Proyectos de aula");
    expect(mountedContainer.textContent).toContain("Investigación escolar");
    expect(mountedContainer.textContent).toContain("Delimita un problema observable");
    expect(mountedContainer.querySelectorAll(".mentor-context__requirements li")).toHaveLength(2);
    expect(mountedContainer.querySelector("#mentor-context-criteria-title")?.textContent).toContain("Restricciones y criterios");
    expect(mountedContainer.querySelector("#mentor-context-objectives-title")?.textContent).toContain("Orientación del docente");
    const contextCards = Array.from(mountedContainer.querySelectorAll(".mentor-context__grid > .mentor-context__card"));
    expect(contextCards.map((card) => card.classList.contains("mentor-context__card--subject"))).toEqual([true, false, false]);
    expect(contextCards.map((card) => card.classList.contains("mentor-context__card--criteria"))).toEqual([false, true, false]);
    expect(contextCards.map((card) => card.classList.contains("mentor-context__card--orientation"))).toEqual([false, false, true]);
    expect(mountedContainer.querySelector(".mentor-context__card--orientation")?.textContent).toContain("Nivel esperado: Proyecto inicial con alcance acotado.");
    expect(mountedContainer.textContent).not.toContain("Modo personal");
    expect(mountedContainer.querySelector(".mentor-context--academic input, .mentor-context--academic textarea, .mentor-context--academic select")).toBeNull();
    const contextForm = mountedContainer.querySelector(".mentor-form--context");
    expect(contextForm?.querySelector(".mentor-context--academic")).not.toBeNull();
    expect(contextForm?.querySelector(".mentor-form__footer")).not.toBeNull();
    expect(contextForm?.closest(".mentor-stage-layout")?.querySelector(".mentor-choices--context")).toBeNull();
    expect(mountedContainer.querySelector(".mentor-choices--context")?.closest(".mentor-stage-layout")).toBeNull();
    expect(mountedContainer.querySelector(".mentor-form__footer > button")?.textContent).toContain("Anterior");
    expect(mountedContainer.querySelector(".mentor-form__actions")?.textContent).toContain("Guardar borrador");
    expect(mountedContainer.querySelector(".mentor-form__actions")?.textContent).toContain("Guardar y continuar");
    expect(mountedContainer.querySelector(".mentor-form__actions")?.textContent).not.toContain("Anterior");
    expect(mountedContainer.querySelector(".mentor-form__footer")?.textContent).toContain("Anterior");
  });

  it("keeps context loading and failures distinct from personal mode", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} contextState={{ status: "loading" }} />); });
    const contextStage = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => contextStage?.click());
    expect(mountedContainer.querySelector('[role="status"]')?.textContent).toContain("Cargando el contexto académico");
    expect(mountedContainer.textContent).not.toContain("Modo personal");
    expect(mountedContainer.textContent).not.toContain("Contexto académico disponible");

    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} contextState={{ status: "error", retry: vi.fn() }} />); });
    expect(mountedContainer.querySelector('[role="alert"]')?.textContent).toContain("No pudimos cargar el contexto académico");
    expect(mountedContainer.textContent).not.toContain("Modo personal");
  });

  it("enables the deterministic cover prompt only for an evaluation of the current proposal version", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />); });
    const coverStage = () => Array.from(mountedContainer?.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button") ?? []).find((button) => button.textContent?.includes("Portada"));
    await act(async () => coverStage()?.click());
    expect(mountedContainer.textContent).toContain("Completa una evaluación guardada para la versión actual");
    expect(mountedContainer.querySelector('input[accept*="image"]')).toBeNull();

    await act(async () => { mountedRoot?.render(<MentorScreen key="evaluated" {...actions} initialProposal={proposal} initialEvaluation={{ status: "success", data: evaluation }} onBack={vi.fn()} />); });
    await act(async () => coverStage()?.click());
    expect(mountedContainer.textContent).toContain("Copiar prompt");
    expect(mountedContainer.querySelector(".mentor-cover pre")).not.toBeNull();
  });

  it("keeps a stale draft conflict visible and offers a reload path", async () => {
    const resolveConflict = vi.fn();
    const update = vi.fn(async () => ({ ok: false as const, error: { code: "VERSION_CONFLICT", message: "Conflicto de versión." } }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onUpdate={update} onResolveConflict={resolveConflict} onBack={vi.fn()} />); });
    await act(async () => mountedContainer?.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(mountedContainer.textContent).toContain("Tus cambios no sobrescribieron la versión actual");
    const reload = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === "Volver a Mis proyectos");
    await act(async () => reload?.click());
    expect(resolveConflict).toHaveBeenCalledOnce();
  });

  it("starts with a validated proposal form and no invented evaluation", () => {
    const html = renderToStaticMarkup(
      <MentorScreen {...actions} onBack={vi.fn()} />,
    );

    expect(html).toContain("Tu idea toma forma");
    expect(html.indexOf(">Idea</span>")).toBeLessThan(html.indexOf(">Contexto</span>"));
    expect(html).toContain("Guardar borrador");
    expect(html).toContain("Descargar plantilla Word");
    expect(html).toContain("/templates/fragments-mentor-propuesta.docx");
    expect(html).toContain("Importar propuesta (.docx)");
    expect(html).toContain("Crear propuesta directamente");
    expect(html).not.toContain("Tu propuesta</h2>");
    expect(html).not.toContain("72/100");
    expect(html).not.toContain("scope necesita");
  });

  it("shows editable objectives, MVP, expected outcome, catalog technologies, and hides personal constraints", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />); });
    const objectives = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Objetivos"));
    await act(async () => objectives?.click());
    expect(mountedContainer.textContent).toContain("Tecnologías");
    expect(mountedContainer.textContent).toContain("Resultado esperado");
    expect(mountedContainer.textContent).not.toContain("Condiciones propias del proyecto");
    expect(mountedContainer.querySelectorAll(".mentor-objectives__row input").length).toBeGreaterThan(0);
    expect(mountedContainer.textContent).toContain("Etiquetas sin identidad de catálogo");
    expect(mountedContainer.textContent).toContain("TypeScript");
    expect(mountedContainer.textContent).toContain("Alcance del MVP");
    expect(mountedContainer.textContent).toContain("Resultado esperado");
    expect(Array.from(mountedContainer.querySelectorAll("textarea")).some((field) => (field as HTMLTextAreaElement).value === "Una bitácora que permita consultar observaciones.")).toBe(true);
  });

  it("keeps each objective editable and preserves its order when moved", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />); });
    const objectives = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Objetivos"));
    await act(async () => objectives?.click());
    const fields = Array.from(mountedContainer.querySelectorAll<HTMLInputElement>(".mentor-objectives__row input"));
    expect(fields).toHaveLength(2);
    expect(fields[0]?.value).toBe("Guardar una observación");
    expect(fields[1]?.value).toBe("Comparar crecimiento");
    const moveUp = mountedContainer.querySelector<HTMLButtonElement>('[aria-label="Mover objetivo 2 arriba"]');
    await act(async () => moveUp?.click());
    expect(Array.from(mountedContainer.querySelectorAll<HTMLInputElement>(".mentor-objectives__row input")).map((field) => field.value)).toEqual(["Comparar crecimiento", "Guardar una observación"]);
  });

  it("lists saved proposals and opens the selected one", async () => {
    const onOpenProposal = vi.fn();
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} savedProposals={[proposal]} onOpenProposal={onOpenProposal} onBack={vi.fn()} />));
    await openIdeaStage();
    expect(mountedContainer.textContent).toContain("Mis propuestas guardadas");
    expect(mountedContainer.textContent).toContain("Diario de plantas");
    const open = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Abrir propuesta");
    await act(async () => open?.click());
    expect(onOpenProposal).toHaveBeenCalledWith(proposal);
  });

  it("identifies each saved proposal in its open button's accessible name", async () => {
    const untitledProposal = { ...proposal, id: "proposal-2", proposal: { ...proposal.proposal, title: "" } };
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} savedProposals={[proposal, untitledProposal]} onBack={vi.fn()} />));
    await openIdeaStage();
    expect(mountedContainer.innerHTML).toContain('aria-label="Abrir propuesta: Diario de plantas"');
    expect(mountedContainer.innerHTML).toContain('aria-label="Abrir propuesta: Borrador sin título"');
  });

  it("shows the saved mission theme and pinned Mentor context version without private rubric details", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} savedProposals={[linkedProposal]} onBack={vi.fn()} />));
    await openIdeaStage();
    expect(mountedContainer.textContent).toContain("Misión vinculada");
    expect(mountedContainer.textContent).toContain("Navegación con Expo Router");
    expect(mountedContainer.textContent).toContain("Contexto Mentor v4");
    expect(mountedContainer.textContent).not.toContain("Rúbrica privada del docente");
    expect(mountedContainer.textContent).not.toContain("Criterio privado");
    expect(mountedContainer.textContent).not.toContain("Requisito privado");
  });

  it("shows a linked mission without inventing context when the saved context is unavailable", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} savedProposals={[{ ...proposal, assignmentVersionId: "assignment-version-1", assignmentContext: null }]} onBack={vi.fn()} />));
    await openIdeaStage();
    expect(mountedContainer.textContent).toContain("Misión vinculada");
    expect(mountedContainer.textContent).toContain("contexto académico no disponible");
    expect(mountedContainer.textContent).not.toContain("Contexto Mentor v");
    expect(mountedContainer.textContent).not.toContain("Navegación con Expo Router");
  });

  it("does not show a mission marker for a proposal without an assignment", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => mountedRoot?.render(<MentorScreen {...actions} savedProposals={[proposal]} onBack={vi.fn()} />));
    await openIdeaStage();
    expect(mountedContainer.textContent).not.toContain("Misión vinculada");
    expect(mountedContainer.textContent).not.toContain("Contexto Mentor v");
  });

  it("does not report an empty list when saved proposals failed to load", async () => {
    const retry = vi.fn();
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen {...actions} proposalsError onRetryProposals={retry} onBack={vi.fn()} />);
    });
    await openIdeaStage();

    expect(mountedContainer.textContent).toContain("No pudimos cargar tus propuestas guardadas.");
    expect(mountedContainer.textContent).not.toContain("Aún no tienes propuestas guardadas.");
    const button = Array.from(mountedContainer.querySelectorAll("button")).find((entry) => entry.textContent === "Volver a intentar");
    await act(async () => button?.click());
    expect(retry).toHaveBeenCalledOnce();
  });

  it("sends the chosen saved proposal to the workspace", async () => {
    const onOpenProposal = vi.fn();
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen {...actions} savedProposals={[proposal]} onOpenProposal={onOpenProposal} onBack={vi.fn()} />);
    });
    await openIdeaStage();

    const open = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Abrir propuesta");
    await act(async () => open?.click());
    expect(onOpenProposal).toHaveBeenCalledWith(proposal);
  });

  it("shows the saved context and recovers its persisted evaluation when reopening a linked proposal", async () => {
    const recover = vi.fn(async () => ({ ok: true as const, data: evaluation }));
    const onOpenProposal = vi.fn();
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen key="new-proposal" {...actions} savedProposals={[linkedProposal]} onOpenProposal={onOpenProposal} onBack={vi.fn()} />);
    });

    await openIdeaStage();

    expect(mountedContainer.textContent).toContain("Navegación con Expo Router");
    expect(mountedContainer.textContent).toContain("Contexto Mentor v4");
    const open = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Abrir propuesta");
    await act(async () => open?.click());
    expect(onOpenProposal).toHaveBeenCalledOnce();
    expect(onOpenProposal).toHaveBeenCalledWith(linkedProposal);
    const reopenedProposal = onOpenProposal.mock.calls[0]?.[0];
    expect(reopenedProposal).toBeDefined();
    if (!reopenedProposal) throw new Error("Abrir propuesta no entregó la propuesta seleccionada.");
    await act(async () => {
      mountedRoot?.render(
        <MentorScreen key={reopenedProposal.id} {...actions} initialProposal={reopenedProposal} restoreEvaluation onRecoverEvaluation={recover} onBack={vi.fn()} />,
      );
    });

    expect(recover).toHaveBeenCalledWith(reopenedProposal.id);
    expect(mountedContainer.textContent).toContain("72/100");
  });

  it("shows only the evaluation and findings supplied by the response", () => {
    const html = renderToStaticMarkup(
      <MentorScreen {...actions} initialProposal={proposal} initialEvaluation={{ status: "success", data: evaluation }} onBack={vi.fn()} />,
    );

    expect(html).toContain("72/100");
    expect(html).toContain("El alcance necesita un límite más concreto.");
    expect(html).toContain("Prueba primero con dos entradas.");
    expect(html).not.toContain("verified");
  });

  it("saves edits before evaluating through the existing Mentor callbacks", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen {...actions} initialProposal={proposal} onBack={vi.fn()} />);
    });

    await openIdeaStage();

    const title = mountedContainer.querySelector<HTMLInputElement>(".mentor-field input");
    expect(title).not.toBeNull();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(title, "Diario de plantas editado");
    await act(async () => title?.dispatchEvent(new Event("input", { bubbles: true })));
    const form = mountedContainer.querySelector("form");
    await act(async () => form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));

    expect(actions.onUpdate).toHaveBeenCalledWith(proposal.id, expect.objectContaining({ proposal: expect.objectContaining({ title: "Diario de plantas editado", constraints: ["Sin cuentas de usuario"] }), expectedVersion: proposal.version }));
    await openEvaluationStage();
    const evaluate = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Evaluar propuesta");
    expect(evaluate).toBeDefined();
    expect(mountedContainer.textContent).toContain("se publicará automáticamente en Galería después de evaluarla");
    await act(async () => evaluate?.click());
    expect(actions.onEvaluate).toHaveBeenCalledWith(proposal.id);
    expect(mountedContainer.textContent).toContain("72/100");
  });

  it("recovers a persisted evaluation after timeout without repeating the evaluation POST", async () => {
    const evaluate = vi.fn(async () => ({
      ok: false as const,
      error: { code: "REQUEST_TIMEOUT", message: "La solicitud tardó demasiado." },
    }));
    const recover = vi.fn()
      .mockResolvedValueOnce({ ok: false as const, error: { code: "NOT_FOUND", message: "Aún no está disponible." } })
      .mockResolvedValueOnce({ ok: true as const, data: evaluation });
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(
        <MentorScreen {...actions} initialProposal={proposal} onEvaluate={evaluate} onRecoverEvaluation={recover} onBack={vi.fn()} />,
      );
    });

    await openEvaluationStage();
    const evaluateButton = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Evaluar propuesta");
    await act(async () => evaluateButton?.click());
    expect(mountedContainer.textContent).not.toContain("72/100");
    const recoverButton = mountedContainer.querySelector<HTMLButtonElement>(".async-state button");
    expect(recoverButton?.textContent).toBe("Recuperar evaluación");

    await act(async () => recoverButton?.click());

    expect(evaluate).toHaveBeenCalledTimes(1);
    expect(recover).toHaveBeenCalledTimes(2);
    expect(mountedContainer.textContent).toContain("72/100");
  });

  it.each(["AI_BUDGET_UNAVAILABLE", "AI_GATEWAY_BUDGET_EXCEEDED"] as const)("shows %s directly instead of replacing it with a recovery 404", async (code) => {
    const evaluate = vi.fn(async () => ({
      ok: false as const,
      error: {
        code,
        message: code === "AI_GATEWAY_BUDGET_EXCEEDED"
          ? "La evaluación no está disponible porque Vercel AI Gateway alcanzó su presupuesto."
          : "La evaluación no está disponible porque se agotó el presupuesto de IA configurado.",
      },
    }));
    const recover = vi.fn(async () => ({
      ok: false as const,
      error: { code: "NOT_FOUND", message: "No se encontró una evaluación guardada." },
    }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(
        <MentorScreen {...actions} initialProposal={proposal} onEvaluate={evaluate} onRecoverEvaluation={recover} onBack={vi.fn()} />,
      );
    });

    await openEvaluationStage();
    const evaluateButton = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Evaluar propuesta");
    await act(async () => evaluateButton?.click());

    expect(evaluate).toHaveBeenCalledOnce();
    expect(recover).not.toHaveBeenCalled();
    expect(mountedContainer.textContent).toContain(code === "AI_GATEWAY_BUDGET_EXCEEDED" ? "Vercel AI Gateway alcanzó su presupuesto" : "se agotó el presupuesto de IA configurado");
    expect(mountedContainer.textContent).toContain("Volver a intentar");
  });
});
