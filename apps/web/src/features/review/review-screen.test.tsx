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
    expect(html).toContain("El punto de entrada conecta los módulos principales.");
    expect(html).toContain("src/main.ts:3–9");
    expect(html).toContain('href="/student/trainer"');
    expect(html).toContain("Practicar en Trainer");
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
    expect(html).toContain("Actualizar estado");
    expect(html).not.toContain("84/100");
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
});
