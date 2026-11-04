import { describe, expect, it } from "vitest";
import { AiAnalysisSchema, SubmissionSnapshotSchema } from "../../../../../packages/contracts/src/index.js";
import { createMentorService, type MentorEvaluator, type PdfRenderer, type Proposal } from "./service.js";

const proposal: Proposal = {
  title: "Huerto escolar",
  problem: "Registrar plantas",
  audience: "Estudiantes",
  solution: "Una bitacora de riego",
  skills: ["TypeScript"],
  scope: "MVP: alta y consulta de plantas",
};

const fakeEvaluator: MentorEvaluator = {
  async evaluate(input) {
    return {
      rubricVersion: "mentor-1",
      score: 82,
      findings: [{
        criterionId: "viability",
        status: "verified",
        evidence: [{ source: "proposal", field: "scope", digest: input.proposalDigest }],
        reason: "El alcance inicial se puede demostrar.",
        guidanceLevel: 1,
      }],
      limitations: [],
      modelId: "fake-mentor-v1",
      inputDigest: input.proposalDigest,
      guidance: ["¿Qué dato necesita cada planta?"],
      similarities: [{ title: "Jardin escolar", overlap: "Registro de plantas", similarity: 0.7 }],
    };
  },
};

const fakePdf: PdfRenderer = {
  version: "fake-pdf-1",
  async render(input) {
    return new TextEncoder().encode(`fake pdf: ${input.submission.contentHash}`);
  },
};

describe("Mentor service", () => {
  it("rejects invalid proposals with field-level safe guidance", async () => {
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: fakePdf });
    await expect(service.evaluate({ ...proposal, title: "  " })).rejects.toMatchObject({
      code: "INVALID_PROPOSAL",
      message: expect.stringContaining("title"),
    });
  });

  it("uses a typed evaluator for viability/similarity and validates shared findings", async () => {
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: fakePdf });
    const result = await service.evaluate(proposal);
    expect(AiAnalysisSchema.safeParse(result.analysis).success).toBe(true);
    expect(result.analysis.score).toBe(82);
    expect(result.similarities[0]?.title).toBe("Jardin escolar");
    expect(result.guidance).toHaveLength(1);
  });

  it("creates an immutable, reproducible contract snapshot with random lookup token", async () => {
    let second = 0;
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: fakePdf, now: () => new Date("2026-11-04T12:00:00.000Z"), token: () => `mentor-token-${++second}-abcdefghijklmnop` });
    const evaluated = await service.evaluate(proposal);
    const a = await service.createSubmission({ sourceId: "proposal-1", proposal, evaluation: evaluated });
    const b = await service.createSubmission({ sourceId: "proposal-1", proposal, evaluation: evaluated });
    expect(SubmissionSnapshotSchema.safeParse(a).success).toBe(true);
    expect(a.contentHash).toMatch(/^[a-f\d]{64}$/);
    expect(a.contentHash).toBe(b.contentHash);
    expect(a.verificationCode).not.toBe(b.verificationCode);
    expect(Object.isFrozen(a)).toBe(true);
    expect(Object.isFrozen(a.snapshotJson)).toBe(true);
  });

  it("renders README without score and PDF only on demand", async () => {
    let pdfCalls = 0;
    const pdf: PdfRenderer = { ...fakePdf, async render(input) { pdfCalls++; return fakePdf.render(input); } };
    const service = createMentorService({ evaluator: fakeEvaluator, pdf });
    const evaluation = await service.evaluate(proposal);
    const submission = await service.createSubmission({ sourceId: "proposal-1", proposal, evaluation });
    expect(pdfCalls).toBe(0);
    const readme = service.renderReadme(submission);
    expect(readme).toContain("# Huerto escolar");
    expect(readme).not.toContain("82");
    expect((await service.renderPdf(submission)).byteLength).toBeGreaterThan(0);
    expect(pdfCalls).toBe(1);
  });

  it("refuses to render when the snapshot JSON no longer matches its hash", async () => {
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: fakePdf });
    const evaluation = await service.evaluate(proposal);
    const submission = await service.createSubmission({ sourceId: "proposal-1", proposal, evaluation });
    const changed = { ...submission, snapshotJson: { ...submission.snapshotJson, proposal: { ...proposal, title: "Alterado" } } };
    expect(() => service.renderReadme(changed)).toThrow("integridad");
    await expect(service.renderPdf(changed)).rejects.toThrow("integridad");
  });
});
