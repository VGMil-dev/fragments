import { randomUUID } from "node:crypto";
import { AiAnalysisSchema, EvidenceReferenceSchema, RepositorySnapshotSchema, type AiAnalysis } from "@fragments/contracts";
import type { InspectorReviewRecord } from "../inspector/review-adapter.js";
import type { ChallengeDraft, ReviewEvidence } from "../inspector/service.js";
import type { TrainerAttempt, TrainerChallenge, TrainerStatus } from "./repository.js";

export type TrainerReview = Pick<InspectorReviewRecord, "id" | "projectId" | "owner" | "repo" | "commitSha" | "analysis">;
export interface TrainerDependencies {
  reviews: {
    listCompleted(): Promise<Array<Pick<TrainerReview, "id" | "owner" | "repo" | "commitSha"> & { updatedAt: string }>>;
    getEvidence(id: string): Promise<ReviewEvidence | null>;
  };
  provider: { createChallenge(input: { reviewId: string; commitSha: string; evidence: { source: "repository"; path: string; lines: [number, number]; digest: string }; findingReason: string; evidenceExcerpt: string }): Promise<ChallengeDraft> };
  store: ReturnType<typeof import("./repository.js").createTrainerRepository>;
  now?: () => Date;
  random?: () => number;
  createId?: () => string;
}

export class TrainerError extends Error {
  constructor(readonly code: string, message: string) { super(message); this.name = "TrainerError"; }
}

function verifiedEvidence(review: ReviewEvidence) {
  const snapshot = RepositorySnapshotSchema.safeParse(review.snapshot);
  const analysis = AiAnalysisSchema.safeParse(review.analysis);
  if (!snapshot.success || !analysis.success || snapshot.data.commitSha.toLowerCase() !== review.commitSha.toLowerCase()) {
    throw new TrainerError("INVALID_REVIEW_EVIDENCE", "No se pudo validar la evidencia del commit revisado.");
  }
  const candidates: Array<{ evidence: Extract<AiAnalysis["findings"][number]["evidence"][number], { source: "repository" }>; findingReason: string; feature: string; excerpt: string }> = [];
  const seen = new Set<string>();
  for (const finding of analysis.data.findings) {
    if (finding.status !== "verified") continue;
    for (const ref of finding.evidence) {
      const evidence = EvidenceReferenceSchema.parse(ref);
      if (evidence.source !== "repository" || evidence.digest !== snapshot.data.digest) continue;
      const file = snapshot.data.files.find((entry) => entry.path === evidence.path);
      if (!file) continue;
      const [start, end] = evidence.lines;
      const lines = file.content.split(/\r?\n/);
      if (/\r?\n$/.test(file.content)) lines.pop();
      if (start < 1 || end < start || end > lines.length || end - start > 49) continue;
      const excerpt = lines.slice(start - 1, end).map((line, index) => `${start + index}: ${line}`).join("\n");
      if (!excerpt || new TextEncoder().encode(excerpt).byteLength > 4_000) continue;
      const feature = `${finding.criterionId}: ${finding.reason}`.slice(0, 1000);
      const key = feature.normalize("NFKC").toLocaleLowerCase("es").replace(/\W+/g, " ").trim();
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ evidence, findingReason: finding.reason, feature, excerpt: `${evidence.path}\n${excerpt}` });
      break;
    }
  }
  if (!candidates.length) throw new TrainerError("NO_VERIFIED_EVIDENCE", "La revisión no tiene evidencia verificada para crear un reto.");
  return candidates.slice(0, 5);
}

