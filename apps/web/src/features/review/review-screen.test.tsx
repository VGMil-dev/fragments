// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ReviewScreen } from "./review-screen";

const analysis = {
  rubricVersion: "v1",
  score: 84,
  findings: [{
    criterionId: "entry-point",
    status: "verified" as const,
    evidence: [{ source: "repository" as const, path: "src/main.ts", lines: [3, 9] as [number, number], digest: "a".repeat(64) }],
    file: "src/main.ts",
    lines: [3, 9] as [number, number],
    reason: "El punto de entrada conecta los módulos principales.",
    guidanceLevel: 1 as const,
  }],
  limitations: [],
  modelId: "fake-provider:review-fixture",
  inputDigest: "b".repeat(64),
};

const completed = {
  id: "review-1",
  owner: "classroom",
  repo: "demo",
  commitSha: "a".repeat(40),
  status: "completed" as const,
  analysis,
  progress: 100 as const,
  updatedAt: "2026-11-04T12:00:00.000Z",
};

const actions = {
  onQueue: vi.fn(async () => ({ ok: true as const, data: {
    id: "review-1",
    owner: "classroom",
    repo: "demo",
    commitSha: "a".repeat(40),
    status: "queued" as const,
    progress: 0,
    createdAt: "2026-11-04T12:00:00.000Z",
  } })),
  onRetry: vi.fn(async () => ({ ok: true as const, data: completed })),
  onRefresh: vi.fn(async () => ({ ok: true as const, data: completed })),
  onGenerateSubmission: vi.fn(async () => ({ ok: false as const, error: { code: "TEST", message: "hidden" } })),
  onPdf: vi.fn(async () => ({ ok: true as const, data: new Blob(["pdf"]) })),
};

