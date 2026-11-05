import { createHash, randomBytes } from "node:crypto";
import { AiAnalysisSchema, CreateProposalRequestSchema, SubmissionSnapshotSchema, type AiAnalysis, type GalleryEntry, type SubmissionSnapshot } from "@fragments/contracts";

export type Proposal = ReturnType<typeof CreateProposalRequestSchema.parse>;

export type Similarity = { galleryId?: string; title: string; overlap: string; similarity: number };
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

const stopWords = new Set("a al algo algunas algunos ante antes como con contra cual cuando de del desde donde durante e el ella en entre era es esa ese eso esta estaba estas este esto estos fue ha hasta hay la las le les lo los mas me mi mucho muy ni no nos o para pero por porque que se sin sobre su sus te tu un una unas uno unos y ya proyecto propuesta problema solucion objetivos habilidades alcance restricciones".split(" "));
const conceptGroups = [
  ["cultivo", "huerto", "jardin", "cultivo", "planta", "plantas", "siembra", "riego", "regar"],
  ["medicion", "medir", "medida", "medidas", "registro", "registrar", "seguimiento", "crecimiento", "monitoreo"],
  ["aula", "aula", "escuela", "escolar", "curso", "clase", "estudiante", "estudiantes", "estudiant", "alumno"],
  ["audio", "audio", "musica", "cancion", "canciones", "sonido", "reproducir", "lista"],
];
const conceptByTerm = new Map(conceptGroups.flatMap(([concept, ...members]) => members.map((member) => [member, concept] as const)));

function normalizeTerm(term: string): string {
  const normalized = term.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (normalized.length > 6 && normalized.endsWith("ciones")) return `${normalized.slice(0, -6)}cion`;
  if (normalized.length > 5 && normalized.endsWith("ando")) return normalized.slice(0, -4);
  if (normalized.length > 5 && normalized.endsWith("iendo")) return normalized.slice(0, -5);
  if (normalized.length > 4 && normalized.endsWith("es")) return normalized.slice(0, -2);
  if (normalized.length > 3 && normalized.endsWith("s")) return normalized.slice(0, -1);
  return normalized;
}

function terms(text: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const raw of text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []) {
    const normalized = normalizeTerm(raw);
    const term = conceptByTerm.get(normalized) ?? normalized;
    if (term.length < 3 || stopWords.has(term)) continue;
    counts.set(term, (counts.get(term) ?? 0) + 1);
  }
  return counts;
}

function proposalText(proposal: Proposal): string {
  return [proposal.title, proposal.problem, proposal.solution, ...proposal.goals, ...proposal.skills, proposal.scope, ...proposal.constraints].join(" ");
}

function galleryText(entry: GalleryEntry): string {
  return [entry.title, entry.summary, ...entry.skills, ...entry.tags].join(" ");
}

function compareGallery(proposal: Proposal, entries: GalleryEntry[]): Similarity[] {
  const query = terms(proposalText(proposal));
  const candidates = entries.map((entry) => {
    const document = terms(galleryText(entry));
    const overlap = [...query.keys()].filter((term) => document.has(term));
    const dot = overlap.reduce((total, term) => total + query.get(term)! * document.get(term)!, 0);
    const queryNorm = Math.sqrt([...query.values()].reduce((sum, value) => sum + value * value, 0));
    const documentNorm = Math.sqrt([...document.values()].reduce((sum, value) => sum + value * value, 0));
    const score = queryNorm && documentNorm ? dot / (queryNorm * documentNorm) : 0;
    return { galleryId: entry.id, title: entry.title, overlap, similarity: score };
  });
  return candidates.filter((item) => item.similarity >= 0.12 && item.overlap.length > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 20)
    .map((item) => ({
      galleryId: item.galleryId,
      title: item.title,
      overlap: `Comparte temas clave: ${item.overlap.slice(0, 3).join(", ")}.`,
      similarity: Number(item.similarity.toFixed(4)),
    }));
}

export function createMentorService(options: Options) {
  const now = options.now ?? (() => new Date());
  const token = options.token ?? (() => randomBytes(24).toString("base64url"));

  return {
    async evaluate(rawProposal: unknown, galleryEntries: GalleryEntry[] = []): Promise<MentorEvaluation> {
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
      return deepFreeze({ analysis, guidance: [...result.guidance], similarities: compareGallery(proposal, galleryEntries) });
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
