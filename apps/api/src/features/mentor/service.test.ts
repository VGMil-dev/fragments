import { describe, expect, it } from "vitest";
import { AiAnalysisSchema, SubmissionSnapshotSchema } from "@fragments/contracts";
import { createMentorService, type MentorEvaluator, type PdfRenderer, type Proposal } from "./service.js";
import { createMinimalPdfRenderer } from "./local-fakes.js";

const proposal: Proposal = {
  title: "Huerto escolar",
  problem: "Registrar plantas",
  solution: "Una bitacora de riego",
  goals: ["Registrar riego y crecimiento"],
  skills: ["TypeScript"],
  scope: "MVP: alta y consulta de plantas",
  constraints: ["Funciona sin conexión"],
};

const fakeEvaluator: MentorEvaluator = {
  async evaluate(input) {
    return {
      findings: input.config.criteria.map((criterion) => ({
        criterionId: criterion.id,
        status: "verified" as const,
        evidence: [{ source: "proposal", field: "scope", digest: input.proposalDigest }],
        reason: "El alcance inicial se puede demostrar.",
        guidanceLevel: 1,
      })),
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
      message: expect.stringContaining("título"),
    });
  });

  it("uses a typed evaluator and validates shared findings", async () => {
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: fakePdf });
    const result = await service.evaluate(proposal);
    expect(AiAnalysisSchema.safeParse(result.analysis).success).toBe(true);
    expect(result.analysis.score).toBe(100);
    expect(result.similarities).toEqual([]);
    expect(result.guidance).toHaveLength(1);
  });

  it("passes the full effective assignment context to the evaluator", async () => {
    let receivedRequirements = 0;
    const evaluator: MentorEvaluator = {
      async evaluate(input) {
        receivedRequirements = input.config.requirements.length;
        return fakeEvaluator.evaluate(input);
      },
    };
    const config = {
      subject: "Programación móvil", theme: "Misión", assignment: "Desarrolla la tarea.",
      requirements: Array.from({ length: 72 }, (_, index) => `Criterio ${index + 1}`),
      expectedLevel: "Bachillerato", rubricTitle: "Rúbrica F11",
      criteria: [{ id: "criterion-a", title: "Evidencia", description: "Señales comprobables", weight: 100 }],
    };

    await createMentorService({ evaluator, pdf: fakePdf }).evaluate(proposal, [], { config, version: 3 });

    expect(receivedRequirements).toBe(72);
  });

  it("omits internal classroom and skill IDs from evaluator input and delivery snapshots", async () => {
    let evaluatorProposal: unknown;
    const evaluator: MentorEvaluator = {
      async evaluate(input) {
        evaluatorProposal = input.proposal;
        return fakeEvaluator.evaluate(input);
      },
    };
    const linkedProposal = { ...proposal, mentorSkills: { classroomId: "class-fixture-a", selectedSkillIds: ["skill-fixture-a"] } };
    const service = createMentorService({ evaluator, pdf: fakePdf });
    const evaluation = await service.evaluate(linkedProposal);
    expect(evaluatorProposal).not.toHaveProperty("mentorSkills");
    const submission = await service.createSubmission({ sourceId: "proposal-linked", proposal: linkedProposal, evaluation });
    expect(submission.snapshotJson.proposal).not.toHaveProperty("mentorSkills");
  });

  it("ranks opt-in gallery proposals by normalized topic similarity", async () => {
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: fakePdf });
    const result = await service.evaluate(proposal, [
      { id: "garden", title: "Cultivo en aula", summary: "Medición del crecimiento", skills: ["TypeScript"], tags: ["agricultura"], estimatedMinutes: 90 },
      { id: "music", title: "Lista de música", summary: "Reproducir canciones favoritas", skills: ["Audio"], tags: ["música"] },
    ]);
    expect(result.similarities[0]).toMatchObject({ galleryId: "garden", title: "Cultivo en aula" });
    expect(result.similarities[0]?.similarity).toBeGreaterThan(0.1);
    expect(result.similarities.some((match) => match.galleryId === "music")).toBe(false);
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
    const minimalPdf = createMinimalPdfRenderer();
    const pdf: PdfRenderer = { ...minimalPdf, async render(input) { pdfCalls++; return minimalPdf.render(input); } };
    const service = createMentorService({ evaluator: fakeEvaluator, pdf });
    const detailedProposal = { ...proposal, technologies: ["TypeScript", "SQLite"], expectedOutcome: "Prototipo verificable para registrar cambios." };
    const evaluation = await service.evaluate(detailedProposal);
    const submission = await service.createSubmission({ sourceId: "proposal-1", proposal: detailedProposal, evaluation });
    expect(pdfCalls).toBe(0);
    const readme = service.renderReadme(submission);
    expect(readme).toContain("# Huerto escolar");
    expect(readme).toContain("- TypeScript\n- SQLite");
    expect(readme).toContain("Prototipo verificable para registrar cambios.");
    expect(readme).not.toContain("100");
    const pdfBytes = await service.renderPdf(submission);
    expect(pdfBytes.byteLength).toBeGreaterThan(0);
    const pdfText = new TextDecoder().decode(pdfBytes);
    expect(pdfText).toContain("Tecnologias previstas");
    expect(pdfText).toContain("- TypeScript");
    expect(pdfText).toContain("Resultado esperado");
    expect(pdfText).toContain("Prototipo verificable para registrar cambios.");
    expect(pdfCalls).toBe(1);
  });

  it("preserves the tail of long proposal fields in the PDF", async () => {
    const longProblem = `${"A".repeat(88)}${"B".repeat(25)}`;
    const detailedProposal = { ...proposal, problem: longProblem };
    const service = createMentorService({ evaluator: fakeEvaluator, pdf: createMinimalPdfRenderer() });
    const evaluation = await service.evaluate(detailedProposal);
    const submission = await service.createSubmission({ sourceId: "proposal-long-field", proposal: detailedProposal, evaluation });

    const pdf = new TextDecoder().decode(await service.renderPdf(submission));

    expect(pdf.match(/A{88}/g)).toHaveLength(1);
    expect(pdf.match(/B{25}/g)).toHaveLength(1);
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
