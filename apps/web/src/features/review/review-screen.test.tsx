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

  it("shows only the score and evidence-backed findings from a completed response", () => {
    const html = renderToStaticMarkup(<ReviewScreen {...actions} initialReview={{ status: "success", data: completed }} onBack={vi.fn()} />);

    expect(html).toContain("84/100");
    expect(html).toContain("El punto de entrada conecta los módulos principales.");
    expect(html).toContain("src/main.ts:3–9");
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
});
