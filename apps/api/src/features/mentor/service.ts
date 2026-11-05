import { createHash, randomBytes } from "node:crypto";
import { AiAnalysisSchema, CreateProposalRequestSchema, SubmissionSnapshotSchema, type AiAnalysis, type SubmissionSnapshot } from "@fragments/contracts";

export type Proposal = ReturnType<typeof CreateProposalRequestSchema.parse>;

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

function validateProposal(value: unknown): Proposal {
  const parsed = CreateProposalRequestSchema.safeParse(value);
  if (!parsed.success) throw new MentorInputError("Revisa título, problema, solución, objetivos, habilidades, alcance y restricciones.");
  return parsed.data;
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
        `## Solución\n${proposal.solution}`, "",
        `## Objetivos\n${proposal.goals.map((goal) => `- ${goal}`).join("\n")}`, "",
        `## Habilidades\n${proposal.skills.map((skill) => `- ${skill}`).join("\n")}`, "",
        `## Alcance inicial\n${proposal.scope}`, "",
        `## Restricciones\n${proposal.constraints.map((constraint) => `- ${constraint}`).join("\n")}`, "",
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
