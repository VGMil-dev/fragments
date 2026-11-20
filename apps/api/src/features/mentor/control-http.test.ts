import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createMentorControlHttp } from "./control-http.js";
import { createMentorHttp } from "./http.js";
import { createMinimalPdfRenderer } from "./local-fakes.js";
import { createMentorService, type MentorEvaluator } from "./service.js";

const servers: Server[] = [];
const databases: PrismaClient[] = [];
const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Mentor control con PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID();
const studentId = `student-fixture-${namespace}`;
const teacherId = `teacher-fixture-${namespace}`;
const proposalDraft = {
  title: "Mapa de plantas", problem: "El grupo no recuerda dónde sembró cada planta.",
  solution: "Un mapa local registra cada siembra.", description: "Un mapa local para ubicar plantas.", purpose: "Ayudar al grupo a cuidar el jardín.", goals: ["Ubicar las plantas"], skills: ["TypeScript"], tags: [],
  scope: "Registrar y consultar plantas en un aula.", constraints: ["Funciona sin conexión"],
};

async function start(evaluator: MentorEvaluator) {
  const database = openDatabase(databaseUrl!); databases.push(database); await database.$connect();
  await database.user.createMany({ data: [
    { id: studentId, name: "Student fixture", email: `${studentId}@fixture.test`, emailVerified: true, githubLogin: "student-fixture" },
    { id: teacherId, name: "Teacher fixture", email: `${teacherId}@fixture.test`, emailVerified: true, isTeacher: true },
  ] });
  await database.account.create({ data: { id: `account-${namespace}`, accountId: `github-stable-${namespace}`, providerId: "github", userId: studentId } });
  const auth = {
    async teacherId(request: { headers: { cookie?: string } }) { return request.headers.cookie === "teacher_session=fake" ? teacherId : null; },
    handle() {},
    async userId(request: { headers: { [key: string]: string | undefined } }) { return request.headers["x-fixture-user"] ?? (request.headers.cookie === "teacher_session=fake" ? teacherId : null); },
    async student(request: { headers: { [key: string]: string | undefined } }) { return request.headers["x-fixture-user"] === studentId ? { id: studentId, githubAccountId: `github-stable-${namespace}`, githubLogin: "student-fixture", avatarUrl: null, registeredAt: new Date().toISOString() } : null; },
  } as never;
  const service = createMentorService({ evaluator, pdf: createMinimalPdfRenderer() });
  const control = createMentorControlHttp(database, auth);
  const mentor = createMentorHttp(database, service, { auth });
  const server = createServer(async (request, response) => {
    if (await control(request, response) === "handled") return;
    if (await mentor(request, response) === "unhandled") response.writeHead(404).end();
  });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Expected TCP address");
  return `http://127.0.0.1:${address.port}`;
}

afterEach(async () => {
  for (const server of servers.splice(0)) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  for (const database of databases.splice(0)) {
    await database.proposal.deleteMany({ where: { ownerUserId: studentId } });
    await database.mentorControlDraft.deleteMany();
    await database.mentorControlVersion.deleteMany();
    await database.account.deleteMany({ where: { userId: { in: [studentId, teacherId] } } });
    await database.user.deleteMany({ where: { id: { in: [studentId, teacherId] } } });
    await database.$disconnect();
  }
});

