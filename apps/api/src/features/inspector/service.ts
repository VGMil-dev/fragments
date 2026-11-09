import {
  AiAnalysisSchema,
  EvidenceReferenceSchema,
  InspectorDefenseRecordRequestSchema,
  InspectorChallengePublicSchema,
  InspectorChallengeSchema,
  InspectorStudentChallengeResponseSchema,
  RepositorySnapshotSchema,
  type AiAnalysis,
  type EvidenceReference,
  type InspectorChallenge,
  type InspectorChallengePublic,
  type RepositorySnapshot,
} from "@fragments/contracts";

export type ReviewEvidence = {
  id: string;
  projectId: string;
  commitSha: string;
  owner?: string;
  repo?: string;
  snapshot: RepositorySnapshot;
  analysis: AiAnalysis;
};

export type ChallengeDraft = Pick<
  InspectorChallenge,
  "precondition" | "mutation" | "demonstration" | "restoration" | "estimatedMinutes" | "teacherHint"
>;

export type InspectorStatus = "pending" | "assigned" | "completed" | "obsolete";

export type DefenseRecord = {
  mutationObserved: boolean;
  restorationConfirmed: boolean;
  notes: string;
  recordedAt: string;
};

export type InspectorRecord = {
  id: string;
  reviewId: string;
  projectId: string;
  commitSha: string;
  challenge: InspectorChallenge;
  status: InspectorStatus;
  createdAt: string;
  assignedTo?: string;
  assignedAt?: string;
  supersededByCommitSha?: string;
  defense?: DefenseRecord;
};

export interface InspectorStore {
  create(record: InspectorRecord): Promise<InspectorRecord>;
  get(id: string): Promise<InspectorRecord | null>;
  listByReview(reviewId: string): Promise<InspectorRecord[]>;
  update(record: InspectorRecord): Promise<InspectorRecord>;
}

export interface InspectorDependencies {
  reviews: {
    getById(id: string): Promise<ReviewEvidence | null>;
    getLatestCommit(projectId: string): Promise<string | null>;
  };
  provider: {
    createChallenge(input: {
      reviewId: string;
      commitSha: string;
      evidence: EvidenceReference;
      findingReason: string;
      evidenceExcerpt: string;
      practicedFeatures?: string[];
    }): Promise<ChallengeDraft>;
  };
  practicedFeatures?: (reviewId: string) => Promise<string[]>;
  store: InspectorStore;
  now?: () => Date;
  createId?: () => string;
}

export class InspectorError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = "InspectorError";
  }
}

const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/;
const commitPattern = /^(?:[a-f\d]{40}|[a-f\d]{64})$/i;

function isIdentifier(value: string): boolean { return identifierPattern.test(value); }

function error(code: string, message: string): InspectorError {
  return new InspectorError(code, message);
}

function verifiedEvidence(review: ReviewEvidence): { evidence: EvidenceReference; findingReason: string; evidenceExcerpt: string } {
  const snapshot = RepositorySnapshotSchema.safeParse(review.snapshot);
  const analysis = AiAnalysisSchema.safeParse(review.analysis);
  if (!snapshot.success || !analysis.success
    || snapshot.data.commitSha.toLowerCase() !== review.commitSha.toLowerCase()
    || (review.owner !== undefined && snapshot.data.owner.toLowerCase() !== review.owner.toLowerCase())
    || (review.repo !== undefined && snapshot.data.repo.toLowerCase() !== review.repo.toLowerCase())) {
    throw error("INVALID_REVIEW_EVIDENCE", "No se pudo validar la evidencia del commit revisado.");
  }

  const paths = new Set<string>();
  for (const file of snapshot.data.files) {
    if (paths.has(file.path)) throw error("INVALID_REVIEW_EVIDENCE", "El snapshot contiene rutas repetidas.");
    paths.add(file.path);
  }
  const calculatedDigest = snapshot.data.digest;

  for (const finding of analysis.data.findings) {
    if (finding.status !== "verified") continue;
    for (const evidence of finding.evidence) {
      if (evidence.source !== "repository") continue;
      if (!EvidenceReferenceSchema.safeParse(evidence).success || evidence.digest !== calculatedDigest) {
        throw error("INVALID_REVIEW_EVIDENCE", "La evidencia no coincide con la huella del snapshot.");
      }
      const file = snapshot.data.files.find((candidate) => candidate.path === evidence.path);
      const [start, end] = evidence.lines;
      if (!file) throw error("INVALID_REVIEW_EVIDENCE", "La evidencia cita una ruta que no existe en el commit.");
      if (file.content.length === 0) throw error("INVALID_REVIEW_EVIDENCE", "La evidencia cita líneas fuera del archivo.");
      const sourceLines = file.content.split(/\r?\n/);
      if (/\r?\n$/.test(file.content)) sourceLines.pop();
      if (start > sourceLines.length || end > sourceLines.length) {
        throw error("INVALID_REVIEW_EVIDENCE", "La evidencia cita líneas fuera del archivo.");
      }
      if (end - start > 49) throw error("INVALID_REVIEW_EVIDENCE", "La evidencia seleccionada es demasiado amplia para crear un reto seguro.");
      const excerpt = sourceLines.slice(start - 1, end).map((line, index) => `${start + index}: ${line}`).join("\n");
      if (!excerpt || new TextEncoder().encode(excerpt).byteLength > 4_000) throw error("INVALID_REVIEW_EVIDENCE", "La evidencia seleccionada supera el tamaño seguro para crear un reto.");
      return { evidence, findingReason: finding.reason, evidenceExcerpt: `${evidence.path}\n${excerpt}` };
    }
  }
  throw error("NO_VERIFIED_EVIDENCE", "La revisión no tiene evidencia verificada para crear un reto.");
}

