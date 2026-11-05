import {
  AiAnalysisSchema,
  ReviewRequestSchema,
  ReviewResponseSchema,
  RepositorySnapshotSchema,
  SubmissionResponseSchema,
  VerifySubmissionResponseSchema,
  type AiAnalysis,
  type FeedbackFinding,
  type RepositorySnapshot,
  type ReviewRequest,
  type ReviewResponse,
  type SubmissionSnapshot,
} from "@fragments/contracts";

export type ReviewContext = {
  projectId: string;
  rubricVersion: string;
  evaluatorVersion: string;
};
type SubmissionResponseData = ReturnType<typeof SubmissionResponseSchema.parse>;
export type PackedRepository = { text: string; inputDigest: string; tokenCount: number; omittedPaths?: string[] };
export type ReviewRecord = {
  id: string;
  key: string;
  projectId: string;
  owner: string;
  repo: string;
  commitSha: string;
  rubricVersion: string;
  evaluatorVersion: string;
  updatedAt: string;
  packedDigest: string;
  analysis: AiAnalysis;
};

export interface ReviewDependencies {
  repository: { getCommitSnapshot(input: Pick<ReviewRequest, "owner" | "repo" | "commitSha">): Promise<unknown> };
  packer: { pack(snapshot: RepositorySnapshot, budget: { maxBytes: number; maxTokens: number }): Promise<PackedRepository> };
  ai: { analyze(input: { packedText: string; rubricVersion: string; inputDigest: string }): Promise<unknown> };
  evaluations: {
    getByKey(key: string): Promise<ReviewRecord | null>;
    getById(id: string): Promise<ReviewRecord | null>;
    save(record: ReviewRecord): Promise<ReviewRecord>;
  };
  submissions: {
    save(snapshot: SubmissionResponseData): Promise<void>;
    getByVerificationCode(code: string): Promise<unknown | null>;
  };
  pdf: { render(report: string): Promise<Uint8Array> };
  now?: () => Date;
  createId?: () => string;
  createSubmissionId?: () => string;
  createVerificationCode?: () => string;
  maxBytes?: number;
  maxTokens?: number;
}