describe("ReviewScreen", () => {
  it("starts with a commit form and does not invent an analysis", () => {
    const html = renderToStaticMarkup(<ReviewScreen {...actions} onBack={vi.fn()} />);

    expect(html).toContain("Revisa un commit");
    expect(html).toContain("SHA del commit");
    expect(html).toContain("Evaluar commit");
    expect(html).not.toContain("84/100");
  });

  it("frames the commit workflow with a decorative Git icon and keeps the form controls labeled", () => {
    const html = renderToStaticMarkup(<ReviewScreen {...actions} onBack={vi.fn()} />);

    expect(html).toContain("review-screen__identity");
    expect(html).toContain("review-screen__commit-mark");
    expect(html).toContain('aria-label="SHA del commit"');
  });

  it("shows only the score and evidence-backed findings from a completed response", () => {
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: completed }} onBack={vi.fn()} />);

    expect(html).toContain("84/100");
    expect(html).toContain("Hallazgos devueltos · 1");
    expect(html).toContain("El punto de entrada conecta los módulos principales.");
    expect(html).toContain("src/main.ts:3–9");
    expect(html).toContain('href="/student/trainer?reviewId=review-1"');
    expect(html).toContain("Practicar en Trainer");
  });

  it("passes the completed review id when opening Trainer", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onOpenTrainer = vi.fn();
    try {
      await act(async () => root.render(<ReviewScreen {...actions} initialReview={{ status: "success", data: completed }} onBack={vi.fn()} onOpenTrainer={onOpenTrainer} />));
      await act(async () => container.querySelector<HTMLAnchorElement>('a[href^="/student/trainer"]')!.click());
      expect(onOpenTrainer).toHaveBeenCalledWith("review-1");
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("preserves semantic codes for verified, unverified, and review-needed findings", () => {
    const finding = analysis.findings[0]!;
    const review = { ...completed, analysis: { ...analysis, findings: [
      { ...finding, status: "verified" as const },
      { ...finding, criterionId: "unverified", status: "not_verified" as const },
      { ...finding, criterionId: "review-needed", status: "failed" as const },
    ] } };
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: review }} onBack={vi.fn()} />);

    expect(html).toContain('data-status="verified"');
    expect(html).toContain('data-status="not_verified"');
    expect(html).toContain('data-status="failed"');
  });

  it.each(["queued", "running", "failed"] as const)("does not offer Trainer while a review is %s", (status) => {
    const review = { ...completed, status } as never;
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: review }} onBack={vi.fn()} onOpenTrainer={vi.fn()} />);
    expect(html).not.toContain('href="/student/trainer"');
  });

  it("announces queue status returned by the API", () => {
    const queued = {
      id: "review-1",
      owner: "classroom",
      repo: "demo",
      commitSha: "a".repeat(40),
      status: "queued" as const,
      progress: 0,
      createdAt: "2026-11-04T12:00:00.000Z",
    };
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: queued }} onBack={vi.fn()} />);

    expect(html).toContain("Tu commit está en la cola");
    expect(html).toContain("classroom/demo");
    expect(html).toContain("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(html).toContain("En cola");
    expect(html).toContain("Actualizar estado");
    expect(html).not.toContain("84/100");
  });

  it("makes the exact repository and commit visible for every analysis state", () => {
    for (const status of ["queued", "running", "failed"] as const) {
      const review = { ...completed, status } as never;
      const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: review }} onBack={vi.fn()} />);

      expect(html).toContain('aria-label="Commit en revisión"');
      expect(html).toContain("classroom/demo");
      expect(html).toContain("a".repeat(40));
      expect(html).toContain(status === "queued" ? "En cola" : status === "running" ? "En análisis" : "Falló");
    }
  });

  it("explains when a completed analysis returned no findings", () => {
    const empty = { ...completed, analysis: { ...analysis, findings: [] } };
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: empty }} onBack={vi.fn()} />);

    expect(html).toContain("Hallazgos devueltos · 0");
    expect(html).toContain("Esta revisión no devolvió hallazgos para mostrar.");
  });

  it("does not expose raw server text when a review fails", () => {
    const failed = { ...completed, status: "failed" as const, message: "token=server-private" };
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: failed }} onBack={vi.fn()} />);

    expect(html).toContain("No se pudo completar este análisis");
    expect(html).not.toContain("server-private");
  });

  it("shares a review only after the student explicitly selects their mission proposal", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onQueue = vi.fn(async () => actions.onQueue());
    const linkedProposal = { id: "proposal-1", proposal: { title: "Rutas de Expo" }, assignmentVersionId: "mission-v1",
      assignmentContext: { assignmentVersionId: "mission-v1", mentorContext: { version: 2, config: { theme: "Programación móvil" } } } } as never;
    try {
      await act(async () => root.render(<ReviewScreen {...actions} onQueue={onQueue} linkedProposals={[linkedProposal]} onBack={vi.fn()} />));
      const inputs = [...container.querySelectorAll<HTMLInputElement>(".review-form input")];
      const setInput = (input: HTMLInputElement, value: string) => {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
        setter.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      await act(async () => {
        setInput(inputs[0]!, "fixture-student");
        setInput(inputs[1]!, "expo-app");
        setInput(inputs[2]!, "a".repeat(40));
        container.querySelector<HTMLFormElement>(".review-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      expect(onQueue).toHaveBeenLastCalledWith({ owner: "fixture-student", repo: "expo-app", commitSha: "a".repeat(40) });

      const select = container.querySelector<HTMLSelectElement>('select[aria-label="Vincular Review a una propuesta"]')!;
      await act(async () => {
        const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!;
        setter.call(select, "proposal-1");
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await act(async () => container.querySelector<HTMLFormElement>(".review-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
      expect(onQueue).toHaveBeenLastCalledWith({ owner: "fixture-student", repo: "expo-app", commitSha: "a".repeat(40), linkedProposalId: "proposal-1" });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });

  it("loads the persisted history and submits only the current delivery manually", async () => {
    Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
    const container = document.createElement("div");
    document.body.append(container);
    const root = createRoot(container);
    const onQueue = vi.fn(async () => actions.onQueue());
    const onRetry = vi.fn(async () => actions.onRetry());
    const onLoadDeliveryHistory = vi.fn(async () => ({ ok: true as const, data: {
      proposalId: "proposal-1", assignmentVersionId: "mission-v1", nextDeliverableId: "delivery-2", deliveries: [
        { deliverable: { id: "delivery-1", order: 1, title: "Propuesta", type: "proposal" as const, requirements: ["Definir alcance"], criterionIds: ["criterion-1"] }, status: "completed" as const,
          attempts: [
            { reviewId: "review-failed", commitSha: "c".repeat(40), status: "failed" as const, createdAt: "2026-11-24T11:00:00.000Z", updatedAt: "2026-11-24T11:00:00.000Z" },
            { reviewId: "review-1", commitSha: "a".repeat(40), status: "completed" as const, createdAt: "2026-11-24T12:00:00.000Z", updatedAt: "2026-11-24T12:00:00.000Z" },
          ] },
        { deliverable: { id: "delivery-2", order: 2, title: "Avance", type: "progress" as const, requirements: ["Implementar rutas"], criterionIds: ["criterion-1"] }, status: "not_started" as const, attempts: [] },
      ],
    } }));
    const linkedProposal = { id: "proposal-1", proposal: { title: "Rutas de Expo" }, assignmentVersionId: "mission-v1",
      assignmentContext: { assignmentVersionId: "mission-v1", mentorContext: { version: 2, config: { theme: "Programación móvil" } } } } as never;
    try {
      await act(async () => root.render(<ReviewScreen {...actions} onQueue={onQueue} onRetry={onRetry} linkedProposals={[linkedProposal]} onLoadDeliveryHistory={onLoadDeliveryHistory} onBack={vi.fn()} />));
      const select = container.querySelector<HTMLSelectElement>('select[aria-label="Vincular Review a una propuesta"]')!;
      await act(async () => {
        Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")!.set!.call(select, "proposal-1");
        select.dispatchEvent(new Event("change", { bubbles: true }));
      });
      expect(container.textContent).toContain("Siguiente entrega");
      expect(container.textContent).toContain("Commit");
      expect(actions.onRefresh).toHaveBeenCalledWith("review-1");
      expect(container.textContent).toContain("84/100");
      const retry = [...container.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Reintentar esta Review"));
      expect(retry).toBeDefined();
      await act(async () => retry?.click());
      expect(onRetry).toHaveBeenCalledWith("review-failed");
      const inputs = [...container.querySelectorAll<HTMLInputElement>(".review-form input")];
      const setInput = (input: HTMLInputElement, value: string) => {
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(input, value);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      await act(async () => {
        setInput(inputs[0]!, "fixture-student"); setInput(inputs[1]!, "expo-app"); setInput(inputs[2]!, "b".repeat(40));
        container.querySelector<HTMLFormElement>(".review-form")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      });
      expect(onLoadDeliveryHistory).toHaveBeenCalledWith("proposal-1");
      expect(onQueue).toHaveBeenCalledWith({ owner: "fixture-student", repo: "expo-app", commitSha: "b".repeat(40), linkedProposalId: "proposal-1", assignmentDeliverableId: "delivery-2" });
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});