function validateTeacherId(teacherId: string): void {
  if (!isIdentifier(teacherId)) throw error("INVALID_TEACHER", "La sesión docente no es válida.");
}

function validateDefense(value: unknown): Omit<DefenseRecord, "recordedAt"> {
  const parsed = InspectorDefenseRecordRequestSchema.safeParse(value);
  if (!parsed.success) throw error("INVALID_DEFENSE_RECORD", "Registra solo el resultado de mutación, restauración y notas sin datos privados.");
  return parsed.data;
}

export function createInspectorService(dependencies: InspectorDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const createId = dependencies.createId ?? (() => crypto.randomUUID());

  async function requireRecord(id: string): Promise<InspectorRecord> {
    if (!isIdentifier(id)) throw error("INVALID_CHALLENGE_ID", "Indica un reto válido.");
    const record = await dependencies.store.get(id);
    if (!record) throw error("CHALLENGE_NOT_FOUND", "No se encontró el reto.");
    return record;
  }

  async function requireReview(reviewId: string): Promise<ReviewEvidence> {
    if (!isIdentifier(reviewId)) throw error("INVALID_REVIEW_ID", "Indica una revisión válida.");
    const review = await dependencies.reviews.getById(reviewId);
    if (!review) throw error("REVIEW_NOT_FOUND", "No se encontró la revisión.");
    if (!commitPattern.test(review.commitSha)) throw error("INVALID_REVIEW_EVIDENCE", "No se pudo validar la evidencia del commit revisado.");
    return review;
  }

  return {
    async createChallenge(reviewId: string): Promise<InspectorRecord> {
      const review = await requireReview(reviewId);
      const latestCommit = await dependencies.reviews.getLatestCommit(review.projectId);
      if (!latestCommit || latestCommit.toLowerCase() !== review.commitSha.toLowerCase()) {
        await this.reconcileCommit(review.id);
        throw error("REVIEW_STALE", "El proyecto tiene un commit nuevo. Usa la revisión más reciente.");
      }
      const { evidence, findingReason, evidenceExcerpt } = verifiedEvidence(review);
      const practicedFeatures = (await dependencies.practicedFeatures?.(review.id) ?? []).slice(0, 20).map((feature) => feature.slice(0, 300));
      const draft = await dependencies.provider.createChallenge({
        reviewId: review.id,
        commitSha: review.commitSha,
        evidence,
        findingReason,
        evidenceExcerpt,
        practicedFeatures,
      });
      const challenge = InspectorChallengeSchema.parse({
        evaluationId: review.id,
        sourceEvidence: [evidence],
        ...draft,
      });
      const record: InspectorRecord = {
        id: createId(),
        reviewId: review.id,
        projectId: review.projectId,
        commitSha: review.commitSha,
        challenge,
        status: "pending",
        createdAt: now().toISOString(),
      };
      return dependencies.store.create(record);
    },

    async listForTeacher(reviewId: string): Promise<InspectorRecord[]> {
      const review = await requireReview(reviewId);
      await this.reconcileCommit(reviewId);
      const records = await dependencies.store.listByReview(reviewId);
      const normalized = await Promise.all(records.map((record) => record.projectId === review.projectId
        ? record
        : dependencies.store.update({ ...record, projectId: review.projectId })));
      return normalized.map((record) => ({
        ...record,
        challenge: InspectorChallengeSchema.parse(record.challenge),
      })).sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    },

    async getStudentChallenge(id: string): Promise<{ id: string; status: "assigned" | "completed"; challenge: InspectorChallengePublic }> {
      const record = await requireRecord(id);
      if (record.status !== "assigned" && record.status !== "completed") {
        throw error("CHALLENGE_NOT_ASSIGNED", "El reto todavía no está disponible para el estudiante.");
      }
      const { teacherHint: _privateHint, ...publicChallenge } = InspectorChallengeSchema.parse(record.challenge);
      return InspectorStudentChallengeResponseSchema.parse({
        id: record.id,
        status: record.status,
        challenge: InspectorChallengePublicSchema.parse(publicChallenge),
      });
    },

    async assignChallenge(id: string, teacherId: string): Promise<InspectorRecord> {
      validateTeacherId(teacherId);
      const record = await requireRecord(id);
      const latestCommit = await dependencies.reviews.getLatestCommit(record.projectId);
      if (!latestCommit) throw error("REVIEW_NOT_FOUND", "No se encontró la revisión.");
      if (latestCommit.toLowerCase() !== record.commitSha.toLowerCase()) {
        await this.reconcileCommit(record.reviewId);
        throw error("REVIEW_STALE", "El reto pertenece a un commit anterior y no se puede asignar.");
      }
      if (record.status !== "pending") throw error("CHALLENGE_NOT_PENDING", "Solo se puede asignar un reto pendiente.");
      return dependencies.store.update({ ...record, status: "assigned", assignedTo: teacherId, assignedAt: now().toISOString() });
    },

    async recordDefense(id: string, teacherId: string, raw: unknown): Promise<InspectorRecord> {
      validateTeacherId(teacherId);
      const record = await requireRecord(id);
      if (record.status !== "assigned") throw error("CHALLENGE_NOT_ASSIGNED", "Asigna el reto antes de registrar la defensa.");
      if (record.assignedTo !== teacherId) throw error("TEACHER_MISMATCH", "Solo la persona docente que asignó el reto puede registrar el resultado.");
      const defense = validateDefense(raw);
      return dependencies.store.update({
        ...record,
        status: "completed",
        defense: { ...defense, recordedAt: now().toISOString() },
      });
    },

    async reconcileCommit(reviewId: string): Promise<InspectorRecord[]> {
      const review = await requireReview(reviewId);
      const latestCommit = await dependencies.reviews.getLatestCommit(review.projectId);
      if (!latestCommit || latestCommit.toLowerCase() === review.commitSha.toLowerCase()) {
        return dependencies.store.listByReview(reviewId);
      }
      const records = await dependencies.store.listByReview(reviewId);
      const updated: InspectorRecord[] = [];
      for (const record of records) {
        if (record.status === "pending") {
          updated.push(await dependencies.store.update({ ...record, status: "obsolete", supersededByCommitSha: latestCommit }));
        } else if (record.status === "assigned" && record.supersededByCommitSha !== latestCommit) {
          updated.push(await dependencies.store.update({ ...record, supersededByCommitSha: latestCommit }));
        } else {
          updated.push(record);
        }
      }
      return updated;
    },
  };
}

export function createInMemoryInspectorStore(): InspectorStore {
  const records = new Map<string, InspectorRecord>();
  return {
    async create(record) {
      records.set(record.id, structuredClone(record));
      return structuredClone(record);
    },
    async get(id) {
      const record = records.get(id);
      return record ? structuredClone(record) : null;
    },
    async listByReview(reviewId) {
      return [...records.values()].filter((record) => record.reviewId === reviewId).map((record) => structuredClone(record));
    },
    async update(record) {
      records.set(record.id, structuredClone(record));
      return structuredClone(record);
    },
  };
}