export async function sha256(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digestSnapshot(snapshot: Omit<RepositorySnapshot, "digest">): Promise<string> {
  return sha256(canonicalJson(snapshot));
}

async function keyFor(request: ReviewRequest, context: ReviewContext): Promise<string> {
  return sha256(canonicalJson({ projectId: context.projectId, commitSha: request.commitSha.toLowerCase(), rubricVersion: context.rubricVersion, evaluatorVersion: context.evaluatorVersion }));
}

function randomToken(bytes: number): string {
  const value = globalThis.crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function parseReviewRequest(value: unknown): ReviewRequest {
  const parsed = ReviewRequestSchema.safeParse(value);
  if (parsed.success) return { ...parsed.data, commitSha: parsed.data.commitSha.toLowerCase() };
  if (parsed.error.issues.some((issue) => issue.path.includes("commitSha"))) throw new Error("Indica el SHA completo del commit que quieres revisar.");
  throw new Error("Indica un propietario y repositorio de GitHub válidos.");
}

function parseReviewContext(value: unknown): ReviewContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Falta el contexto interno del proyecto.");
  const context = value as Record<string, unknown>;
  const { projectId, rubricVersion, evaluatorVersion } = context;
  if (typeof projectId !== "string" || !projectId.trim() || projectId.length > 128) throw new Error("Falta el contexto interno del proyecto.");
  if (typeof rubricVersion !== "string" || !rubricVersion.trim() || rubricVersion.length > 64) throw new Error("Falta la versión interna de rúbrica.");
  if (typeof evaluatorVersion !== "string" || !evaluatorVersion.trim() || evaluatorVersion.length > 64) throw new Error("Falta la versión interna del evaluador.");
  return { projectId: projectId.trim(), rubricVersion: rubricVersion.trim(), evaluatorVersion: evaluatorVersion.trim() };
}

function toPublicReviewResponse(record: ReviewRecord): ReviewResponse {
  return ReviewResponseSchema.parse({
    id: record.id, owner: record.owner, repo: record.repo, commitSha: record.commitSha,
    status: "completed", analysis: record.analysis, progress: 100, updatedAt: record.updatedAt,
  });
}

async function validateSnapshot(raw: unknown, request: ReviewRequest): Promise<RepositorySnapshot> {
  const snapshot = RepositorySnapshotSchema.parse(raw);
  if (snapshot.owner.toLowerCase() !== request.owner.toLowerCase() || snapshot.repo.toLowerCase() !== request.repo.toLowerCase()) {
    throw new Error("El proveedor devolvió un repositorio distinto al solicitado.");
  }
  if (snapshot.commitSha.toLowerCase() !== request.commitSha.toLowerCase()) {
    throw new Error("El proveedor devolvió un commit distinto al solicitado.");
  }
  const files = new Set<string>();
  let totalBytes = 0;
  for (const file of snapshot.files) {
    if (files.has(file.path)) throw new Error("El snapshot contiene rutas duplicadas.");
    files.add(file.path);
    totalBytes += new TextEncoder().encode(file.content).length;
    if (totalBytes > 2_000_000) throw new Error("El commit supera el límite de lectura de 2 MB.");
  }
  const { digest: _digest, ...content } = snapshot;
  if (snapshot.digest !== await digestSnapshot(content)) throw new Error("La huella del snapshot no coincide con su contenido.");
  return snapshot;
}

async function validateEvidence(analysis: AiAnalysis, snapshot: RepositorySnapshot, packedDigest: string): Promise<AiAnalysis> {
  if (analysis.inputDigest !== packedDigest) throw new Error("El análisis no corresponde al contenido enviado al proveedor.");
  for (const finding of analysis.findings) {
    for (const evidence of finding.evidence) {
      if (evidence.source !== "repository") throw new Error("La evidencia del análisis debe apuntar a un archivo del commit.");
      const file = snapshot.files.find((candidate) => candidate.path === evidence.path);
      if (!file) throw new Error("La evidencia cita un archivo que no está en el commit.");
      if (evidence.digest !== snapshot.digest) throw new Error("La evidencia no coincide con la huella del snapshot.");
      const lineCount = file.content.split(/\r?\n/).length;
      if (evidence.lines[1] > lineCount) throw new Error("La evidencia cita líneas fuera del archivo.");
      if (finding.file !== undefined && finding.file !== evidence.path) throw new Error("El archivo del hallazgo no coincide con su evidencia.");
      if (finding.lines !== undefined && (finding.lines[0] < evidence.lines[0] || finding.lines[1] > evidence.lines[1])) throw new Error("Las líneas del hallazgo exceden su evidencia.");
    }
  }
  return analysis;
}

export function createReviewService(dependencies: ReviewDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const id = dependencies.createId ?? (() => randomToken(12));
  const submissionId = dependencies.createSubmissionId ?? (() => randomToken(12));
  const verificationCode = dependencies.createVerificationCode ?? (() => randomToken(24));
  const maxBytes = dependencies.maxBytes ?? 100_000;
  const maxTokens = dependencies.maxTokens ?? 20_000;

  async function getRecord(reviewId: string): Promise<ReviewRecord> {
    const record = await dependencies.evaluations.getById(reviewId);
    if (!record) throw new Error("No se encontró el análisis solicitado.");
    return record;
  }

  return {
    async review(rawRequest: unknown, rawContext: unknown) {
      const request = parseReviewRequest(rawRequest);
      const context = parseReviewContext(rawContext);
      const key = await keyFor(request, context);
      const cached = await dependencies.evaluations.getByKey(key);
      if (cached) return toPublicReviewResponse(cached);

      const snapshot = await validateSnapshot(await dependencies.repository.getCommitSnapshot({ owner: request.owner, repo: request.repo, commitSha: request.commitSha }), request);
      const packed = await dependencies.packer.pack(snapshot, { maxBytes, maxTokens });
      if (new TextEncoder().encode(packed.text).length > maxBytes || packed.tokenCount > maxTokens) throw new Error("El contenido empaquetado supera el presupuesto de revisión.");
      if (await sha256(packed.text) !== packed.inputDigest) throw new Error("La huella del contenido empaquetado no coincide.");
      const analysis = await validateEvidence(AiAnalysisSchema.parse(await dependencies.ai.analyze({ packedText: packed.text, rubricVersion: context.rubricVersion, inputDigest: packed.inputDigest })), snapshot, packed.inputDigest);
      if (analysis.rubricVersion !== context.rubricVersion) throw new Error("El análisis devolvió una rúbrica distinta a la solicitada.");
      if (packed.omittedPaths?.length) analysis.limitations.push(`El presupuesto omitió ${packed.omittedPaths.length} archivo(s): ${packed.omittedPaths.slice(0, 20).join(", ")}${packed.omittedPaths.length > 20 ? ", …" : ""}.`);
      const record = await dependencies.evaluations.save({
        id: id(), key, projectId: context.projectId, owner: request.owner, repo: request.repo, commitSha: snapshot.commitSha,
        rubricVersion: context.rubricVersion, evaluatorVersion: context.evaluatorVersion,
        updatedAt: now().toISOString(), packedDigest: packed.inputDigest, analysis,
      });
      return toPublicReviewResponse(record);
    },

    getFeedback(reviewId: string, guidanceLevel: 1 | 2 | 3 | 4) {
      return getRecord(reviewId).then((record) => ({
        reviewId: record.id,
        commitSha: record.commitSha,
        score: record.analysis.score,
        findings: record.analysis.findings.filter((finding: FeedbackFinding) => finding.guidanceLevel <= guidanceLevel),
        limitations: record.analysis.limitations,
      }));
    },

    async createPdf(reviewId: string) {
      const record = await getRecord(reviewId);
      const code = verificationCode();
      const createdAt = now().toISOString();
      const snapshot = {
        kind: "review", sourceId: record.id, score: record.analysis.score,
        snapshotJson: { commitSha: record.commitSha, findings: record.analysis.findings, limitations: record.analysis.limitations, evaluatorVersion: record.evaluatorVersion },
        verificationCode: code, rubricVersion: record.rubricVersion, createdAt,
      } satisfies Omit<SubmissionSnapshot, "contentHash">;
      const submission = SubmissionResponseSchema.parse({
        ...snapshot,
        id: submissionId(),
        contentHash: await sha256(canonicalJson(snapshot)),
      });
      const text = ["Fragments · Informe de Review", `Commit: ${record.commitSha}`, `Puntaje orientativo: ${record.analysis.score}/100`, "", ...record.analysis.findings.flatMap((finding) => [
        `${finding.criterionId} (${finding.status}) — ${finding.reason}`,
        ...finding.evidence.map((reference) => reference.source === "repository" ? `Evidencia: ${reference.path}#L${reference.lines[0]}-L${reference.lines[1]}` : `Evidencia: ${reference.field}`),
      ]), ...record.analysis.limitations.map((limitation) => `Límite: ${limitation}`), "", `Verificación: ${code}`].join("\n");
      const bytes = await dependencies.pdf.render(text);
      await dependencies.submissions.save(submission);
      return { bytes, contentType: "application/pdf" as const, verificationCode: code, submission };
    },

    async verify(code: string) {
      if (!/^[A-Za-z0-9_-]{24,128}$/.test(code)) throw new Error("El código de verificación no es válido o no se encontró.");
      const rawSubmission = await dependencies.submissions.getByVerificationCode(code);
      if (!rawSubmission) throw new Error("El código de verificación no es válido o no se encontró.");
      const submission = SubmissionResponseSchema.parse(rawSubmission);
      const { id: _id, contentHash, ...snapshot } = submission;
      return VerifySubmissionResponseSchema.parse({
        kind: submission.kind,
        score: submission.score,
        rubricVersion: submission.rubricVersion,
        createdAt: submission.createdAt,
        integrityValid: await sha256(canonicalJson(snapshot)) === contentHash,
      });
    },
  };
}
