import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../../db/migrate.js";
import { createHttpHandler } from "../../http/app.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createMentorRepository } from "./repository.js";
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
  database.exec(`CREATE TABLE user (id TEXT PRIMARY KEY, email TEXT, name TEXT, image TEXT, role TEXT DEFAULT 'user', isTeacher INTEGER DEFAULT 0, githubLogin TEXT, createdAt TEXT);
    CREATE TABLE account (id TEXT PRIMARY KEY, accountId TEXT NOT NULL, providerId TEXT NOT NULL, userId TEXT NOT NULL);`);
  for (const [id, login] of [["student-1", "student-one"], ["student-2", "student-two"], ["teacher-1", "teacher-one"]]) {
    database.prepare("INSERT INTO user(id, email, name, image, role, isTeacher, githubLogin, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, `${login}@example.test`, login, null, "user", id === "teacher-1" ? 1 : 0, login, "2026-11-01T00:00:00.000Z");
    if (id !== "teacher-1") database.prepare("INSERT INTO account(id, accountId, providerId, userId) VALUES (?, ?, 'github', ?)").run(`account-${id}`, `github-${id}`, id);
  }
  const service = createMentorService({ evaluator, pdf: createMinimalPdfRenderer() });
  const auth = {
    handle: (_request: unknown, response: { writeHead: (status: number) => { end: (body?: string) => void } }) => { response.writeHead(503).end(); },
    async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
    async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
    async student(request: { headers: Record<string, string | undefined> }) {
      const id = request.headers["x-fixture-user"];
      if (!id) return null;
      const row = database.prepare("SELECT u.id, u.githubLogin, u.image, u.createdAt, a.accountId FROM user u JOIN account a ON a.userId=u.id AND a.providerId='github' WHERE u.id=? AND u.isTeacher=0").get(id) as { id: string; githubLogin: string; image: string | null; createdAt: string; accountId: string } | undefined;
      return row ? { id: row.id, githubAccountId: row.accountId, githubLogin: row.githubLogin, avatarUrl: row.image, registeredAt: row.createdAt } : null;
    },
    githubOAuthConfigured: true,
  } as unknown as FragmentsAuthService;
  const apiHandler = createHttpHandler(database, { auth, mentor: service, ...(logFailure ? { logFailure: logFailure as never } : {}) });
  const server = createServer(apiHandler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return `http://127.0.0.1:${address.port}`;
}

async function createProposal(base: string, owner = "student-1") {
  const response = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json", "x-fixture-user": owner }, body: JSON.stringify(draft) });
  const body = await response.json() as { data: { id: string; version: number } };
  expect(response.status).toBe(201);
  expect(response.headers.get("set-cookie")).toBeNull();
  return { id: body.data.id, version: body.data.version, owner };
}

afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  for (const database of databases.splice(0)) database.close();
});