export function createTrainerService(dependencies: TrainerDependencies) {
  const now = dependencies.now ?? (() => new Date());
  const random = dependencies.random ?? Math.random;
  const createId = dependencies.createId ?? (() => randomUUID());
  const inFlight = new Map<string, Promise<TrainerChallenge[]>>();

  async function bankFor(reviewId: string): Promise<TrainerChallenge[]> {
    const review = await dependencies.reviews.getEvidence(reviewId);
    if (!review) throw new TrainerError("REVIEW_NOT_FOUND", "No se encontró el análisis solicitado.");
    const existing = dependencies.store.getBank(review.id, review.commitSha);
    if (existing !== null && dependencies.store.isBankReady(review.id, review.commitSha)) return existing;
    const key = `${review.id}:${review.commitSha.toLowerCase()}`;
    const pending = inFlight.get(key);
    if (pending) return pending;
    const generation = (async () => {
      const owner = `trainer-${randomUUID()}`;
      const deadline = Date.now() + 190_000;
      while (!dependencies.store.claimBankGeneration(review.id, review.commitSha, owner, Date.now(), 180_000)) {
        if (dependencies.store.isBankReady(review.id, review.commitSha)) return dependencies.store.getBank(review.id, review.commitSha) ?? [];
        if (Date.now() >= deadline) throw new TrainerError("BANK_GENERATION_BUSY", "El banco de retos todavía se está preparando. Inténtalo de nuevo en un momento.");
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      try {
        const candidates = verifiedEvidence(review);
        const createdAt = now().toISOString();
        const challenges: TrainerChallenge[] = [];
        const existingFeatures = new Set((existing ?? []).map((challenge) => challenge.feature));
        for (const { evidence, findingReason, feature, excerpt } of candidates) {
          if (existingFeatures.has(feature)) continue;
          try {
            const draft = await dependencies.provider.createChallenge({ reviewId: review.id, commitSha: review.commitSha, evidence, findingReason, evidenceExcerpt: excerpt });
            const taskKey = draft.mutation.normalize("NFKC").toLocaleLowerCase("es").replace(/\W+/g, " ").trim();
            if (challenges.some((challenge) => challenge.task.normalize("NFKC").toLocaleLowerCase("es").replace(/\W+/g, " ").trim() === taskKey)
              || (existing ?? []).some((challenge) => challenge.task.normalize("NFKC").toLocaleLowerCase("es").replace(/\W+/g, " ").trim() === taskKey)) continue;
            challenges.push({
              id: createId(), reviewId: review.id, projectId: review.projectId, commitSha: review.commitSha,
              feature, task: String(draft.mutation).slice(0, 1000), expectedObservation: String(draft.demonstration).slice(0, 1000),
              restoration: String(draft.restoration).slice(0, 1000), estimatedMinutes: draft.estimatedMinutes,
              sourcePath: evidence.path, sourceLines: evidence.lines,
              hints: [
                `Observa primero el comportamiento descrito por Review: ${findingReason}`,
                `Busca la implementación cerca de ${evidence.path}, líneas ${evidence.lines[0]}–${evidence.lines[1]}.`,
                "Experimenta con un cambio temporal y pequeño relacionado con el comportamiento; demuestra el efecto y restaura el código original.",
              ], createdAt,
            });
          } catch {
            // Un hallazgo que no produzca un reto válido no debe impedir usar los demás.
          }
        }
        return dependencies.store.saveBank(review.id, review.commitSha, challenges, createdAt, true, owner);
      } finally {
        dependencies.store.releaseBankGeneration(review.id, review.commitSha, owner);
      }
    })();
    inFlight.set(key, generation);
    try { return await generation; } finally { inFlight.delete(key); }
  }

  return {
    listReviews: () => dependencies.reviews.listCompleted(),
    history(sessionHash: string, reviewId?: string): TrainerAttempt[] { return dependencies.store.history(sessionHash, reviewId); },
    async draw(sessionHash: string, reviewId: string): Promise<{ challenge: TrainerChallenge; category: "new" | "pending" | "review"; bankSize: number }> {
      const bank = await bankFor(reviewId);
      if (!bank.length) throw new TrainerError("NO_COMPATIBLE_CHALLENGES", "Review no encontró evidencia suficiente para preparar un reto seguro. Revisa otro análisis o consulta a tu docente.");
      const latest = new Map<string, TrainerAttempt>();
      for (const attempt of dependencies.store.history(sessionHash, reviewId).slice().reverse()) latest.set(attempt.challengeId, attempt);
      const groups = {
        new: bank.filter((challenge) => !latest.has(challenge.id)),
        pending: bank.filter((challenge) => ["pending", "in_progress", "need_more"].includes(latest.get(challenge.id)?.status ?? "")),
        review: bank.filter((challenge) => latest.get(challenge.id)?.status === "completed"),
      };
      const weights = { new: 0.45, pending: 0.35, review: 0.2 };
      const available = (Object.keys(groups) as Array<keyof typeof groups>).filter((category) => groups[category].length > 0);
      const weightTotal = available.reduce((sum, category) => sum + weights[category], 0);
      let draw = Math.min(Math.max(random(), 0), 0.999999) * weightTotal;
      let category = available[0]!;
      for (const candidate of available) { draw -= weights[candidate]; if (draw < 0) { category = candidate; break; } }
      const candidates = groups[category];
      const previous = dependencies.store.history(sessionHash, reviewId)[0]?.challengeId;
      const alternatives = candidates.filter((challenge) => challenge.id !== previous);
      const selected = (alternatives.length ? alternatives : candidates)[Math.floor(Math.min(Math.max(random(), 0), 0.999999) * (alternatives.length || candidates.length))]!;
      return { challenge: selected, category, bankSize: bank.length };
    },
    async record(input: { sessionHash: string; reviewId: string; challengeId: string; status: TrainerStatus; hintsUsed: number }): Promise<TrainerAttempt> {
      if (!Number.isInteger(input.hintsUsed) || input.hintsUsed < 0 || input.hintsUsed > 3) throw new TrainerError("INVALID_INPUT", "La cantidad de pistas no es válida.");
      const challenge = (await bankFor(input.reviewId)).find((item) => item.id === input.challengeId);
      if (!challenge) throw new TrainerError("CHALLENGE_NOT_FOUND", "No se encontró el reto de esta revisión.");
      return dependencies.store.recordAttempt({ ...input, feature: challenge.feature, attemptedAt: now().toISOString() });
    },
  };
}
