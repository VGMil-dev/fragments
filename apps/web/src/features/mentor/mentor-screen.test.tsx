import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { MentorScreen } from "./mentor-screen";

const proposal = {
  id: "proposal-1",
  version: 1,
  proposal: {
    title: "Diario de plantas",
    problem: "No registro los cambios del jardín.",
    solution: "Anotar observaciones por fecha.",
    goals: ["Guardar una observación"],
    skills: ["HTML"],
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
  onSave: vi.fn(async () => ({ ok: true as const, data: proposal })),
  onEvaluate: vi.fn(async () => ({ ok: true as const, data: evaluation })),
  onGenerateSubmission: vi.fn(async () => ({ ok: false as const, error: { code: "TEST", message: "hidden" } })),
  onReadme: vi.fn(async () => ({ ok: true as const, data: "# README" })),
  onPdf: vi.fn(async () => ({ ok: true as const, data: new Blob(["pdf"]) })),
};

describe("MentorScreen", () => {
  it("starts with a validated proposal form and no invented evaluation", () => {
    const html = renderToStaticMarkup(
      <MentorScreen {...actions} onBack={vi.fn()} />,
    );

    expect(html).toContain("Tu idea toma forma");
    expect(html).toContain("Guardar propuesta");
    expect(html).not.toContain("72/100");
    expect(html).not.toContain("scope necesita");
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
});
