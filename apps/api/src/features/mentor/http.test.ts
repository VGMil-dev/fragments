import { afterEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createServer, type Server } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createHttpHandler } from "../../http/app.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createPrismaMentorRepository } from "./prisma-repository.js";
import { createMentorService, MentorEvaluationFailure, type MentorEvaluator } from "./service.js";

const servers: Server[] = [];
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para Mentor HTTP PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const databases: PrismaClient[] = [];
const draft = {
  title: "Huerto de aula", problem: "El curso necesita registrar el crecimiento de las plantas.",
  solution: "Una bitácora permite anotar riegos y comparar el crecimiento de cada planta.",
  description: "Una bitácora para registrar y consultar el crecimiento de cada planta.",
  purpose: "Ayudar al curso a observar cambios en su huerto.",
  goals: ["Registrar riegos"], skills: ["TypeScript"], scope: "Una pantalla registra plantas y medidas.", constraints: ["Funciona sin conexión"],
};

async function start(evaluator: MentorEvaluator = createLocalMentorEvaluator(), logFailure?: (entry: Record<string, unknown>) => void) {
  const database = openDatabase(databaseUrl!); databases.push(database); await database.$connect();
  for (const [id, login] of [["student-1", "student-one"], ["student-2", "student-two"], ["teacher-1", "teacher-one"]]) {
    await database.user.upsert({ where: { id }, create: { id, email: `${login}@example.test`, name: login, emailVerified: true, isTeacher: id === "teacher-1", githubLogin: login }, update: { isTeacher: id === "teacher-1", githubLogin: login } });
    if (id !== "teacher-1") await database.account.upsert({ where: { providerId_accountId: { providerId: "github", accountId: `github-${id}` } }, create: { id: `account-${id}`, accountId: `github-${id}`, providerId: "github", userId: id }, update: { userId: id } });
  }
  const service = createMentorService({ evaluator, pdf: createMinimalPdfRenderer() });
  const auth = {
    handle: (_request: unknown, response: { writeHead: (status: number) => { end: (body?: string) => void } }) => { response.writeHead(503).end(); },
    async userId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-user"] ?? null; },
    async teacherId(request: { headers: Record<string, string | undefined> }) { return request.headers["x-fixture-role"] === "teacher" ? request.headers["x-fixture-user"] ?? null : null; },
    async student(request: { headers: Record<string, string | undefined> }) {
      const id = request.headers["x-fixture-user"];
      if (!id) return null;
      const row = await database.user.findFirst({ where: { id, isTeacher: false, accounts: { some: { providerId: "github" } } }, include: { accounts: { where: { providerId: "github" }, take: 1 } } });
      const account = row?.accounts[0];
      return row && account ? { id: row.id, githubAccountId: account.accountId, githubLogin: row.githubLogin, avatarUrl: row.image, registeredAt: row.createdAt.toISOString() } : null;
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
  for (const database of databases.splice(0)) {
    await database.mentorAcademicPublication.deleteMany();
    await database.proposal.deleteMany({ where: { OR: [{ ownerUserId: { in: ["student-1", "student-2"] } }, { ownerHash: { not: null } }] } });
    await database.mentorAcademicPublication.deleteMany();
    await database.mentorControlVersion.deleteMany({ where: { version: { gt: 1 } } });
    const seed = await database.mentorControlVersion.findUnique({ where: { version: 1 } });
    if (seed) await database.mentorControlDraft.upsert({
      where: { id: 1 },
      create: { id: 1, configJson: seed.configJson as never, updatedAt: seed.publishedAt },
      update: { configJson: seed.configJson as never, updatedAt: seed.publishedAt },
    });
    await database.submission.deleteMany({ where: { kind: "review", sourceId: "review-1" } });
    await database.account.deleteMany({ where: { userId: { in: ["student-1", "student-2", "teacher-1"] } } });
    await database.user.deleteMany({ where: { id: { in: ["student-1", "student-2", "teacher-1"] } } });
    await database.$disconnect();
  }
});

describePostgres("Mentor HTTP ownership, revision, and opt-in flow", () => {
  it("requires GitHub session before creating proposals and never accepts a client owner", async () => {
    const base = await start();
    const anonymous = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(draft) });
    expect(anonymous.status).toBe(401);
    const forged = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json", "x-fixture-user": "student-1" }, body: JSON.stringify({ ...draft, ownerUserId: "student-2" }) });
    expect(forged.status).toBe(400);
    expect(await databases.at(-1)!.proposal.count({ where: { ownerUserId: { in: ["student-1", "student-2"] } } })).toBe(0);
  });

  it("requires the student's session to read the account-scoped submission list", async () => {
    const base = await start();
    expect((await fetch(`${base}/api/me/submissions`)).status).toBe(401);
    const response = await fetch(`${base}/api/me/submissions`, { headers: { "x-fixture-user": "student-1" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: [] });
  });

  it("persists partial drafts by student, rejects stale versions, and never evaluates incomplete data", async () => {
    let evaluations = 0;
    const local = createLocalMentorEvaluator();
    const base = await start({ async evaluate(input) { evaluations += 1; return local.evaluate(input); } });
    const headers = { "x-fixture-user": "student-1", "content-type": "application/json" };
    const partial = { title: "Mi idea", problem: "", solution: "", description: "", purpose: "", goals: [], skills: [], scope: "", constraints: [] };
    const created = await fetch(`${base}/api/me/proposals/drafts`, { method: "POST", headers, body: JSON.stringify({ proposal: partial }) });
    expect(created.status).toBe(201);
    const createdData = (await created.json() as { data: { id: string; version: number; proposal: typeof partial } }).data;
    expect(createdData.proposal).toEqual(partial);

    const listed = await fetch(`${base}/api/me/proposals`, { headers });
    expect(listed.status).toBe(200);
    expect((await listed.json() as { data: Array<{ id: string }> }).data.map((item) => item.id)).toContain(createdData.id);
    const hiddenFromOtherStudent = await fetch(`${base}/api/me/proposals`, { headers: { "x-fixture-user": "student-2" } });
    expect((await hiddenFromOtherStudent.json() as { data: Array<{ id: string }> }).data.map((item) => item.id)).not.toContain(createdData.id);

    const incompleteEvaluation = await fetch(`${base}/api/proposals/${createdData.id}/review`, { method: "POST", headers: { "x-fixture-user": "student-1" } });
    expect(incompleteEvaluation.status).toBe(422);
    expect(evaluations).toBe(0);

    const complete = await fetch(`${base}/api/me/proposals/${createdData.id}/draft`, {
      method: "PUT", headers, body: JSON.stringify({ expectedVersion: 1, proposal: draft }),
    });
    expect(complete.status).toBe(200);
    expect((await complete.json() as { data: { version: number } }).data.version).toBe(2);
    const stale = await fetch(`${base}/api/me/proposals/${createdData.id}/draft`, {
      method: "PUT", headers, body: JSON.stringify({ expectedVersion: 1, proposal: partial }),
    });
    expect(stale.status).toBe(409);
    const otherOwnerEdit = await fetch(`${base}/api/me/proposals/${createdData.id}/draft`, {
      method: "PUT", headers: { ...headers, "x-fixture-user": "student-2" }, body: JSON.stringify({ expectedVersion: 2, proposal: partial }),
    });
    expect(otherOwnerEdit.status).toBe(404);

    const evaluated = await fetch(`${base}/api/proposals/${createdData.id}/review`, { method: "POST", headers: { "x-fixture-user": "student-1" } });
    expect(evaluated.status).toBe(200);
    expect(evaluations).toBe(1);
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
    expect(await databases.at(-1)!.mentorEvaluation.count({ where: { proposal: { ownerUserId: "student-1" } } })).toBe(1);
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
    expect(await databases.at(-1)!.mentorEvaluation.count({ where: { proposal: { ownerUserId: "student-1" } } })).toBe(0);
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
    expect(await databases.at(-1)!.mentorEvaluation.count({ where: { proposal: { ownerUserId: "student-1" } } })).toBe(0);
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
    expect(await databases.at(-1)!.mentorEvaluation.count({ where: { proposal: { ownerUserId: "student-1" } } })).toBe(1);

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
    const legacy = await createPrismaMentorRepository(database).createProposal(draft, createHash("sha256").update(token).digest("hex"));
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
    expect(await database.mentorAcademicPublication.count({ where: { proposalId: legacy.id } })).toBe(0);
  });

  it("leaves Review verification codes for the Review route", async () => {
    const base = await start();
    const database = databases.at(-1)!;
    await database.submission.create({ data: { id: `review-submission-${Date.now()}`, kind: "review", sourceId: "review-1", score: 80,
      snapshotJson: { commitSha: "a".repeat(40), findings: [], limitations: [] }, contentHash: "b".repeat(64), verificationCode: "c".repeat(32),
      rubricVersion: "review-test-v1", createdAt: new Date("2026-11-04T00:00:00.000Z") } });

    const response = await fetch(`${base}/api/verify/${"c".repeat(32)}`);
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "NOT_FOUND" } });
  });
});
