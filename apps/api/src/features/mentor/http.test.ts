import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../../db/migrate.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createMentorHttp } from "./http.js";
import { createMentorService, MentorEvaluationFailure, type MentorEvaluator } from "./service.js";

const servers: Server[] = [];
const databases: DatabaseSync[] = [];
const draft = {
  title: "Huerto de aula", problem: "El curso necesita registrar el crecimiento de las plantas.",
  solution: "Una bitácora permite anotar riegos y comparar el crecimiento de cada planta.",
  goals: ["Registrar riegos"], skills: ["TypeScript"], scope: "Una pantalla registra plantas y medidas.", constraints: ["Funciona sin conexión"],
};

async function start(evaluator: MentorEvaluator = createLocalMentorEvaluator(), logFailure?: (entry: Record<string, unknown>) => void) {
  const database = new DatabaseSync(":memory:"); databases.push(database); migrate(database);
  const service = createMentorService({ evaluator, pdf: createMinimalPdfRenderer() });
  const mentorHandler = createMentorHttp(database, service, { logFailure });
  const server = createServer(async (request, response) => {
    if (await mentorHandler(request, response) === "unhandled") response.writeHead(404).end();
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return `http://127.0.0.1:${address.port}`;
}

async function createProposal(base: string) {
  const response = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
  const body = await response.json() as { data: { id: string; version: number } };
  const cookie = response.headers.get("set-cookie")?.split(";")[0];
  expect(response.headers.get("set-cookie")).toContain("HttpOnly; Secure; SameSite=Strict");
  if (!cookie) throw new Error("Proposal owner cookie missing");
  return { id: body.data.id, version: body.data.version, cookie };
}

afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  for (const database of databases.splice(0)) database.close();
});

