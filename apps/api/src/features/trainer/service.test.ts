import { describe, expect, it } from "vitest";
import type { AiAnalysis, RepositorySnapshot } from "@fragments/contracts";
import { digestSnapshot } from "../review/review.service.js";
import { TrainerAttemptIdempotencyConflict, type TrainerAttempt, type TrainerChallenge, type TrainerStatus } from "./repository.js";
import { createTrainerService } from "./service.js";

const sha = "a".repeat(40);
class MemoryTrainerStore {
  private readonly banks = new Map<string, { challenges: TrainerChallenge[]; ready: boolean; owner: string | null }>();
  private readonly sessions = new Set<string>();
  private readonly attempts: Array<TrainerAttempt & { sessionHash: string; idempotencyKey: string }> = [];
  private key(reviewId: string, commitSha: string) { return `${reviewId}:${commitSha}`; }
  ensureSession(sessionHash: string) { const existed = this.sessions.has(sessionHash); this.sessions.add(sessionHash); return existed; }
  getBank(reviewId: string, commitSha: string) { return this.banks.get(this.key(reviewId, commitSha))?.challenges ?? null; }
  isBankReady(reviewId: string, commitSha: string) { return this.banks.get(this.key(reviewId, commitSha))?.ready ?? false; }
  claimBankGeneration(reviewId: string, commitSha: string, owner: string) {
    const key = this.key(reviewId, commitSha); const bank = this.banks.get(key) ?? { challenges: [], ready: false, owner: null };
    this.banks.set(key, bank);
    if (bank.ready || bank.owner) return false;
    bank.owner = owner; return true;
  }
  releaseBankGeneration(reviewId: string, commitSha: string, owner: string) {
    const bank = this.banks.get(this.key(reviewId, commitSha)); if (bank?.owner === owner) bank.owner = null;
  }
  saveBank(reviewId: string, commitSha: string, challenges: TrainerChallenge[], _createdAt: string, ready = true, owner?: string) {
    const key = this.key(reviewId, commitSha); const bank = this.banks.get(key) ?? { challenges: [], ready: false, owner: null };
    if (owner && bank.owner !== owner) throw new Error("Lost test generation lease");
    const merged = new Map(bank.challenges.map((challenge) => [challenge.feature, challenge]));
    for (const challenge of challenges) if (!merged.has(challenge.feature)) merged.set(challenge.feature, challenge);
    bank.challenges = [...merged.values()]; bank.ready = ready; bank.owner = null; this.banks.set(key, bank);
    return bank.challenges;
  }
  recordAttempt(input: Omit<TrainerAttempt, "id"> & { sessionHash: string; idempotencyKey: string }) {
    const existing = this.attempts.find((attempt) => attempt.sessionHash === input.sessionHash && attempt.idempotencyKey === input.idempotencyKey);
    if (existing) {
      if (existing.reviewId !== input.reviewId || existing.challengeId !== input.challengeId || existing.status !== input.status || existing.hintsUsed !== input.hintsUsed) throw new TrainerAttemptIdempotencyConflict();
      return existing;
    }
    const attempt = { ...input, id: `attempt-${this.attempts.length + 1}` }; this.attempts.push(attempt); return attempt;
  }
  history(sessionHash: string, reviewId?: string) {
    return this.attempts.filter((attempt) => attempt.sessionHash === sessionHash && (!reviewId || attempt.reviewId === reviewId))
      .sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt) || b.id.localeCompare(a.id)).map(({ sessionHash: _sessionHash, idempotencyKey: _idempotencyKey, ...attempt }) => attempt);
  }
  practicedFeatures(reviewId: string) {
    return [...new Set(this.attempts.filter((attempt) => attempt.reviewId === reviewId).sort((a, b) => b.attemptedAt.localeCompare(a.attemptedAt)).map(({ feature }) => feature))];
  }
}