describe("Mentor HTTP ownership, revision, and opt-in flow", () => {
  it("requires GitHub session before creating proposals and never accepts a client owner", async () => {
    const base = await start();
    const anonymous = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    expect(anonymous.status).toBe(401);
    const forged = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json", "x-fixture-user": "student-1" }, body: JSON.stringify({ ...draft, ownerUserId: "student-2" }) });
    expect(forged.status).toBe(400);
    expect(Number(databases.at(-1)!.prepare("SELECT COUNT(*) AS count FROM proposals").get()!.count)).toBe(0);
  });

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
    const first = fetch(path, { method: "POST", headers: { "x-fixture-user": proposal.owner } });
    await started;
    const second = fetch(path, { method: "POST", headers: { "x-fixture-user": proposal.owner } });
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
      headers: { "x-fixture-user": proposal.owner },
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

  it("preserves a Gateway HTTP 402 without retrying or storing an evaluation", async () => {
    const diagnostics: Record<string, unknown>[] = [];
    let evaluationCalls = 0;
    const evaluator: MentorEvaluator = {
      async evaluate() {
        evaluationCalls += 1;
        throw new MentorEvaluationFailure({ stage: "provider_request", errorType: "APICallError", providerHttpStatus: 402, providerCode: "budget_exceeded" });
      },
    };
    const base = await start(evaluator, (entry) => diagnostics.push(entry));
    const proposal = await createProposal(base);

    const response = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      method: "POST",
      headers: { "x-fixture-user": proposal.owner },
    });
    const body = await response.json() as { error: { code: string; message: string } };

    expect(response.status).toBe(402);
    expect(body.error).toMatchObject({ code: "AI_GATEWAY_BUDGET_EXCEEDED" });
    expect(body.error.message).toContain("Vercel AI Gateway");
    expect(evaluationCalls).toBe(1);
    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0]).toMatchObject({ http_status: 402, provider_http_status: 402, provider_code: "budget_exceeded" });
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
      headers: { "x-fixture-user": proposal.owner },
    });
    const saved = await post.json();

    const recovered = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      headers: { "x-fixture-user": proposal.owner },
    });
    const denied = await fetch(`${base}/api/proposals/${proposal.id}/review`);

    expect(post.status).toBe(200);
    expect(recovered.status).toBe(200);
    expect(await recovered.json()).toEqual(saved);
    expect(denied.status).toBe(401);
    expect(evaluationCalls).toBe(1);
    expect(Number(databases.at(-1)!.prepare("SELECT COUNT(*) count FROM mentor_evaluations").get()!.count)).toBe(1);

    await fetch(`${base}/api/proposals/${proposal.id}`, {
      method: "PUT",
      headers: { "x-fixture-user": proposal.owner, "content-type": "application/json" },
      body: JSON.stringify({ ...draft, title: "Huerto revisado", expectedVersion: proposal.version }),
    });
    const stale = await fetch(`${base}/api/proposals/${proposal.id}/review`, {
      headers: { "x-fixture-user": proposal.owner },
    });
    expect(stale.status).toBe(404);
    expect(evaluationCalls).toBe(1);
  });

  it("requires the matching GitHub session for edits, keeps history, and rejects stale versions", async () => {
    const base = await start();
    const proposal = await createProposal(base);
    const otherOwner = await createProposal(base, "student-2");
    const denied = await fetch(`${base}/api/proposals/${proposal.id}/versions`);
    expect(denied.status).toBe(401);
    const updateBody = { ...draft, title: "Huerto escolar", expectedVersion: 1 };
    const wrongOwner = await fetch(`${base}/api/proposals/${proposal.id}`, { method: "PUT", headers: { "x-fixture-user": otherOwner.owner, "content-type": "application/json" }, body: JSON.stringify(updateBody) });
    expect(wrongOwner.status).toBe(404);
    const saved = await fetch(`${base}/api/proposals/${proposal.id}`, { method: "PUT", headers: { "x-fixture-user": proposal.owner, "content-type": "application/json" }, body: JSON.stringify(updateBody) });
    expect(saved.status).toBe(200);
    expect((await saved.json() as { data: { version: number } }).data.version).toBe(2);
    const stale = await fetch(`${base}/api/proposals/${proposal.id}`, { method: "PUT", headers: { "x-fixture-user": proposal.owner, "content-type": "application/json" }, body: JSON.stringify(updateBody) });
    expect(stale.status).toBe(409);
    const history = await fetch(`${base}/api/proposals/${proposal.id}/versions`, { headers: { "x-fixture-user": proposal.owner } });
    expect((await history.json() as { data: Array<{ version: number }> }).data.map((item) => item.version)).toEqual([1, 2]);
  });

  it("keeps a saved proposal private to its student and does not evaluate or publish it", async () => {
    let evaluationCalls = 0;
    const local = createLocalMentorEvaluator();
    const evaluator: MentorEvaluator = {
      async evaluate(input) { evaluationCalls += 1; return local.evaluate(input); },
    };
    const base = await start(evaluator);
    const proposal = await createProposal(base);
    const owner = { "x-fixture-user": proposal.owner };
    const secondStudent = { "x-fixture-user": "student-2" };

    const ownerList = await fetch(`${base}/api/me/proposals`, { headers: owner });
    const secondStudentList = await fetch(`${base}/api/me/proposals`, { headers: secondStudent });
    const ownerBody = await ownerList.json() as { data: Array<{ id: string }> };
    const secondStudentBody = await secondStudentList.json() as { data: Array<{ id: string }> };
    expect(ownerList.status).toBe(200);
    expect(ownerBody.data.map((item) => item.id)).toContain(proposal.id);
    expect(secondStudentList.status).toBe(200);
    expect(secondStudentBody.data.map((item) => item.id)).not.toContain(proposal.id);

    const privateHistory = await fetch(`${base}/api/proposals/${proposal.id}/versions`, { headers: secondStudent });
    const privateReview = await fetch(`${base}/api/proposals/${proposal.id}/review`, { method: "POST", headers: secondStudent });
    const privateEdit = await fetch(`${base}/api/proposals/${proposal.id}`, {
      method: "PUT", headers: { ...secondStudent, "content-type": "application/json" },
      body: JSON.stringify({ ...draft, title: "Intento de acceso", expectedVersion: proposal.version }),
    });
    const gallery = await fetch(`${base}/api/gallery`, { headers: owner });
    const galleryBody = await gallery.json() as { data: { items: Array<{ id: string }> } };

    expect(privateHistory.status).toBe(404);
    expect(await privateHistory.text()).not.toContain(draft.title);
    expect(privateReview.status).toBe(404);
    expect(privateEdit.status).toBe(404);
    expect(gallery.status).toBe(200);
    expect(galleryBody.data.items.map((item) => item.id)).not.toContain(proposal.id);
    expect(evaluationCalls).toBe(0);
  });

  it("publishes eligible evaluations automatically and keeps the latest eligible revision", async () => {
    const base = await start();
    const published = await createProposal(base);
    expect((await fetch(`${base}/api/gallery`)).status).toBe(401);
    expect((await (await fetch(`${base}/api/gallery`, { headers: { "x-fixture-user": published.owner } })).json() as { data: { items: Array<{ id: string }> } }).data.items).toEqual([]);
    const firstReview = await fetch(`${base}/api/proposals/${published.id}/review`, { method: "POST", headers: { "x-fixture-user": published.owner } });
    expect(firstReview.status).toBe(200);
    const gallery = await fetch(`${base}/api/gallery`, { headers: { "x-fixture-user": published.owner } });
    expect((await gallery.json() as { data: { items: Array<{ id: string; proposalVersion: number }> } }).data.items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: published.id, proposalVersion: 1 })]));
    expect(JSON.stringify(await (await fetch(`${base}/api/gallery`, { headers: { "x-fixture-user": published.owner } })).json())).not.toContain("student-one@example.test");

    const second = await createProposal(base);
    const review = await fetch(`${base}/api/proposals/${second.id}/review`, { method: "POST", headers: { "x-fixture-user": second.owner } });
    const result = await review.json() as { data: { similarityMatches: Array<{ galleryId: string; title: string; reason: string }> } };
    expect(result.data.similarityMatches[0]).toMatchObject({ galleryId: published.id, title: draft.title });
    expect(result.data.similarityMatches[0]?.reason).toContain("Comparte temas clave");

    const edited = await fetch(`${base}/api/proposals/${published.id}`, { method: "PUT", headers: { "x-fixture-user": published.owner, "content-type": "application/json" }, body: JSON.stringify({ ...draft, title: "Huerto actualizado", expectedVersion: 1 }) });
    expect(edited.status).toBe(200);
    const stillPublished = await fetch(`${base}/api/gallery`, { headers: { "x-fixture-user": published.owner } });
    expect((await stillPublished.json() as { data: { items: Array<{ id: string; proposalVersion: number }> } }).data.items)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: published.id, proposalVersion: 1 })]));
    const optIn = await fetch(`${base}/api/proposals/${published.id}/gallery-opt-in`, { method: "PUT", headers: { "x-fixture-user": published.owner, "content-type": "application/json" }, body: JSON.stringify({ optIn: false }) });
    expect(optIn.status).toBe(410);
    const evaluateSecondVersion = await fetch(`${base}/api/proposals/${published.id}/review`, { method: "POST", headers: { "x-fixture-user": published.owner } });
    expect(evaluateSecondVersion.status).toBe(200);
    const latest = await fetch(`${base}/api/gallery/${published.id}`, { headers: { "x-fixture-user": published.owner } });
    expect((await latest.json() as { data: { project: { proposalVersion: number }; history: Array<{ proposalVersion: number }> } }).data).toMatchObject({ project: { proposalVersion: 2 }, history: [{ proposalVersion: 2 }, { proposalVersion: 1 }] });
  });

  it("separates teacher authorization and historical records, and claims only with the original cookie", async () => {
    const base = await start();
    const database = databases.at(-1)!;
    const draftProposal = await createProposal(base, "student-1");
    const token = "legacy-owner-cookie-token-that-is-long-enough-0123456789";
    const legacy = createMentorRepository(database).createProposal(draft, createHash("sha256").update(token).digest("hex"));
    const anonymous = await fetch(`${base}/api/teacher/students`);
    const studentDenied = await fetch(`${base}/api/teacher/students`, { headers: { "x-fixture-user": "student-1" } });
    expect(anonymous.status).toBe(401);
    expect(studentDenied.status).toBe(403);

    const teacherHeaders = { "x-fixture-user": "teacher-1", "x-fixture-role": "teacher" };
    const students = await fetch(`${base}/api/teacher/students`, { headers: teacherHeaders });
    expect(students.status).toBe(200);
    expect(JSON.stringify(await students.json())).not.toContain("student-one@example.test");
    const projects = await fetch(`${base}/api/teacher/students/student-1/projects`, { headers: teacherHeaders });
    expect(projects.status).toBe(200);
    expect(await projects.json()).toMatchObject({ ok: true, data: [expect.objectContaining({
      id: draftProposal.id,
      history: [expect.objectContaining({ version: 1, published: false })],
    })] });
    const historical = await fetch(`${base}/api/teacher/historical-projects`, { headers: teacherHeaders });
    expect((await historical.json() as { data: Array<{ id: string }> }).data.map((item) => item.id)).toContain(legacy.id);

    const cookie = await fetch(`${base}/api/me/proposals/${legacy.id}/claim`, { method: "POST", headers: { ...teacherHeaders, cookie: `fragments_proposal_owner=${token}` } });
    expect(cookie.status).toBe(401);
    const claimHeaders = { "x-fixture-user": "student-1", cookie: `fragments_proposal_owner=${token}` };
    const contenders = await Promise.all([1, 2].map(() => fetch(`${base}/api/me/proposals/${legacy.id}/claim`, { method: "POST", headers: claimHeaders })));
    expect(contenders.map((response) => response.status).sort()).toEqual([200, 409]);
    expect(Number(database.prepare("SELECT COUNT(*) AS count FROM mentor_academic_publications WHERE proposal_id = ?").get(legacy.id)!.count)).toBe(0);
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
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
