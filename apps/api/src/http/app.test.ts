import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHttpHandler } from "./app.js";
import { migrate } from "../db/migrate.js";
import { createFragmentsAuth, createFragmentsAuthService, migrateFragmentsAuth } from "../auth/better-auth.js";
import { createMentorService } from "../features/mentor/service.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "../features/mentor/local-fakes.js";
import { createInspectorService, type ReviewEvidence } from "../features/inspector/service.js";
import { createInspectorRepository } from "../features/inspector/repository.js";
import { createReviewService } from "../features/review/review.service.js";
import { createSqliteReviewStore } from "../features/review/sqlite-store.js";

const servers: ReturnType<typeof createServer>[] = [];
const databases: DatabaseSync[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  for (const db of databases.splice(0)) db.close();
});

describe("HTTP API", () => {
  it("reports SQLite readiness without exposing environment secrets", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const server = createServer(createHttpHandler(db)); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", database: "ready" } });
  });

  it("registers Review HTTP routes in the composed API and persists an enqueued job", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const store = createSqliteReviewStore(db);
    const service = createReviewService({
      repository: { async getCommitSnapshot() { throw new Error("The queued job is not processed in this test."); } },
      packer: { async pack() { throw new Error("The queued job is not processed in this test."); } },
      ai: { async analyze() { throw new Error("The queued job is not processed in this test."); } },
      evaluations: store.evaluations,
      submissions: store.submissions,
      pdf: { async render(text) { return new TextEncoder().encode(text); } },
    });
    const server = createServer(createHttpHandler(db, { review: {
      store,
      service,
      resolveContext: async (_request, input) => ({ projectId: `${input.owner}/${input.repo}`, rubricVersion: "review-test-v1", evaluatorVersion: "fake-test-v1" }),
    } }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const base = `http://127.0.0.1:${address.port}`;
    const created = await fetch(`${base}/api/reviews`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ owner: "VGMil-dev", repo: "fragments-test-app", commitSha: "a".repeat(40) }),
    });
    expect(created.status).toBe(202);
    const body = await created.json() as { data: { id: string; status: string } };
    expect(body.data.status).toBe("queued");
    expect(store.getJob(body.data.id)).toMatchObject({ status: "queued", owner: "VGMil-dev", repo: "fragments-test-app" });
    const read = await fetch(`${base}/api/reviews/${body.data.id}`);
    expect(await read.json()).toMatchObject({ ok: true, data: { id: body.data.id, status: "queued" } });
  });

  it("returns a uniform non-reflecting envelope for unknown paths", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const server = createServer(createHttpHandler(db)); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/private?token=redact-me`);
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    expect(body).not.toContain("redact-me");
  });

  it("does not expose Better Auth endpoints when authentication is not configured", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const server = createServer(createHttpHandler(db)); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/auth/get-session`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "AUTH_DISABLED" } });
  });

  it("runs the Mentor proposal-to-delivery and public verification flow", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const mentor = createMentorService({ evaluator: createLocalMentorEvaluator(), pdf: createMinimalPdfRenderer() });
    const server = createServer(createHttpHandler(db, { mentor })); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const base = `http://127.0.0.1:${address.port}`;
    const proposalResponse = await fetch(`${base}/api/proposals`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({
        title: "Huerto escolar interactivo",
        problem: "El curso no tiene una forma sencilla de registrar el crecimiento de sus plantas.",
        solution: "Una aplicación local permite registrar medidas y ver su evolución semanal.",
        goals: ["Registrar medidas", "Comparar plantas"],
        skills: ["TypeScript", "SQLite"],
        scope: "Una pantalla permite agregar y consultar medidas por planta.",
        constraints: ["Funciona sin conexión"],
      }),
    });
    expect(proposalResponse.status).toBe(201);
    const ownerCookie = proposalResponse.headers.get("set-cookie")?.split(";")[0];
    expect(ownerCookie).toMatch(/^fragments_proposal_owner=.+$/);
    const proposalBody = await proposalResponse.json() as { data: { id: string; version: number; proposal: { title: string } } };
    expect(proposalBody.data.proposal.title).toBe("Huerto escolar interactivo");

    const evaluationResponse = await fetch(`${base}/api/proposals/${proposalBody.data.id}/review`, { method: "POST", headers: { cookie: ownerCookie! } });
    expect(evaluationResponse.status).toBe(200);
    const evaluationBody = await evaluationResponse.json() as { data: { evaluationId: string; proposalVersion: number; analysis: { modelId: string }; guidance: string[] } };
    expect(evaluationBody.data.proposalVersion).toBe(1);
    expect(evaluationBody.data.analysis.modelId).toBe("fake/local-heuristic-v1");
    expect(evaluationBody.data.guidance.length).toBeGreaterThan(0);

    const submissionResponse = await fetch(`${base}/api/mentor-submissions`, {
      method: "POST", headers: { "content-type": "application/json", cookie: ownerCookie! }, body: JSON.stringify({
        proposalId: proposalBody.data.id,
        proposalVersion: proposalBody.data.version,
        evaluationId: evaluationBody.data.evaluationId,
      }),
    });
    expect(submissionResponse.status).toBe(201);
    const submissionBody = await submissionResponse.json() as { data: { id: string; verificationCode: string } };
    expect(submissionBody.data.id).toBeTruthy();

    const readme = await fetch(`${base}/api/mentor-submissions/${submissionBody.data.id}/readme`, { headers: { cookie: ownerCookie! } });
    expect(readme.headers.get("content-type")).toContain("text/markdown");
    const readmeText = await readme.text();
    expect(readmeText).toContain("# Huerto escolar interactivo");
    expect(readmeText).not.toContain("puntaje");

    const pdf = await fetch(`${base}/api/mentor-submissions/${submissionBody.data.id}/pdf`, { headers: { cookie: ownerCookie! } });
    expect(pdf.headers.get("content-type")).toBe("application/pdf");
    expect((await pdf.arrayBuffer()).byteLength).toBeGreaterThan(100);

    const verified = await fetch(`${base}/api/verify/${submissionBody.data.verificationCode}`);
    expect(verified.status).toBe(200);
    expect(await verified.json()).toMatchObject({ ok: true, data: { kind: "mentor", integrityValid: true } });
  });

  it("protects Inspector private data and persists a teacher challenge through assignment and defense", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const digest = "c".repeat(64);
    const review: ReviewEvidence = {
      id: "review-1", projectId: "project-1", commitSha: "a".repeat(40),
      snapshot: {
        owner: "student", repo: "demo", commitSha: "a".repeat(40), digest,
        files: [{ path: "src/math.ts", content: "export const add = (a, b) => a + b;\n", sha: "d".repeat(40) }],
      },
      analysis: {
        rubricVersion: "review-1", score: 80, limitations: [], modelId: "fake/review", inputDigest: digest,
        findings: [{
          criterionId: "correctness", status: "verified", evidence: [{ source: "repository", path: "src/math.ts", lines: [1, 1], digest }],
          file: "src/math.ts", lines: [1, 1], reason: "La función suma los valores.", guidanceLevel: 1,
        }],
      },
    };
    const inspector = createInspectorService({
      reviews: {
        async getById(id) { return id === review.id ? review : null; },
        async getLatestCommit() { return review.commitSha; },
      },
      provider: { async createChallenge() {
        return {
          precondition: "Existe una función de suma.", mutation: "Invierte temporalmente la operación.",
          demonstration: "Prueba un par de valores.", restoration: "Restaura la suma.", estimatedMinutes: 10,
          teacherHint: "Compara el operador aritmético.",
        };
      } },
      store: createInspectorRepository(db),
      createId: () => "challenge-1",
      now: () => new Date("2026-11-04T12:00:00.000Z"),
    });
    const authInstance = createFragmentsAuth(db, {
      secret: "http-test-better-auth-secret-0123456789",
      allowSignUp: true,
    });
    await migrateFragmentsAuth(authInstance);
    const auth = createFragmentsAuthService(authInstance);
    const server = createServer(createHttpHandler(db, { auth, inspector })); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const base = `http://127.0.0.1:${address.port}`;

    const unauthorized = await fetch(`${base}/api/inspector/review-1/challenges`, { method: "POST" });
    expect(unauthorized.status).toBe(401);
    expect(await unauthorized.text()).not.toContain("teacherHint");

    const signup = await fetch(`${base}/api/auth/sign-up/email`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docente de prueba", email: "teacher@example.test", password: "fixture-password-2026" }),
    });
    expect(signup.status).toBe(200);
    const signupBody = await signup.json() as { user: { id: string } };
    db.prepare("UPDATE user SET isTeacher = 1 WHERE id = ?").run(signupBody.user.id);
    const login = await fetch(`${base}/api/auth/sign-in/email`, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "teacher@example.test", password: "fixture-password-2026" }),
    });
    expect(login.status).toBe(200);
    const setCookies = login.headers.getSetCookie();
    const cookie = setCookies.map((part) => part.split(";", 1)[0]).join("; ");
    expect(cookie).toContain("session_token=");
    const headers = { cookie, "content-type": "application/json" };
    const createdResponse = await fetch(`${base}/api/inspector/review-1/challenges`, { method: "POST", headers });
    expect(createdResponse.status).toBe(201);
    const createdBody = await createdResponse.json() as { data: { id: string; challenge: { teacherHint: string }; status: string } };
    expect(createdBody.data.challenge.teacherHint).toContain("operador");
    expect(createdBody.data.status).toBe("pending");

    const assignedResponse = await fetch(`${base}/api/inspector/challenges/challenge-1/assign`, { method: "POST", headers, body: "{}" });
    expect(assignedResponse.status).toBe(200);
    const recordedResponse = await fetch(`${base}/api/inspector/challenges/challenge-1/record`, {
      method: "POST", headers, body: JSON.stringify({ mutationObserved: true, restorationConfirmed: true, notes: "Se explicó y restauró." }),
    });
    expect(recordedResponse.status).toBe(200);
    expect(await recordedResponse.json()).toMatchObject({ ok: true, data: { status: "completed", defense: { mutationObserved: true, restorationConfirmed: true } } });

    const listResponse = await fetch(`${base}/api/inspector/review-1/challenges`, { headers: { cookie: headers.cookie } });
    const listed = await listResponse.text();
    expect(listResponse.status).toBe(200);
    expect(listed).toContain("teacherHint");
    expect(listed).toContain("Se explicó y restauró.");
    expect(listResponse.headers.get("cache-control")).toBe("no-store");

    const logout = await fetch(`${base}/api/auth/sign-out`, { method: "POST", headers: { cookie } });
    expect(logout.status).toBe(200);
    const afterLogout = await fetch(`${base}/api/inspector/review-1/challenges`, { headers: { cookie } });
    expect(afterLogout.status).toBe(401);
  });
});
