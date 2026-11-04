import { createHash, randomBytes } from "node:crypto";
import { AiAnalysisSchema, SubmissionSnapshotSchema, type AiAnalysis, type SubmissionSnapshot } from "../../../../../packages/contracts/src/index.js";

export type Proposal = {
  title: string;
  problem: string;
  audience: string;
  solution: string;
  skills: string[];
  scope: string;
};

export type Similarity = { title: string; overlap: string; similarity: number };
export type MentorEvaluation = {
  analysis: AiAnalysis;
  guidance: string[];
  similarities: Similarity[];
};

export interface MentorEvaluator {
  evaluate(input: { proposal: Proposal; proposalDigest: string }): Promise<{
    rubricVersion: string;
    score: number;
    findings: AiAnalysis["findings"];
    limitations: string[];
    modelId: string;
    inputDigest: string;
    guidance: string[];
    similarities: Similarity[];
  }>;
}

export interface PdfRenderer {
  readonly version: string;
  render(input: { submission: SubmissionSnapshot; proposal: Proposal }): Promise<Uint8Array>;
}

type Options = {
  evaluator: MentorEvaluator;
  pdf: PdfRenderer;
  now?: () => Date;
  token?: () => string;
};

export class MentorInputError extends Error {
  readonly code = "INVALID_PROPOSAL";
  constructor(message: string) { super(message); this.name = "MentorInputError"; }
}

const fields = ["title", "problem", "audience", "solution", "skills", "scope"] as const;

function validateProposal(value: unknown): Proposal {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new MentorInputError("Revisa los campos: title, problem, audience, solution, skills y scope.");
  }
  const input = value as Record<string, unknown>;
  const invalid = fields.filter((field) => {
    const item = input[field];
    if (field === "skills") return !Array.isArray(item) || item.length < 1 || item.length > 12 || item.some((s) => typeof s !== "string" || !s.trim() || s.length > 80);
    return typeof item !== "string" || !item.trim() || item.length > 1200;
  });
  if (invalid.length) throw new MentorInputError(`Corrige estos campos: ${invalid.join(", ")}.`);
  return {
    title: (input.title as string).trim(),
    problem: (input.problem as string).trim(),
    audience: (input.audience as string).trim(),
    solution: (input.solution as string).trim(),
    skills: (input.skills as string[]).map((s) => s.trim()),
    scope: (input.scope as string).trim(),
  };
}

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => `${JSON.stringify(key)}:${canonical(child)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string { return createHash("sha256").update(canonical(value)).digest("hex"); }

function verifyIntegrity(snapshot: SubmissionSnapshot): void {
  if (digest(snapshot.snapshotJson) !== snapshot.contentHash) throw new Error("El snapshot no supera la verificación de integridad.");
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
  }
  return value;
}

export function createMentorService(options: Options) {
  const now = options.now ?? (() => new Date());
  const token = options.token ?? (() => randomBytes(24).toString("base64url"));

  return {
    async evaluate(rawProposal: unknown): Promise<MentorEvaluation> {
      const proposal = validateProposal(rawProposal);
      const proposalDigest = digest(proposal);
      const result = await options.evaluator.evaluate({ proposal, proposalDigest });
      if (result.inputDigest !== proposalDigest) throw new Error("El evaluador devolvió un digest que no corresponde a la propuesta.");
      const analysis = AiAnalysisSchema.parse({
        rubricVersion: result.rubricVersion,
        score: result.score,
        findings: result.findings,
        limitations: result.limitations,
        modelId: result.modelId,
        inputDigest: result.inputDigest,
      });
      const similarities = result.similarities.map((item) => {
        if (!item.title.trim() || !item.overlap.trim() || !Number.isFinite(item.similarity) || item.similarity < 0 || item.similarity > 1) {
          throw new Error("El evaluador devolvió una comparación inválida.");
        }
        return { title: item.title.trim(), overlap: item.overlap.trim(), similarity: item.similarity };
      });
      if (result.guidance.some((line) => !line.trim())) throw new Error("El evaluador devolvió una guía inválida.");
      return deepFreeze({ analysis, guidance: [...result.guidance], similarities });
    },

    async createSubmission(input: { sourceId: string; proposal: unknown; evaluation: MentorEvaluation }): Promise<SubmissionSnapshot> {
      const proposal = validateProposal(input.proposal);
      if (!input.sourceId.trim() || input.sourceId.length > 160) throw new MentorInputError("Indica un identificador válido para la propuesta.");
      const createdAt = now().toISOString();
      const snapshotJson = {
        proposal,
        analysis: input.evaluation.analysis,
        guidance: input.evaluation.guidance,
        similarities: input.evaluation.similarities,
        pdfRendererVersion: options.pdf.version,
      };
      const snapshot = {
        kind: "mentor" as const,
        sourceId: input.sourceId.trim(),
        score: input.evaluation.analysis.score,
        snapshotJson,
        contentHash: digest(snapshotJson),
        verificationCode: token(),
        rubricVersion: input.evaluation.analysis.rubricVersion,
        createdAt,
      };
      const valid = SubmissionSnapshotSchema.parse(snapshot);
      return deepFreeze(valid);
    },

    renderReadme(submission: SubmissionSnapshot): string {
      const snapshot = SubmissionSnapshotSchema.parse(submission);
      verifyIntegrity(snapshot);
      const proposal = snapshot.snapshotJson.proposal as Proposal;
      return [
        `# ${proposal.title}`, "", `## Problema\n${proposal.problem}`, "",
        `## Público\n${proposal.audience}`, "", `## Solución\n${proposal.solution}`, "",
        `## Habilidades\n${proposal.skills.map((skill) => `- ${skill}`).join("\n")}`, "",
        `## Alcance inicial\n${proposal.scope}`, "",
      ].join("\n");
    },

    async renderPdf(submission: SubmissionSnapshot): Promise<Uint8Array> {
      const snapshot = SubmissionSnapshotSchema.parse(submission);
      verifyIntegrity(snapshot);
      const proposal = validateProposal(snapshot.snapshotJson.proposal);
      return options.pdf.render({ submission: snapshot, proposal });
    },
  };
}