describePostgres("control docente de Mentor — PostgreSQL integration", () => {
  it("protege el control, publica versiones inmutables y conserva la nota histórica", async () => {
    let calls = 0;
    const evaluator: MentorEvaluator = {
      async evaluate(input) {
        calls += 1;
        return {
          findings: input.config.criteria.map((criterion) => ({
            criterionId: criterion.id,
            status: calls === 1 ? "not_verified" as const : "verified" as const,
            evidence: [{ source: "proposal" as const, field: "scope", digest: input.proposalDigest }],
            reason: "Etiqueta devuelta por fake-provider:mentor-control-fixture.", guidanceLevel: 2,
          })),
          limitations: [], modelId: "fake-provider:mentor-control-fixture", inputDigest: input.proposalDigest,
          guidance: ["Aclara cómo comprobarías el resultado."], similarities: [],
        };
      },
    };
    const base = await start(evaluator);
    const denied = await fetch(`${base}/api/teacher/mentor-control`);
    expect(denied.status).toBe(401);

    const teacher = { cookie: "teacher_session=fake", "content-type": "application/json" };
    const initialResponse = await fetch(`${base}/api/teacher/mentor-control`, { headers: teacher });
    const initial = await initialResponse.json() as { data: { active: { version: number }; draft: { config: { topic: string; criteria: Array<{ weight: number }> } } } };
    expect(initialResponse.status).toBe(200);
    expect(initial.data.active.version).toBe(1);

    const config = {
      ...initial.data.draft.config, theme: "Huerto escolar", rubricTitle: "MVP de aula",
      criteria: [{ id: "scope", title: "Alcance", description: "Se puede construir en el curso.", weight: 100 }],
    };
    const saved = await fetch(`${base}/api/teacher/mentor-control/draft`, { method: "PUT", headers: teacher, body: JSON.stringify(config) });
    expect(saved.status).toBe(200);
    const published = await fetch(`${base}/api/teacher/mentor-control/publish`, { method: "POST", headers: teacher, body: "{}" });
    expect(published.status).toBe(201);
    expect((await published.json() as { data: { version: number } }).data.version).toBe(2);

    const create = await fetch(`${base}/api/proposals`, { method: "POST", headers: { "content-type": "application/json", "x-fixture-user": studentId }, body: JSON.stringify(proposalDraft) });
    expect(create.status).toBe(201);
    const proposal = await create.json() as { data: { id: string; version: number } };
    const evaluationUrl = `${base}/api/proposals/${proposal.data.id}/review`;
    const student = { "x-fixture-user": studentId };
    const first = await fetch(evaluationUrl, { method: "POST", headers: student });
    const firstBody = await first.json() as { data: { evaluationId: string; analysis: { score: number; rubricVersion: string }; mentorContextVersion?: number; criterionBreakdown?: Array<{ weight: number; points: number }> } };
    const repeated = await fetch(evaluationUrl, { method: "POST", headers: student });
    const repeatedBody = await repeated.json() as typeof firstBody;
    expect(first.status).toBe(200);
    expect(firstBody.data.analysis.score).toBe(50);
    expect(firstBody.data.mentorContextVersion).toBe(2);
    expect(firstBody.data.criterionBreakdown).toEqual([expect.objectContaining({ weight: 100, points: 50 })]);
    expect(repeatedBody.data.evaluationId).toBe(firstBody.data.evaluationId);
    expect(calls).toBe(1);

    const secondConfig = { ...config, assignment: "Añade una prueba de consulta." };
    expect((await fetch(`${base}/api/teacher/mentor-control/draft`, { method: "PUT", headers: teacher, body: JSON.stringify(secondConfig) })).status).toBe(200);
    expect((await fetch(`${base}/api/teacher/mentor-control/publish`, { method: "POST", headers: teacher, body: "{}" })).status).toBe(201);
    const second = await fetch(evaluationUrl, { method: "POST", headers: student });
    expect((await second.json() as { data: { analysis: { score: number }; mentorContextVersion: number } }).data).toMatchObject({ analysis: { score: 100 }, mentorContextVersion: 3 });
    expect(calls).toBe(2);

    const historyResponse = await fetch(`${base}/api/teacher/mentor-control`, { headers: teacher });
    const history = await historyResponse.json() as { data: { evaluations: Array<{ evaluation: { analysis: { score: number }; mentorContextVersion?: number; criterionBreakdown?: Array<{ points: number }> } }> } };
    expect(history.data.evaluations.map((row) => [row.evaluation.mentorContextVersion, row.evaluation.analysis.score])).toEqual([[3, 100], [2, 50]]);
  });

  it("rechaza publicación si los pesos no suman cien", async () => {
    const base = await start({
      async evaluate(input) { return { findings: input.config.criteria.map((criterion) => ({ criterionId: criterion.id, status: "verified" as const, evidence: [{ source: "proposal" as const, field: "scope", digest: input.proposalDigest }], reason: "fake", guidanceLevel: 1 })), limitations: [], modelId: "fake-provider:mentor-control-fixture", inputDigest: input.proposalDigest, guidance: [], similarities: [] }; },
    });
    const teacher = { cookie: "teacher_session=fake", "content-type": "application/json" };
    const current = await (await fetch(`${base}/api/teacher/mentor-control`, { headers: teacher })).json() as { data: { draft: { config: Record<string, unknown> } } };
    const config = { ...current.data.draft.config, criteria: [{ id: "scope", title: "Alcance", description: "Alcance", weight: 90 }] };
    await fetch(`${base}/api/teacher/mentor-control/draft`, { method: "PUT", headers: teacher, body: JSON.stringify(config) });
    expect((await fetch(`${base}/api/teacher/mentor-control/publish`, { method: "POST", headers: teacher, body: "{}" })).status).toBe(400);
  });
});
