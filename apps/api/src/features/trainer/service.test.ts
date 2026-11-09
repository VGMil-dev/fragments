import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import type { AiAnalysis, RepositorySnapshot } from "@fragments/contracts";
import { migrate } from "../../db/migrate.js";
import { digestSnapshot } from "../review/review.service.js";
import { createTrainerRepository } from "./repository.js";
import { createTrainerService } from "./service.js";

const sha = "a".repeat(40);
async function fixture() {
  const source = { owner: "classroom", repo: "demo", commitSha: sha, files: [{ path: "src/search.ts", content: "export const search = (term: string) => term.trim();\n", sha: "b".repeat(40) }] };
  const digest = await digestSnapshot(source);
  const snapshot: RepositorySnapshot = { ...source, digest };
  const analysis: AiAnalysis = {
    rubricVersion: "review-v1", score: 80,
    findings: [{ criterionId: "search", status: "verified", evidence: [{ source: "repository", path: "src/search.ts", lines: [1, 1], digest }], reason: "La búsqueda limpia espacios antes de comparar.", guidanceLevel: 1 }],
    limitations: [], modelId: "fake-provider:review-fixture", inputDigest: "c".repeat(64),
  };
  const review = { id: "review-1", projectId: "classroom/demo", commitSha: sha, owner: "classroom", repo: "demo", snapshot, analysis };
  const db = new DatabaseSync(":memory:"); migrate(db);
  const store = createTrainerRepository(db);
  let providerCalls = 0;
  const service = createTrainerService({
    reviews: { listCompleted: async () => [{ id: review.id, owner: review.owner, repo: review.repo, commitSha: sha, updatedAt: "2026-11-08T12:00:00.000Z" }], getEvidence: async () => review },
    provider: { async createChallenge() { providerCalls++; return { precondition: "La búsqueda ya limpia espacios.", mutation: "Modifica temporalmente la limpieza de espacios y observa qué términos dejan de coincidir.", demonstration: "Compara una consulta con espacios al inicio y al final.", restoration: "Devuelve la limpieza original al terminar.", estimatedMinutes: 15, teacherHint: "DATO_PRIVADO_INSPECTOR" }; } },
    store, now: () => new Date("2026-11-08T12:00:00.000Z"), random: () => 0.99, createId: () => "trainer-challenge-1",
  });
  store.ensureSession("session-a", new Date("2026-11-08T12:00:00.000Z"));
  store.ensureSession("session-b", new Date("2026-11-08T12:00:00.000Z"));
  return { db, store, service, get providerCalls() { return providerCalls; } };
}

describe("Trainer service", () => {
  it("grounds one reusable challenge in verified Review evidence and reuses it on later draws", async () => {
    const f = await fixture();
    try {
      const first = await f.service.draw("session-a", "review-1");
      const second = await f.service.draw("session-a", "review-1");
      expect(first.category).toBe("new");
      expect(first.challenge.sourcePath).toBe("src/search.ts");
      expect(first.challenge.task).toContain("espacios");
      expect(second.challenge.id).toBe(first.challenge.id);
      expect(f.providerCalls).toBe(1);
      expect(JSON.stringify(first)).not.toContain("DATO_PRIVADO_INSPECTOR");
    } finally { f.db.close(); }
  });

  it("records hints and self-reported progress while isolating another session", async () => {
    const f = await fixture();
    try {
      const drawn = await f.service.draw("session-a", "review-1");
      expect(drawn.category).toBe("new");
      await f.service.record({ sessionHash: "session-a", reviewId: "review-1", challengeId: drawn.challenge.id, status: "need_more", hintsUsed: 1 });
      expect((await f.service.draw("session-a", "review-1")).category).toBe("pending");
      await f.service.record({ sessionHash: "session-a", reviewId: "review-1", challengeId: drawn.challenge.id, status: "completed", hintsUsed: 2 });
      expect(f.service.history("session-a", "review-1")[0]).toMatchObject({ status: "completed", hintsUsed: 2 });
      expect(f.store.practicedFeatures("review-1")).toEqual([drawn.challenge.feature]);
      expect(f.service.history("session-b", "review-1")).toEqual([]);
      expect((await f.service.draw("session-a", "review-1")).category).toBe("review");
    } finally { f.db.close(); }
  });
});
