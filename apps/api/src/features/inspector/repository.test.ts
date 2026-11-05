import { describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "../../db/migrate.js";
import { createInspectorRepository } from "./repository.js";
import type { InspectorRecord } from "./service.js";

const record: InspectorRecord = {
  id: "challenge-1",
  reviewId: "review-1",
  projectId: "project-1",
  commitSha: "b".repeat(40),
  challenge: {
    evaluationId: "review-1",
    sourceEvidence: [{ source: "repository", path: "src/math.ts", lines: [2, 4], digest: "a".repeat(64) }],
    precondition: "Existe un acumulador.",
    mutation: "Invierte la condición.",
    demonstration: "Compara el resultado.",
    restoration: "Restaura la condición.",
    estimatedMinutes: 15,
    teacherHint: "Revisa el acumulador.",
  },
  status: "pending",
  createdAt: "2026-11-04T12:00:00.000Z",
};

describe("Inspector SQLite repository", () => {
  it("persists private challenges, assignment and defense state", async () => {
    const directory = mkdtempSync(join(tmpdir(), "fragments-inspector-"));
    const path = join(directory, "inspector.sqlite");
    let database = new DatabaseSync(path);
    migrate(database);
    try {
      const repository = createInspectorRepository(database);
      await repository.create(record);
      const assigned = { ...record, status: "assigned" as const, assignedTo: "teacher-1", assignedAt: "2026-11-04T12:01:00.000Z" };
      await repository.update(assigned);
      const completed = {
        ...assigned,
        status: "completed" as const,
        defense: { mutationObserved: true, restorationConfirmed: true, notes: "Hecho.", recordedAt: "2026-11-04T12:02:00.000Z" },
      };
      await repository.update(completed);

      database.close();
      database = new DatabaseSync(path);
      migrate(database);
      const reopened = createInspectorRepository(database);
      expect(await reopened.get(record.id)).toEqual(completed);
      expect(await reopened.listByReview(record.reviewId)).toEqual([completed]);
      expect(database.prepare("SELECT challenge_json FROM inspector_challenges WHERE id = ?").get(record.id)?.challenge_json)
        .toContain("teacherHint");
    } finally {
      database.close();
      rmSync(directory, { recursive: true, force: true });
    }
  });
});
