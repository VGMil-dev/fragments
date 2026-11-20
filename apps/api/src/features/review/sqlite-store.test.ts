import { DatabaseSync } from "node:sqlite";
import { describe, expect, it } from "vitest";
import { migrate } from "../../db/migrate.js";
import { createSqliteReviewStore } from "./sqlite-store.js";
import type { ReviewRecord } from "./review.service.js";

describe("SQLite Review store", () => {
  it("binds new Review jobs to one stable student account", async () => {
    const database = new DatabaseSync(":memory:"); migrate(database);
    const store = createSqliteReviewStore(database);
    const request = { owner: "student", repo: "demo", commitSha: "9".repeat(40) };
    const context = { projectId: "student/demo", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" };
    const studentA = await store.enqueue({ request, context: { ...context, studentId: "student-a" } });
    const studentB = await store.enqueue({ request, context: { ...context, studentId: "student-b" } });
    expect(studentB.id).not.toBe(studentA.id);
    expect(store.getStudentIdForJob(studentA.id)).toBe("student-a");
    expect(store.getStudentIdForJob(studentB.id)).toBe("student-b");
    expect(store.getStudentIdForJob("legacy-job")).toBeNull();
    database.close();
  });

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
    expect(await store.getByKey(queued.key)).toEqual(record);
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
    expect(store.getAttemptHistory(queued.id)).toMatchObject([{ attempt: 1, finalStatus: "running" }]);
    expect(store.fail(queued.id, "worker-b", { stage: "repository", errorCode: "GITHUB_RATE_LIMITED", retryClass: "transient", durationMs: 50 }, 1050)).toBe(false);
    expect(store.fail(queued.id, "worker-a", { stage: "repository", errorCode: "GITHUB_RATE_LIMITED", retryClass: "transient", durationMs: 50 }, 1050)).toBe(true);
    expect(store.getJob(queued.id)).toMatchObject({ status: "failed", message: "No se pudo completar la revisión en este momento." });
    expect(store.getAttemptHistory(queued.id)).toMatchObject([{ attempt: 1, stage: "repository", errorCode: "GITHUB_RATE_LIMITED", retryClass: "transient", finalStatus: "failed", durationMs: 50 }]);
    database.close();
  });

  it("retries a classified transient failure atomically after backoff and caps attempts", async () => {
    const database = new DatabaseSync(":memory:");
    migrate(database);
    const store = createSqliteReviewStore(database);
    const queued = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "d".repeat(40) },
      context: { projectId: "project-retry", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    store.claim("worker-1", 1_000, 100_000);
    store.fail(queued.id, "worker-1", { stage: "repository", errorCode: "GITHUB_RATE_LIMITED", retryClass: "transient", durationMs: 100 }, 1_100);

    expect(store.retryFailed(queued.id, 31_099).kind).toBe("too_early");
    const retryResults = [store.retryFailed(queued.id, 31_100), store.retryFailed(queued.id, 31_100)];
    expect(retryResults.map((result) => result.kind).sort()).toEqual(["already_queued", "queued"]);
    expect(store.getJob(queued.id)).toMatchObject({ id: queued.id, status: "queued" });

    expect(store.claim("worker-2", 31_101, 100_000)).toMatchObject({ id: queued.id, attempts: 2 });
    store.fail(queued.id, "worker-2", { stage: "repository", errorCode: "GITHUB_SERVER_ERROR", retryClass: "transient", durationMs: 200 }, 31_300);
    expect(store.retryFailed(queued.id, 91_299).kind).toBe("too_early");
    expect(store.retryFailed(queued.id, 91_300).kind).toBe("queued");
    expect(store.claim("worker-3", 91_301, 100_000)).toMatchObject({ id: queued.id, attempts: 3 });
    store.fail(queued.id, "worker-3", { stage: "repository", errorCode: "GITHUB_TIMEOUT", retryClass: "transient", durationMs: 300 }, 91_500);
    expect(store.retryFailed(queued.id, 1_000_000).kind).toBe("exhausted");
    expect(store.getAttemptHistory(queued.id)).toHaveLength(3);
    database.close();
  });

  it("does not retry permanent or ambiguous failures and returns a completed result idempotently", async () => {
    const database = new DatabaseSync(":memory:");
    migrate(database);
    const store = createSqliteReviewStore(database);
    const manual = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "e".repeat(40) },
      context: { projectId: "project-manual", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    store.claim("worker-manual", 1_000, 100_000);
    store.fail(manual.id, "worker-manual", { stage: "ai", errorCode: "AI_OUTCOME_UNCERTAIN", retryClass: "manual", durationMs: 1 }, 1_100);
    expect(store.retryFailed(manual.id, 1_000_000).kind).toBe("not_retryable");

    const done = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "f".repeat(40) },
      context: { projectId: "project-done", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    store.claim("worker-done", 2_000, 100_000);
    const record: ReviewRecord = {
      id: done.id, key: done.key, projectId: "project-done", owner: "student", repo: "demo", commitSha: "f".repeat(40),
      rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1", updatedAt: new Date(2_050).toISOString(), packedDigest: "b".repeat(64),
      analysis: { rubricVersion: "review-v1", score: 80, findings: [{ criterionId: "criterion-1", status: "verified",
        evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 1], digest: "b".repeat(64) }],
        reason: "Fixture completada.", guidanceLevel: 1 }], limitations: [], modelId: "fake:offline-v1", inputDigest: "b".repeat(64) },
    };
    await store.save(record);
    store.complete(done.id, "worker-done", 2_100);
    const repeated = await store.enqueue({
      request: { owner: "student", repo: "demo", commitSha: "f".repeat(40) },
      context: { projectId: "project-done", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" },
    });
    expect(repeated.id).toBe(done.id);
    expect(repeated.status).toBe("completed");
    expect(repeated.record).toEqual(record);
    expect(store.getAttemptHistory(done.id)).toMatchObject([{ attempt: 1, finalStatus: "completed", errorCode: null }]);
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