async function fixture(onlyOneFinding = false) {
  const source = { owner: "classroom", repo: "demo", commitSha: sha, files: [
    { path: "src/search.ts", content: "export const search = (term: string) => term.trim();\n", sha: "b".repeat(40) },
    { path: "src/cart.ts", content: "export const total = (prices: number[]) => prices.reduce((sum, price) => sum + price, 0);\n", sha: "c".repeat(40) },
    { path: "src/cache.ts", content: "export const cacheKey = (value: string) => value.toLowerCase();\n", sha: "d".repeat(40) },
  ] };
  const digest = await digestSnapshot(source);
  const snapshot: RepositorySnapshot = { ...source, digest };
  const analysis: AiAnalysis = {
    rubricVersion: "review-v1", score: 80,
    findings: [
      { criterionId: "search", status: "verified", evidence: [{ source: "repository", path: "src/search.ts", lines: [1, 1], digest }], reason: "La búsqueda limpia espacios antes de comparar.", guidanceLevel: 1 },
      { criterionId: "cart-total", status: "verified", evidence: [{ source: "repository", path: "src/cart.ts", lines: [1, 1], digest }], reason: "El total del carrito suma todos los precios.", guidanceLevel: 1 },
      { criterionId: "cache-key", status: "verified", evidence: [{ source: "repository", path: "src/cache.ts", lines: [1, 1], digest }], reason: "La clave de caché normaliza el texto a minúsculas.", guidanceLevel: 1 },
    ].slice(0, onlyOneFinding ? 1 : 3),
    limitations: [], modelId: "fake-provider:review-fixture", inputDigest: "c".repeat(64),
  };
  const review = { id: "review-1", projectId: "classroom/demo", commitSha: sha, owner: "classroom", repo: "demo", snapshot, analysis };
  const store = new MemoryTrainerStore();
  let providerCalls = 0;
  let challengeId = 0;
  const provider = { async createChallenge(input: { evidence: { path: string } }) { providerCalls++; return { precondition: "La funcionalidad está implementada.", mutation: `Modifica temporalmente ${input.evidence.path} y observa su comportamiento.`, demonstration: `Comprueba el comportamiento de ${input.evidence.path}.`, restoration: `Restaura ${input.evidence.path} al terminar.`, estimatedMinutes: 15, teacherHint: "DATO_PRIVADO_INSPECTOR" }; } };
  const makeService = (providerOverride = provider) => createTrainerService({
    reviews: { listCompleted: async () => [{ id: review.id, owner: review.owner, repo: review.repo, commitSha: sha, updatedAt: "2026-11-08T12:00:00.000Z" }], getEvidence: async () => review },
    provider: providerOverride,
    store, now: () => new Date("2026-11-08T12:00:00.000Z"), random: () => 0.99, createId: () => `trainer-challenge-${++challengeId}`,
  });
  const service = makeService();
  store.ensureSession("session-a");
  store.ensureSession("session-b");
  return { store, service, makeService, get providerCalls() { return providerCalls; } };
}

