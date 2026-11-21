// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../../lib/api/student-api-instance", () => ({ studentApi: {
  getTechnologyCatalog: vi.fn(async () => ({ ok: true, data: { items: [], nextCursor: null } })),
  getSuggestedTechnologies: vi.fn(async () => ({ ok: true, data: { items: [], nextCursor: null } })),
} }));
import { MentorScreen } from "./mentor-screen";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

async function openEvaluationStage() {
  const stage = Array.from(mountedContainer?.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button") ?? []).find((button) => button.textContent?.includes("Evaluación"));
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
  it("shows one independent stage at a time with contextual navigation", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} />); });
    expect(mountedContainer.querySelector(".mentor-field input")).not.toBeNull();
    expect(mountedContainer.querySelector(".mentor-stage-nav")).not.toBeNull();
    expect(mountedContainer.textContent).toContain("Borrador completado: 0 %");
    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => context?.click());
    expect(mountedContainer.textContent).toContain("Modo personal");
    expect(mountedContainer.querySelector(".mentor-field")).toBeNull();
    expect(mountedContainer.querySelector(".mentor-context--academic")).toBeNull();
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
    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => context?.click());
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
    expect(mountedContainer.querySelector(".mentor-form__actions")?.textContent).toContain("Continuar");
    expect(mountedContainer.querySelector(".mentor-form__actions")?.textContent).not.toContain("Anterior");
    expect(mountedContainer.querySelector(".mentor-form__footer")?.textContent).not.toContain("Guarda los cambios");
  });

  it("keeps context loading and failures distinct from personal mode", async () => {
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => { mountedRoot?.render(<MentorScreen {...actions} onBack={vi.fn()} contextState={{ status: "loading" }} />); });
    const context = Array.from(mountedContainer.querySelectorAll<HTMLButtonElement>(".mentor-stage-nav button")).find((button) => button.textContent?.includes("Contexto"));
    await act(async () => context?.click());
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
    expect(html).toContain("Guardar borrador");
    expect(html).toContain("Descargar plantilla Word");
    expect(html).toContain("/templates/fragments-mentor-propuesta.docx");
    expect(html).toContain("Importar propuesta (.docx)");
    expect(html).toContain("Crear propuesta directamente");
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

  it("lists saved proposals and opens the selected one", () => {
    const onOpenProposal = vi.fn();
    const html = renderToStaticMarkup(
      <MentorScreen {...actions} savedProposals={[proposal]} onOpenProposal={onOpenProposal} onBack={vi.fn()} />,
    );

    expect(html).toContain("Mis propuestas guardadas");
    expect(html).toContain("Diario de plantas");
    expect(html).toContain("Abrir propuesta");
  });

  it("does not report an empty list when saved proposals failed to load", async () => {
    const retry = vi.fn();
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(<MentorScreen {...actions} proposalsError onRetryProposals={retry} onBack={vi.fn()} />);
    });

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

    const open = Array.from(mountedContainer.querySelectorAll("button")).find((button) => button.textContent === "Abrir propuesta");
    await act(async () => open?.click());
    expect(onOpenProposal).toHaveBeenCalledWith(proposal);
  });

  it("recovers an evaluation when reopening a saved proposal", async () => {
    const recover = vi.fn(async () => ({ ok: true as const, data: evaluation }));
    mountedContainer = document.createElement("div");
    document.body.append(mountedContainer);
    mountedRoot = createRoot(mountedContainer);
    await act(async () => {
      mountedRoot?.render(
        <MentorScreen {...actions} initialProposal={proposal} restoreEvaluation onRecoverEvaluation={recover} onBack={vi.fn()} />,
      );
    });

    expect(recover).toHaveBeenCalledWith(proposal.id);
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
    expect(mountedContainer.textContent).toContain("se publica automáticamente en Galería");
    expect(mountedContainer.textContent).toContain("no puede retirar una versión ya publicada");
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
