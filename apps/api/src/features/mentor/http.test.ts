import { afterEach, describe, expect, it } from "vitest";
import { createServer, type Server } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./local-fakes.js";
import { createMentorHttp } from "./http.js";
import { createMentorService } from "./service.js";

const servers: Server[] = [];
const databases: DatabaseSync[] = [];
const draft = {
  title: "Huerto de aula", problem: "El curso necesita registrar el crecimiento de las plantas.",
  solution: "Una bitácora permite anotar riegos y comparar el crecimiento de cada planta.",
  goals: ["Registrar riegos"], skills: ["TypeScript"], scope: "Una pantalla registra plantas y medidas.", constraints: ["Funciona sin conexión"],
};

async function start() {
  const database = new DatabaseSync(":memory:"); databases.push(database);
  database.exec(`
    CREATE TABLE proposals (id TEXT PRIMARY KEY, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, updated_at TEXT NOT NULL, owner_hash TEXT NOT NULL);
    CREATE TABLE proposal_revisions (proposal_id TEXT NOT NULL, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY(proposal_id, version));
    CREATE TABLE mentor_gallery_optins (proposal_id TEXT PRIMARY KEY, proposal_version INTEGER NOT NULL, opted_in INTEGER NOT NULL, updated_at TEXT NOT NULL);
    CREATE TABLE mentor_evaluations (id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL, proposal_version INTEGER NOT NULL, evaluation_json TEXT NOT NULL, evaluated_at TEXT NOT NULL);
    CREATE TABLE submissions (id TEXT PRIMARY KEY, kind TEXT NOT NULL, source_id TEXT NOT NULL, score REAL NOT NULL, snapshot_json TEXT NOT NULL, content_hash TEXT NOT NULL, verification_code TEXT NOT NULL, rubric_version TEXT NOT NULL, created_at TEXT NOT NULL);
  `);
  const service = createMentorService({ evaluator: createLocalMentorEvaluator(), pdf: createMinimalPdfRenderer() });
  const server = createServer(async (request, response) => { await createMentorHttp(database, service)(request, response); });
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
});
