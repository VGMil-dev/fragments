import { describe, expect, it } from "vitest";
import { digestSnapshot } from "../review/review.service.js";
import { createInspectorReviewAdapter, type InspectorReviewRecord } from "./review-adapter.js";

const sha = "a".repeat(40);

async function fixture(snapshotOverrides: Record<string, unknown> = {}) {
  const content = {
    owner: "classroom",
    repo: "fragments-fixture",
    commitSha: sha,
    files: [{ path: "src/main.ts", content: "export const answer = 42;\n", sha: "b".repeat(40) }],
  };
  const digest = await digestSnapshot(content);
  const snapshot = { ...content, digest, ...snapshotOverrides };
  const review: InspectorReviewRecord = {
    id: "review-fixture",
    projectId: "project-fixture",
    owner: "classroom",
    repo: "fragments-fixture",
    commitSha: sha,
    analysis: {
      rubricVersion: "review-v1",
      score: 80,
      findings: [{
        criterionId: "correctness",
        status: "verified",
        evidence: [{ source: "repository", path: "src/main.ts", lines: [1, 1], digest }],
        reason: "La constante tiene un valor definido.",
        guidanceLevel: 1,
      }],
      limitations: [],
      modelId: "fake/review-fixture",
      inputDigest: "c".repeat(64),
    },
  };
  let requested: unknown;
  const adapter = createInspectorReviewAdapter({
    reviews: {
      async getById(id) { return id === review.id ? review : null; },
      async getLatestCommit(projectId) { return projectId === review.projectId ? review.commitSha : null; },
    },
    repository: {
      async getCommitSnapshot(input) {
        requested = input;
        return snapshot;
      },
    },
  });
  return { adapter, review, snapshot, getRequested: () => requested };
}

describe("Inspector review adapter", () => {
  it("rehydrates from the stored exact owner, repository, and commit SHA", async () => {
    const f = await fixture();
    const review = await f.adapter.getById("review-fixture");
    expect(f.getRequested()).toEqual({ owner: "classroom", repo: "fragments-fixture", commitSha: sha });
    expect(review).toMatchObject({
      id: "review-fixture", projectId: "project-fixture", owner: "classroom", repo: "fragments-fixture",
      commitSha: sha, snapshot: f.snapshot,
    });
  });

  it("rejects a snapshot for another commit or repository", async () => {
    const wrongSha = await fixture({ commitSha: "d".repeat(40) });
    await expect(wrongSha.adapter.getById("review-fixture")).rejects.toThrow(/no corresponde/);
    const wrongRepo = await fixture({ repo: "other-repo" });
    await expect(wrongRepo.adapter.getById("review-fixture")).rejects.toThrow(/no corresponde/);
  });

  it("rejects content whose digest differs from the persisted snapshot digest", async () => {
    const f = await fixture({ files: [{ path: "src/main.ts", content: "alterado\n", sha: "b".repeat(40) }] });
    await expect(f.adapter.getById("review-fixture")).rejects.toThrow(/huella/);
  });

  it("returns null for missing reviews and delegates the latest reviewed commit lookup", async () => {
    const f = await fixture();
    await expect(f.adapter.getById("missing")).resolves.toBeNull();
    await expect(f.adapter.getLatestCommit("project-fixture")).resolves.toBe(sha);
  });
});