describe("Mentor HTTP ownership, revision, and opt-in flow", () => {
  it("coalesces concurrent requests for the same proposal version", async () => {
    const local = createLocalMentorEvaluator();
    let evaluationCalls = 0;
    let markStarted!: () => void;
    let release!: () => void;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const evaluator: MentorEvaluator = {
      async evaluate(input) {
        evaluationCalls += 1;
        markStarted();
        await gate;
        return local.evaluate(input);
      },
    };
    const base = await start(evaluator);
    const proposal = await createProposal(base);
    const path = `${base}/api/proposals/${proposal.id}/review`;
    const first = fetch(path, { method: "POST", headers: { cookie: proposal.cookie } });
    await started;
    const second = fetch(path, { method: "POST", headers: { cookie: proposal.cookie } });
    await new Promise((resolve) => setTimeout(resolve, 10));
    release();
    const [firstResponse, secondResponse] = await Promise.all([first, second]);
    const firstBody = await firstResponse.json() as { data: { evaluationId: string } };
    const secondBody = await secondResponse.json() as { data: { evaluationId: string } };

    expect(firstResponse.status).toBe(200);
    expect(secondResponse.status).toBe(200);
    expect(evaluationCalls).toBe(1);
    expect(secondBody.data.evaluationId).toBe(firstBody.data.evaluationId);
    expect(Number(databases.at(-1)!.prepare("SELECT COUNT(*) count FROM mentor_evaluations").get()!.count)).toBe(1);
  });

  it("reports a budget reservation failure without dispatching or hiding its diagnostic", async () => {
    const diagnostics: Record<string, unknown>[] = [];
    let evaluationCalls = 0;
    const evaluator: MentorEvaluator = {
      async evaluate() {
        evaluationCalls += 1;
        throw new MentorEvaluationFailure({ stage: "budget_reservation", errorType: "AiBudgetUnavailableError" });
      },
    };
    const base = await start(evaluator, (entry) => diagnostics.push(entry));
    const proposal = await createProposal(base);

    const response = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      method: "POST",
      headers: { cookie: proposal.cookie },
    });
    const body = await response.json() as { error: { code: string; message: string } };

    expect(response.status).toBe(503);
    expect(body.error.code).toBe("AI_BUDGET_UNAVAILABLE");
    expect(body.error.message).toContain("presupuesto");
    expect(evaluationCalls).toBe(1);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({
      event: "mentor_evaluation_failed",
      stage: "budget_reservation",
      error_type: "AiBudgetUnavailableError",
      http_status: 503,
      provider_http_status: null,
      provider_code: null,
      retry_after_ms: null,
    });
    expect(diagnostics[0]).toHaveProperty("duration_ms");
    expect(Number(databases.at(-1)!.prepare("SELECT COUNT(*) count FROM mentor_evaluations").get()!.count)).toBe(0);
  });

  it("recovers the latest persisted evaluation without evaluating again", async () => {
    const local = createLocalMentorEvaluator();
    let evaluationCalls = 0;
    const evaluator: MentorEvaluator = {
      async evaluate(input) {
        evaluationCalls += 1;
        return local.evaluate(input);
      },
    };
    const base = await start(evaluator);
    const proposal = await createProposal(base);
    const post = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      method: "POST",
      headers: { cookie: proposal.cookie },
    });
    const saved = await post.json();

    const recovered = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      headers: { cookie: proposal.cookie },
    });
    const denied = await fetch(`${base}/api/proposals/${proposal.id}/review`);

    expect(post.status).toBe(200);
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual(saved);
    expect(denied.status).toBe(404);
    expect(evaluationCalls).toBe(1);
    expect(Number(databases.at(-1)!.prepare("SELECT COUNT(*) count FROM mentor_evaluations").get()!.count)).toBe(1);

    await fetch(`${base}/api/proposals/${proposal.id}`, {
      method: "PUT",
      headers: { cookie: proposal.cookie, "content-type": "application/json" },
      body: JSON.stringify({ ...draft, title: "Huerto revisado", expectedVersion: proposal.version }),
    });
    const stale = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      headers: { cookie: proposal.cookie },
    });
    expect(stale.status).toBe(404);
    expect(evaluationCalls).toBe(1);
  });

  it("requires the owner cookie for edits, keeps history, and rejects stale versions", async () => {
    const base = await start();
    const proposal = await createProposal(base);
    const otherOwner = await createProposal(base);
    const denied = await fetch(`${base}/api/proposals/${proposal.id}/versions`);
    expect(denied.status).toBe(404);
    const updateBody = { ...draft, title: "Huerto escolar", expectedVersion: 1 };
    const wrongOwner = await fetch(`${base}/api/proposals/${proposal.id}`, { method: "PUT", headers: { cookie: otherOwner.cookie, "content-type": "application/json" }, body: JSON.stringify(updateBody) });
    expect(wrongOwner.status).toBe(404);
    const saved = await fetch(`${base}/api/proposals/${proposal.id}`, { method: "PUT", headers: { cookie: proposal.cookie, "content-type": "application/json" }, body: JSON.stringify(updateBody) });
    expect(saved.status).toBe(200);
    expect((await saved.json() as { data: { version: number } }).data.version).toBe(2);
    const stale = await fetch(`${base}/api/proposals/${proposal.id}`, { method: "PUT", headers: { cookie: proposal.cookie, "content-type": "application/json" }, body: JSON.stringify(updateBody) });
    expect(stale.status).toBe(409);
    const history = await fetch(`${base}/api/proposals/${proposal.id}/versions`, { headers: { cookie: proposal.cookie } });
    expect((await history.json() as { data: Array<{ version: number }> }).data.map((item) => item.version)).toEqual([1, 2]);
  });

  it("publishes by explicit consent and uses published entries in comparison", async () => {
    const base = await start();
    const published = await createProposal(base);
    expect((await fetch(`${base}/api/gallery`)).status).toBe(200);
    const optIn = await fetch(`${base}/api/proposals/${published.id}/gallery-opt-in`, { method: "PUT", headers: { cookie: published.cookie, "content-type": "application/json" }, body: JSON.stringify({ optIn: true }) });
    expect(optIn.status).toBe(200);
    expect((await (await fetch(`${base}/api/gallery`)).json() as { data: Array<{ id: string }> }).data.map((item) => item.id)).toContain(published.id);

    const second = await createProposal(base);
    const review = await fetch(`${base}/api/proposals/${second.id}/review`, { method: "POST", headers: { cookie: second.cookie } });
    const result = await review.json() as { data: { similarityMatches: Array<{ galleryId: string; title: string; reason: string }> } };
    expect(result.data.similarityMatches[0]).toMatchObject({ galleryId: published.id, title: draft.title });
    expect(result.data.similarityMatches[0]?.reason).toContain("Comparte temas clave");

    const edited = await fetch(`${base}/api/proposals/${published.id}`, { method: "PUT", headers: { cookie: published.cookie, "content-type": "application/json" }, body: JSON.stringify({ ...draft, title: "Huerto actualizado", expectedVersion: 1 }) });
    expect(edited.status).toBe(200);
    expect((await (await fetch(`${base}/api/gallery`)).json() as { data: Array<{ id: string }> }).data).toEqual([]);
    await fetch(`${base}/api/proposals/${published.id}/gallery-opt-in`, { method: "PUT", headers: { cookie: published.cookie, "content-type": "application/json" }, body: JSON.stringify({ optIn: true }) });
    await fetch(`${base}/api/proposals/${published.id}/gallery-opt-in`, { method: "PUT", headers: { cookie: published.cookie, "content-type": "application/json" }, body: JSON.stringify({ optIn: false }) });
    expect((await (await fetch(`${base}/api/gallery`)).json() as { data: Array<{ id: string }> }).data).toEqual([]);
  });

  it("leaves Review verification codes for the Review route", async () => {
    const base = await start();
    const database = databases.at(-1)!;
    database.prepare(`INSERT INTO submissions
      (id, kind, source_id, score, snapshot_json, content_hash, verification_code, rubric_version, created_at)
      VALUES (?, 'review', ?, ?, ?, ?, ?, ?, ?)`)
      .run("review-submission", "review-1", 80, JSON.stringify({ commitSha: "a".repeat(40), findings: [], limitations: [] }),
        "b".repeat(64), "c".repeat(32), "review-test-v1", "2026-11-04T00:00:00.000Z");

    const response = await fetch(`${base}/api/verify/${"c".repeat(32)}`);
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});
