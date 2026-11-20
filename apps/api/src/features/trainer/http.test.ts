import { randomUUID } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { createApiServer } from "../../http/app.js";
import { digestSnapshot } from "../review/review.service.js";
import { createTrainerRepository } from "./repository.js";
import { createTrainerService } from "./service.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Trainer HTTP con PostgreSQL.");
const describePostgres = databaseUrl ? describe : describe.skip;
describePostgres("Trainer HTTP — PostgreSQL integration", () => {
  let server: ReturnType<typeof createApiServer> | undefined;
  let db: PrismaClient | undefined;
  const reviewId = `review-${randomUUID()}`;
  afterEach(async () => { if (server) await new Promise<void>((resolve) => server!.close(() => resolve())); if (db) { await db.trainerSession.deleteMany({ where: { attempts: { some: { reviewId } } } }); await db.trainerBank.deleteMany({ where: { reviewId } }); await db.$disconnect(); } server = undefined; db = undefined; });

  it("keeps hints public-only and scopes attempts to the HttpOnly browser session", async () => {
    db = openDatabase(databaseUrl!); await db.$connect();
    const sha = "d".repeat(40);
    const snapshotBody = { owner: "classroom", repo: "demo", commitSha: sha, files: [{ path: "src/x.ts", content: "const x = 1;\n", sha: "e".repeat(40) }] };
    const digest = await digestSnapshot(snapshotBody);
    const review = { id: "review-1", projectId: "classroom/demo", owner: "classroom", repo: "demo", commitSha: sha, snapshot: { ...snapshotBody, digest }, analysis: { rubricVersion: "v1", score: 80, findings: [{ criterionId: "x", status: "verified" as const, evidence: [{ source: "repository" as const, path: "src/x.ts", lines: [1, 1] as [number, number], digest }], reason: "x funciona.", guidanceLevel: 1 as const }], limitations: [], modelId: "fake-provider:test", inputDigest: "f".repeat(64) } };
    const store = createTrainerRepository(db);
    const service = createTrainerService({
      reviews: { listCompleted: async (studentId) => studentId === "student-a" ? [{ id: reviewId, owner: "classroom", repo: "demo", commitSha: sha, updatedAt: new Date().toISOString() }] : [], getEvidence: async () => ({ ...review, id: reviewId }) },
      provider: { async createChallenge() { return { precondition: "x", mutation: "Cambia x temporalmente.", demonstration: "Observa x.", restoration: "Restaura x.", estimatedMinutes: 10, teacherHint: "PRIVATE_INSPECTOR_ONLY" }; } },
      store,
    });
    const auth = { async student(request: { headers: Record<string, string | string[] | undefined> }) { const id = request.headers["x-student-id"]; return typeof id === "string" ? { id } : null; } } as never;
    server = createApiServer(db, { trainer: { service, store }, auth });
    await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("No se pudo iniciar el servidor de prueba.");
    const base = `http://127.0.0.1:${address.port}`;
    expect((await fetch(`${base}/api/trainer/reviews`)).status).toBe(401);
    await expect(fetch(`${base}/api/trainer/reviews`, { headers: { "x-student-id": "student-b" } }).then((response) => response.json())).resolves.toMatchObject({ data: [] });
    const foreignDraw = await fetch(`${base}/api/trainer/draw`, { method: "POST", headers: { "content-type": "application/json", "x-student-id": "student-b" }, body: JSON.stringify({ reviewId }) });
    expect(foreignDraw.status).toBe(404);
    const drawn = await fetch(`${base}/api/trainer/draw`, { method: "POST", headers: { "content-type": "application/json", "x-student-id": "student-a" }, body: JSON.stringify({ reviewId }) });
    const cookie = drawn.headers.get("set-cookie") ?? "";
    const drawnBody = await drawn.json() as { ok: boolean; data: { challenge: { id: string }; category: string; bankSize: number } };
    expect(drawn.status).toBe(200);
    expect(drawnBody.data.bankSize).toBe(1);
    expect(cookie).toContain("HttpOnly");
    expect(JSON.stringify(drawnBody)).not.toContain("PRIVATE_INSPECTOR_ONLY");
    const recorded = await fetch(`${base}/api/trainer/attempts`, { method: "POST", headers: { "content-type": "application/json", cookie: cookie.split(";")[0]!, "x-student-id": "student-a" }, body: JSON.stringify({ reviewId, challengeId: drawnBody.data.challenge.id, status: "completed", hintsUsed: 1 }) });
    if (recorded.status !== 201) throw new Error(JSON.stringify(await recorded.json()));
    expect(recorded.status).toBe(201);
    const ownHistory = await fetch(`${base}/api/trainer/history?reviewId=${reviewId}`, { headers: { cookie: cookie.split(";")[0]!, "x-student-id": "student-a" } });
    const otherHistory = await fetch(`${base}/api/trainer/history?reviewId=${reviewId}`, { headers: { cookie: cookie.split(";")[0]!, "x-student-id": "student-b" } });
    expect((await ownHistory.json() as { data: unknown[] }).data).toHaveLength(1);
    expect((await otherHistory.json() as { data: unknown[] }).data).toEqual([]);
  });
});
