import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { describe, expect, it, vi } from "vitest";
import { migrate } from "../../db/migrate.js";
import { createReviewHttp } from "./http.js";
import { createReviewService, digestSnapshot, sha256 } from "./review.service.js";
import { createSqliteReviewStore } from "./sqlite-store.js";
import { createReviewWorker } from "./worker.js";

const commitSha = "a".repeat(40);
const fileSha = "b".repeat(40);
const request = { owner: "student", repo: "demo", commitSha };
const context = { projectId: "project-1", rubricVersion: "review-v1", evaluatorVersion: "reviewer-v1" };
const source = "export const value = true;\n";

async function fixture() {
  const database = new DatabaseSync(":memory:");
  migrate(database);
  const store = createSqliteReviewStore(database);
  const snapshotContent = { owner: request.owner, repo: request.repo, commitSha, files: [{ path: "src/index.ts", content: source, sha: fileSha }] };
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
    createVerificationCode: () => "z".repeat(32),
  });
  return { database, store, service };
}

async function serve(handler: (request: IncomingMessage, response: ServerResponse) => unknown, action: (baseUrl: string) => Promise<void>) {
  const server = createServer((request, response) => { void handler(request, response); });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No se obtuvo el puerto HTTP de prueba.");
  try { await action(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); }
}

describe("Review queue worker and feature HTTP handler", () => {
  it("processes an enqueued review using the typed fake AI budget and persists the completed response", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request, context });
    const worker = createReviewWorker({ store: f.store, service: f.service, workerId: "worker-test", heartbeatIntervalMs: 100 });
    expect(await worker.runOnce()).toBe(true);
    expect(f.store.getJob(job.id)).toMatchObject({ id: job.id, status: "completed", record: { id: job.id, analysis: { modelId: "fake:offline-v1" } } });
    expect(await worker.runOnce()).toBe(false);
    f.database.close();
  });

  it("returns queued jobs and exposes only stored status through the feature routes", async () => {
    const f = await fixture();
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => context });
    await serve(handler, async (baseUrl) => {
      const created = await fetch(`${baseUrl}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request) });
      expect(created.status).toBe(202);
      const queued = await created.json() as { data: { id: string; status: string } };
      expect(queued.data.status).toBe("queued");

      const read = await fetch(`${baseUrl}/api/reviews/${queued.data.id}`);
      expect(read.status).toBe(200);
      expect(await read.json()).toMatchObject({ ok: true, data: { id: queued.data.id, status: "queued" } });

      const rejected = await fetch(`${baseUrl}/api/reviews`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...request, commitSha: "main" }) });
      expect(rejected.status).toBe(400);
    });
    f.database.close();
  });

  it("creates durable submission metadata and renders its PDF only when requested", async () => {
    const f = await fixture();
    const job = await f.store.enqueue({ request, context });
    await createReviewWorker({ store: f.store, service: f.service, workerId: "worker-test" }).runOnce();
    const handler = createReviewHttp({ store: f.store, service: f.service, resolveContext: async () => context });
    await serve(handler, async (baseUrl) => {
      const submitted = await fetch(`${baseUrl}/api/review-submissions`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ reviewId: job.id }) });
      expect(submitted.status).toBe(201);
      const submission = await submitted.json() as { data: { id: string; verificationCode: string } };
      expect(f.store.getReviewSubmission(submission.data.id)).not.toBeNull();
      const pdf = await fetch(`${baseUrl}/api/review-submissions/${submission.data.id}/pdf`);
      expect(pdf.headers.get("content-type")).toBe("application/pdf");
      expect(new TextDecoder().decode(await pdf.arrayBuffer())).toContain("%PDF-1.4");
      const verified = await fetch(`${baseUrl}/api/verify/${submission.data.verificationCode}`);
      expect(verified.status).toBe(200);
      expect(await verified.json()).toMatchObject({ ok: true, data: { kind: "review", integrityValid: true } });
    });
    f.database.close();
  });
});
