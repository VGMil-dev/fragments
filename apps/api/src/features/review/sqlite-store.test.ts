import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { migrate } from "../../db/migrate.js";
import { createSqliteReviewStore } from "./sqlite-store.js";
import type { ReviewRecord } from "./review.service.js";

describe("SQLite Review store", () => {
  it("enqueues idempotently, claims only review jobs, and persists terminal results", async () => {
    const database = new DatabaseSync(":memory:");
    migrate(database);
    const store = createSqliteReviewStore(database);
    const input = {
      request: { owner: "VGMil-dev", repo: "fragments-test-app", commitSha: "a".repeat(40) },
      context: { projectId: "project-1", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    };

    const queued = await store.enqueue(input);
    const duplicate = await store.enqueue(input);
    expect(duplicate.id).toBe(queued.id);
    expect(queued.status).toBe("queued");

    const claim = store.claim("worker-test", 1000, 5000);
    expect(claim).toMatchObject({ id: queued.id, status: "running", attempts: 1 });
    expect(store.heartbeat(queued.id, "worker-other", 1100)).toBe(false);
    expect(store.heartbeat(queued.id, "worker-test", 1100)).toBe(true);

    const record: ReviewRecord = {
      id: queued.id,
      key: queued.key,
      projectId: "project-1",
      owner: "VGMil-dev",
      repo: "fragments-test-app",
      commitSha: "a".repeat(40),
      rubricVersion: "review-v1",
      evaluatorVersion: "reviewer-v1",
      updatedAt: new Date(1200).toISOString(),
      packedDigest: "b".repeat(64),
      analysis: { rubricVersion: "review-v1", score: 80, findings: [{
        criterionId: "criterion-1", status: "verified", evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 1], digest: "b".repeat(64) }],
        reason: "La evidencia fixture está presente.", guidanceLevel: 1,
      }], limitations: [], modelId: "fake:offline-v1", inputDigest: "b".repeat(64) },
    };
    await store.save(record);
    expect(await store.getByKey(queued.key)).toBeNull();
    expect(await store.getLatestCommit("project-1")).toBeNull();
    expect(store.complete(queued.id, "worker-test", 1300)).toBe(true);
    expect(await store.getByKey(queued.key)).toEqual(record);
    expect(await store.getLatestCommit("project-1")).toBe("a".repeat(40));
    expect(await store.getLatestCommit("other-project")).toBeNull();
    expect(store.getJob(queued.id)).toMatchObject({ status: "completed", progress: 100 });

    database.close();
  });

  it("allows only the current lease owner to fail a job", async () => {
    const database = new DatabaseSync(":memory:");
    migrate(database);
    const store = createSqliteReviewStore(database);
    const queued = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "c".repeat(40) },
      context: { projectId: "project-2", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    store.claim("worker-a", 1000, 100);
    expect(store.fail(queued.id, "worker-b", "No se pudo completar la revisión.", 1050)).toBe(false);
    expect(store.fail(queued.id, "worker-a", "No se pudo completar la revisión.", 1050)).toBe(true);
    expect(store.getJob(queued.id)).toMatchObject({ status: "failed", message: "No se pudo completar la revisión en este momento." });
    database.close();
  });

  it("returns the SHA from the latest completed review for the requested project", async () => {
    const database = new DatabaseSync(":memory:");
    migrate(database);
    const store = createSqliteReviewStore(database);
    const first = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "a".repeat(40) },
      context: { projectId: "project-1", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    store.claim("worker-1");
    const record: ReviewRecord = {
      id: first.id, key: first.key, projectId: "project-1", owner: "student", repo: "demo", commitSha: "a".repeat(40),
      rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1", updatedAt: new Date().toISOString(), packedDigest: "b".repeat(64),
      analysis: { rubricVersion: "review-v1", score: 80, findings: [{ criterionId: "criterion-1", status: "verified",
        evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 1], digest: "b".repeat(64) }],
        reason: "Fixture verificada.", guidanceLevel: 1 }], limitations: [], modelId: "fake:offline-v1", inputDigest: "b".repeat(64) },
    };
    await store.save(record);
    store.complete(first.id, "worker-1");

    const latest = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "c".repeat(40) },
      context: { projectId: "project-1", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    store.claim("worker-2");
    await store.save({ ...record, id: latest.id, key: latest.key, commitSha: "c".repeat(40) });
    store.complete(latest.id, "worker-2");
    expect(await store.getLatestCommit("project-1")).toBe("c".repeat(40));
    expect(await store.getLatestCommit("other-project")).toBeNull();
    database.close();
  });
});