describe("Trainer service", () => {
  it("creates a varied bank from distinct verified findings and reuses it on later draws", async () => {
    const f = await fixture();
    const [first, second] = await Promise.all([
        f.service.draw("session-a", "review-1"),
        f.makeService().draw("session-b", "review-1"),
      ]);
      expect(first.category).toBe("new");
      expect(first.challenge.sourcePath).toBe("src/cache.ts");
      expect(first.bankSize).toBe(3);
      expect(second.challenge.id).toBe(first.challenge.id);
      const bank = await f.store.getBank("review-1", sha)!;
      expect(new Set(bank.map((challenge) => challenge.sourcePath)).size).toBe(3);
      expect(new Set(bank.map((challenge) => challenge.feature)).size).toBe(3);
      expect(f.providerCalls).toBe(3);
    expect(JSON.stringify(first)).not.toContain("DATO_PRIVADO_INSPECTOR");
  });

  it("extends a legacy one-challenge bank once without replacing its challenge", async () => {
    const f = await fixture();
    const legacy = {
        id: "legacy-challenge", reviewId: "review-1", projectId: "classroom/demo", commitSha: sha,
        feature: "search: La búsqueda limpia espacios antes de comparar.", task: "Reto anterior de búsqueda.",
        expectedObservation: "Se observa el resultado.", restoration: "Restaurar el cambio.", estimatedMinutes: 15,
        sourcePath: "src/search.ts", sourceLines: [1, 1] as [number, number], hints: ["Una", "Dos", "Tres"] as [string, string, string], createdAt: "2026-11-08T12:00:00.000Z",
      };
    await f.store.saveBank("review-1", sha, [legacy], "2026-11-08T12:00:00.000Z", false);
    const result = await f.service.draw("session-a", "review-1");
    const bank = await f.store.getBank("review-1", sha);
    expect(result.bankSize).toBe(3);
    expect(bank?.[0]).toEqual(legacy);
    expect(f.providerCalls).toBe(2);
    await f.service.draw("session-a", "review-1");
    expect(f.providerCalls).toBe(2);
  });

  it("caches a completed empty bank instead of retrying generation on every draw", async () => {
    const f = await fixture();
    let failedCalls = 0;
    const service = f.makeService({ async createChallenge() { failedCalls++; throw new Error("fake provider unavailable"); } });
    await expect(service.draw("session-a", "review-1")).rejects.toMatchObject({ code: "NO_COMPATIBLE_CHALLENGES" });
    expect(await f.store.isBankReady("review-1", sha)).toBe(true);
    await expect(service.draw("session-a", "review-1")).rejects.toMatchObject({ code: "NO_COMPATIBLE_CHALLENGES" });
    expect(failedCalls).toBe(3);
  });

  it("allows a single compatible challenge to return as review after completion", async () => {
    const f = await fixture(true);
    const first = await f.service.draw("session-a", "review-1");
      await f.service.record({ sessionHash: "session-a", reviewId: "review-1", challengeId: first.challenge.id, status: "completed", hintsUsed: 0, idempotencyKey: "3d8b4f65-50d1-4d8a-8be5-37e186c6b2aa" });
      const repeat = await f.service.draw("session-a", "review-1");
      expect(first.bankSize).toBe(1);
      expect(repeat.bankSize).toBe(1);
      expect(repeat.category).toBe("review");
      expect(repeat.challenge.id).toBe(first.challenge.id);
    expect(f.providerCalls).toBe(1);
  });

  it("records hints and self-reported progress while isolating another session", async () => {
    const f = await fixture();
    const drawn = await f.service.draw("session-a", "review-1");
      expect(drawn.category).toBe("new");
      await f.service.record({ sessionHash: "session-a", reviewId: "review-1", challengeId: drawn.challenge.id, status: "need_more", hintsUsed: 1, idempotencyKey: "b8a7f825-77d6-44f9-a84f-6b7b42d4a555" });
      expect((await f.service.draw("session-a", "review-1")).category).toBe("pending");
      await f.service.record({ sessionHash: "session-a", reviewId: "review-1", challengeId: drawn.challenge.id, status: "completed", hintsUsed: 2, idempotencyKey: "1a2d9b8c-2d83-4be8-91f9-9f99447bd62a" });
      expect((await f.service.history("session-a", "review-1"))[0]).toMatchObject({ status: "completed", hintsUsed: 2 });
      expect(await f.store.practicedFeatures("review-1")).toEqual([drawn.challenge.feature]);
      expect(await f.service.history("session-b", "review-1")).toEqual([]);
      expect((await f.service.draw("session-a", "review-1")).category).toBe("review");
    expect(f.providerCalls).toBe(3);
  });

  it("returns the same progress attempt for a repeated idempotency key", async () => {
    const f = await fixture();
    const drawn = await f.service.draw("session-a", "review-1");
    const input = { sessionHash: "session-a", reviewId: "review-1", challengeId: drawn.challenge.id, status: "completed" as const, hintsUsed: 2, idempotencyKey: "d152e951-73bf-4c66-9f21-f97dab7d8a26" };

    const [first, retry] = await Promise.all([f.service.record(input), f.service.record(input)]);

    expect(retry).toEqual(first);
    expect(await f.service.history("session-a", "review-1")).toHaveLength(1);
    await expect(f.service.record({ ...input, status: "need_more" })).rejects.toMatchObject({ code: "IDEMPOTENCY_CONFLICT" });
    const otherSession = await f.service.record({ ...input, sessionHash: "session-b" });
    expect(otherSession.id).not.toBe(first.id);
  });
});
