import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../../db/migrate.js";
import { createTrainerRepository, type TrainerChallenge } from "./repository.js";

let directory = "";
afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); directory = ""; });

describe("Trainer SQLite repository", () => {
  it("preserves the challenge bank and session history after reopening the database", () => {
    directory = mkdtempSync(join(tmpdir(), "fragments-trainer-"));
    const path = join(directory, "trainer.sqlite");
    const firstDb = new DatabaseSync(path); migrate(firstDb);
    const firstStore = createTrainerRepository(firstDb);
    const now = new Date("2026-11-08T12:00:00.000Z");
    firstStore.ensureSession("session-hash", now);
    const challenge: TrainerChallenge = {
      id: "trainer-challenge", reviewId: "review-1", projectId: "project-1", commitSha: "a".repeat(40),
      feature: "Búsqueda", task: "Modifica la búsqueda temporalmente.", expectedObservation: "Compara los resultados.",
      restoration: "Restaura el código.", estimatedMinutes: 15, sourcePath: "src/search.ts", sourceLines: [1, 2],
      hints: ["Observa el comportamiento.", "Busca la función.", "Cambia y restaura."], createdAt: now.toISOString(),
    };
    firstStore.saveBank("review-1", challenge.commitSha, [challenge], now.toISOString());
    firstStore.recordAttempt({ sessionHash: "session-hash", reviewId: "review-1", challengeId: challenge.id, feature: challenge.feature, status: "completed", hintsUsed: 2, attemptedAt: now.toISOString() });
    firstDb.close();

    const reopenedDb = new DatabaseSync(path); migrate(reopenedDb);
    try {
      const reopened = createTrainerRepository(reopenedDb);
      expect(reopened.getBank("review-1", challenge.commitSha)).toEqual([challenge]);
      expect(reopened.history("session-hash", "review-1")).toMatchObject([{ status: "completed", hintsUsed: 2, feature: "Búsqueda" }]);
      expect(reopened.practicedFeatures("review-1")).toEqual(["Búsqueda"]);
    } finally { reopenedDb.close(); }
  });
});
