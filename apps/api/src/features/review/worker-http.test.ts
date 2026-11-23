import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createReviewHttp } from "./http.js";
import { createReviewService, digestSnapshot, sha256 } from "./review.service.js";
import { createPrismaReviewStore } from "./prisma-store.js";
import { createReviewWorker } from "./worker.js";
import { createReviewOperationalLog } from "./operational-log.js";
import { createAdminReviewEventsHttp } from "../admin-review-events/http.js";

const commitSha = "a".repeat(40);
const fileSha = "b".repeat(40);
const request = { owner: "student", repo: "demo", commitSha };
const context = { projectId: "project-1", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" };
const source = "export const value = true;\n";
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Review worker con PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const databases: PrismaClient[] = [];
beforeEach(async () => {
  if (!databaseUrl) return;
  const database = openDatabase(databaseUrl); await database.$connect();
  const [current] = await database.$queryRaw<Array<{ databaseName: string }>>`SELECT current_database() AS "databaseName"`;
  if (current?.databaseName !== "fragments_test") {
    await database.$disconnect();
    throw new Error("Review worker integration tests require current_database() = fragments_test.");
  }
  await database.submission.deleteMany({ where: { kind: "review" } });
  await database.job.deleteMany({ where: { type: "review" } });
  await database.$disconnect();
});
afterEach(async () => { for (const database of databases.splice(0)) { await database.submission.deleteMany({ where: { kind: "review" } }); await database.job.deleteMany({ where: { type: "review" } }); await database.$disconnect(); } });

async function fixture() {
  const id = `review-test-${randomUUID()}`;
  const testRequest = { ...request, repo: id };
  const testContext = { ...context, projectId: id };
  const database = openDatabase(databaseUrl!); databases.push(database); await database.$connect();
  const store = createPrismaReviewStore(database);
  const snapshotContent = { owner: testRequest.owner, repo: testRequest.repo, commitSha, files: [{ path: "src/index.ts", content: source, sha: fileSha }] };
  const digest = await digestSnapshot(snapshotContent);
  const packedText = `Commit ${commitSha}\n${source}`;
  const packedDigest = await sha256(packedText);
  const service = createReviewService({
    repository: { getCommitSnapshot: vi.fn(async () => ({ ...snapshotContent, digest })) },
    packer: { pack: vi.fn(async () => ({ text: packedText, inputDigest: packedDigest, tokenCount: 12 })) },
    ai: { analyze: vi.fn(async ({ budget, snapshotDigest }) => {
      expect(budget.maxOutputTokens).toBe(2000);
      expect(snapshotDigest).toBe(digest);
      return { rubricVersion: context.rubricVersion, score: 82, findings: [{
        criterionId: "correctness", status: "verified", evidence: [{ source: "repository", path: "src/index.ts", lines: [1, 1], digest }],
        reason: "La evidencia coincide con el commit.", guidanceLevel: 1,
      }], limitations: [], modelId: "fake:offline-v1", inputDigest: packedDigest };
    }) },
    evaluations: store.evaluations,
    submissions: store.submissions,
    pdf: { render: async (text) => new TextEncoder().encode(`%PDF-1.4\n${text}`) },
    now: () => new Date("2026-11-04T12:00:00.000Z"),
    createVerificationCode: () => `${id.replaceAll("-", "").slice(0, 32)}`,
  });
  return { database, store, service, request: testRequest, context: testContext };
}

async function serve(handler: (request: IncomingMessage, response: ServerResponse) => unknown, action: (baseUrl: string) => Promise<void>) {
  const server = createServer((request, response) => { void handler(request, response); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No se obtuvo el puerto HTTP de prueba.");
  try { await action(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

describePostgres("Review queue worker and feature HTTP handler — PostgreSQL integration", () => {
  it("requires a student session and conceals reviews owned by another account", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: { ...f.context, studentId: "student-a" } });
    const handler = createReviewHttp({
      store: f.store, service: f.service,
      resolveStudentId: async (incoming) => typeof incoming.headers["x-student-id"] === "string" ? incoming.headers["x-student-id"] as string : null,
      resolveContext: async () => ({ ...f.context, studentId: "student-a" }),
    });
    await serve(handler, async (baseUrl) => {
      expect((await fetch(`${baseUrl}/api/reviews/${job.id}`)).status).toBe(401);
      expect((await fetch(`${baseUrl}/api/reviews/${job.id}`, { headers: { "x-student-id": "student-b" } })).status).toBe(404);
      expect((await fetch(`${baseUrl}/api/reviews/${job.id}`, { headers: { "x-student-id": "student-a" } })).status).toBe(200);
      await createReviewWorker({ store: f.store, service: f.service, workerId: "worker-owner-test" }).runOnce();
      const submission = await f.service.createPdf(job.id);
      expect((await fetch(`${baseUrl}/api/review-submissions/${submission.submission.id}/pdf`, { headers: { "x-student-id": "student-b" } })).status).toBe(404);
      expect((await fetch(`${baseUrl}/api/review-submissions/${submission.submission.id}/pdf`, { headers: { "x-student-id": "student-a" } })).status).toBe(200);
    });
  });

  it("processes an enqueued review using the typed fake AI budget and persists the completed response", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    const worker = createReviewWorker({ store: f.store, service: f.service, workerId: "worker-test", heartbeatIntervalMs: 100 });
    expect(await worker.runOnce()).toBe(true);
    expect(await f.store.getJob(job.id)).toMatchObject({ id: job.id, status: "completed", record: { id: job.id, analysis: { modelId: "fake:offline-v1" } } });
    expect(await worker.runOnce()).toBe(false);
  });

  it("connects a completed fake worker review to the audited admin operational events endpoint", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    const operationalLog = createReviewOperationalLog();
    const worker = createReviewWorker({
      store: f.store,
      service: f.service,
      workerId: "worker-operational-events-test",
      logEvent: (event) => operationalLog.record(event),
    });
    expect(await worker.runOnce()).toBe(true);
    expect(await f.store.getJob(job.id)).toMatchObject({ status: "completed" });

    const auditEvents: Array<Record<string, unknown>> = [];
    const order: string[] = [];
    const list = operationalLog.list;
    vi.spyOn(operationalLog, "list").mockImplementation((limit) => {
      order.push("read");
      return list(limit);
    });
    const handler = createAdminReviewEventsHttp(operationalLog, async (incoming) => incoming.headers["x-admin-role"] === "admin", {
      getActorId: async (incoming) => incoming.headers["x-admin-role"] === "admin" ? "admin-test-actor" : null,
      write: async (event) => { order.push("audit"); auditEvents.push(event); },
    });

    await serve(async (incoming, response) => {
      if (await handler(incoming, response) === "unhandled") response.writeHead(404).end();
    }, async (baseUrl) => {
      const response = await fetch(`${baseUrl}/api/admin/review-events`, { headers: { "x-admin-role": "admin" } });
      expect(response.status).toBe(200);
      const payload = await response.json() as { ok: boolean; data: { events: Array<Record<string, unknown>> } };
      expect(payload.ok).toBe(true);
      expect(payload.data.events).toHaveLength(1);
      expect(payload.data.events[0]).toMatchObject({
        event: "review.attempt.finished",
        reviewId: job.id,
        jobId: job.id,
        stage: "result_persistence",
        errorCode: null,
        attempt: 1,
        finalStatus: "completed",
      });
      expect(Object.keys(payload.data.events[0]!).sort()).toEqual([
        "attempt", "durationMs", "errorCode", "event", "finalStatus", "jobId", "occurredAt", "reviewId", "stage",
      ]);
      expect(JSON.stringify(payload)).not.toMatch(/student|repository|score|prompt|token|email|provider-secret/i);
    });

    expect(auditEvents).toHaveLength(1);
    expect(auditEvents[0]).toMatchObject({ event: "admin.review_events.read", adminActorId: "admin-test-actor" });
    expect(order).toEqual(["audit", "read"]);
  });

  it("accepts one explicit retry for a transient failure and reuses the same idempotent job", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    const failedAt = Date.now() - 120_000;
    await f.store.claim("worker-first", failedAt, 1_000);
    await f.store.fail(job.id, "worker-first", { stage: "repository", errorCode: "GITHUB_RATE_LIMITED", retryClass: "transient", durationMs: 120 }, failedAt + 500);
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => f.context });

    await serve(handler, async (baseUrl) => {
      const retried = await fetch(`${baseUrl}/api/reviews/${job.id}/retry`, { method: "POST" });
      expect(retried.status).toBe(202);
      expect(await retried.json()).toMatchObject({ ok: true, data: { id: job.id, status: "queued" } });
    });

    await createReviewWorker({ store: f.store, service: f.service, workerId: "worker-retry" }).runOnce();
    expect(await f.store.getJob(job.id)).toMatchObject({ id: job.id, status: "completed" });
    expect(await f.store.getAttemptHistory(job.id)).toMatchObject([
      { attempt: 1, finalStatus: "failed", errorCode: "GITHUB_RATE_LIMITED" },
      { attempt: 2, finalStatus: "completed", errorCode: null },
    ]);
  });

  it("emits normalized diagnostics without exception text", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    const events: Array<Record<string, unknown>> = [];
    const worker = createReviewWorker({
      store: f.store,
      service: { review: async () => { throw new Error("provider-secret-raw-error"); } } as never,
      workerId: "worker-failure",
      logEvent: (event) => events.push(event),
    });
    await worker.runOnce();

    expect(await f.store.getJob(job.id)).toMatchObject({ status: "failed", message: "No se pudo completar la revisión en este momento." });
    expect(await f.store.getAttemptHistory(job.id)).toMatchObject([{ stage: "repository", errorCode: "GITHUB_UNAVAILABLE", retryClass: "manual", finalStatus: "failed" }]);
    expect(events).toMatchObject([{
      event: "review.attempt.finished", reviewId: job.id, jobId: job.id, stage: "repository",
      errorCode: "GITHUB_UNAVAILABLE", attempt: 1, finalStatus: "failed",
    }]);
    expect(JSON.stringify(events)).not.toContain("provider-secret-raw-error");
    expect((await f.store.retryFailed(job.id, Date.now() + 1_000_000)).kind).toBe("not_retryable");
  });

  it("does not falsely report an existing failed idempotent job as queued or retry an ambiguous AI result", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    const failedAt = Date.now();
    await f.store.claim("worker-manual", failedAt, 30_000);
    await f.store.fail(job.id, "worker-manual", { stage: "ai_dispatch", errorCode: "AI_OUTCOME_UNCERTAIN", retryClass: "manual", durationMs: 5 }, failedAt + 5);
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => f.context });

    await serve(handler, async (baseUrl) => {
      const duplicate = await fetch(`${baseUrl}/api/reviews`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f.request),
      });
      expect(duplicate.status).toBe(409);
      expect(await duplicate.json()).toMatchObject({ ok: false, error: { code: "REVIEW_RETRY_REQUIRED" } });

      const retry = await fetch(`${baseUrl}/api/reviews/${job.id}/retry`, { method: "POST" });
      expect(retry.status).toBe(409);
      expect(await retry.json()).toMatchObject({ ok: false, error: { code: "REVIEW_RETRY_UNAVAILABLE" } });
    });
    expect(await f.store.getAttemptHistory(job.id)).toHaveLength(1);
  });

  it("only lets the student who still resolves to the original review context request a retry", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    const failedAt = Date.now();
    await f.store.claim("worker-authz", failedAt, 30_000);
    await f.store.fail(job.id, "worker-authz", { stage: "repository", errorCode: "GITHUB_RATE_LIMITED", retryClass: "transient", durationMs: 5 }, failedAt + 500);
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => ({ ...f.context, projectId: "different-project" }) });

    await serve(handler, async (baseUrl) => {
      const retry = await fetch(`${baseUrl}/api/reviews/${job.id}/retry`, { method: "POST" });
      expect(retry.status).toBe(404);
      expect(await retry.json()).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
    });
    expect(await f.store.getJob(job.id)).toMatchObject({ status: "failed" });
  });

  it("returns queued jobs and exposes only stored status through the feature routes", async () => {
    const f = await fixture();
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => f.context });
    await serve(handler, async (baseUrl) => {
      const created = await fetch(`${baseUrl}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f.request) });
      expect(created.status).toBe(202);
      const queued = await created.json() as { data: { id: string; status: string } };
      expect(queued.data.status).toBe("queued");

      const read = await fetch(`${baseUrl}/api/reviews/${queued.data.id}`);
      expect(read.status).toBe(200);
      expect(await read.json()).toMatchObject({ ok: true, data: { id: queued.data.id, status: "queued" } });

      const rejected = await fetch(`${baseUrl}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f.request, commitSha: "main" }) });
      expect(rejected.status).toBe(400);
    });
  });

  it("creates durable submission metadata and renders its PDF only when requested", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request: f.request, context: f.context });
    await createReviewWorker({ store: f.store, service: f.service, workerId: "worker-test" }).runOnce();
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => f.context });
    await serve(handler, async (baseUrl) => {
      const submitted = await fetch(`${baseUrl}/api/review-submissions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewId: job.id }) });
      expect(submitted.status).toBe(201);
      const submission = await submitted.json() as { data: { id: string; verificationCode: string } };
      expect(await f.store.getReviewSubmission(submission.data.id)).not.toBeNull();
      const pdf = await fetch(`${baseUrl}/api/review-submissions/${submission.data.id}/pdf`);
      expect(pdf.headers.get("content-type")).toBe("application/pdf");
      expect(new TextDecoder().decode(await pdf.arrayBuffer())).toContain("%PDF-1.4");
      const verified = await fetch(`${baseUrl}/api/verify/${submission.data.verificationCode}`);
      expect(verified.status).toBe(200);
      expect(await verified.json()).toMatchObject({ ok: true, data: { kind: "review", integrityValid: true } });
    });
  });
});
