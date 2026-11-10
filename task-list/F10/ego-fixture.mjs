import { DatabaseSync } from "node:sqlite";
import { digestSnapshot } from "../../apps/api/src/features/review/review.service.ts";
import { createTrainerRepository } from "../../apps/api/src/features/trainer/repository.ts";
import { createTrainerService } from "../../apps/api/src/features/trainer/service.ts";
import { migrate } from "../../apps/api/src/db/migrate.ts";
import { createApiServer } from "../../apps/api/src/http/app.ts";

const commitSha = "a".repeat(40);
const snapshotBody = {
  owner: "fragments-fixture", repo: "trainer-demo", commitSha,
  files: [
    { path: "src/search.ts", content: "export function search(term: string, items: string[]) {\n  const query = term.trim().toLowerCase();\n  return items.filter((item) => item.toLowerCase().includes(query));\n}\n", sha: "b".repeat(40) },
    { path: "src/validation.ts", content: "export function isValidName(value: string) {\n  return value.trim().length > 0;\n}\n", sha: "d".repeat(40) },
    { path: "tests/search.test.ts", content: "it('ignora espacios alrededor', () => {\n  expect(search(' agua ', ['Agua'])).toEqual(['Agua']);\n});\n", sha: "e".repeat(40) },
  ],
};
const digest = await digestSnapshot(snapshotBody);
const review = {
  id: "fixture-review-1", projectId: "fragments-fixture/trainer-demo", owner: snapshotBody.owner, repo: snapshotBody.repo,
  commitSha, snapshot: { ...snapshotBody, digest },
  analysis: {
    rubricVersion: "review-v1", score: 80,
    findings: [
      { criterionId: "search-behavior", status: "verified", evidence: [{ source: "repository", path: "src/search.ts", lines: [1, 4], digest }], file: "src/search.ts", lines: [1, 4], reason: "La búsqueda ignora mayúsculas y espacios en los extremos.", guidanceLevel: 1 },
      { criterionId: "input-validation", status: "verified", evidence: [{ source: "repository", path: "src/validation.ts", lines: [1, 3], digest }], file: "src/validation.ts", lines: [1, 3], reason: "El nombre vacío o con espacios se rechaza después de trim.", guidanceLevel: 1 },
      { criterionId: "search-tests", status: "verified", evidence: [{ source: "repository", path: "tests/search.test.ts", lines: [1, 3], digest }], file: "tests/search.test.ts", lines: [1, 3], reason: "La prueba comprueba espacios al inicio y al final de la consulta.", guidanceLevel: 1 },
    ],
    limitations: [], modelId: "fake-provider:ego-fixture", inputDigest: "c".repeat(64),
  },
};

const database = new DatabaseSync(":memory:");
migrate(database);
const store = createTrainerRepository(database);
const trainer = createTrainerService({
  reviews: {
    async listCompleted() { return [{ id: review.id, owner: review.owner, repo: review.repo, commitSha, updatedAt: "2026-11-08T12:00:00.000Z" }]; },
    async getEvidence(id) { return id === review.id ? review : null; },
  },
  provider: {
    async createChallenge(input) {
      return {
        precondition: "El filtro normaliza la consulta.",
        mutation: `Modifica temporalmente ${input.evidence.path} para comprobar el hallazgo de Review. Demuestra el cambio y restaura el comportamiento.`,
        demonstration: `Comprueba en ${input.evidence.path} el comportamiento indicado por Review.`,
        restoration: `Restaura el comportamiento original de ${input.evidence.path} antes de cerrar la práctica.`,
        estimatedMinutes: 15,
        teacherHint: "FAKE_PRIVATE_HINT_DO_NOT_LEAK",
      };
    },
  },
  store,
  random: () => 0,
});
const auth = {
  async teacherId() { return null; },
  handle(_request, response) {
    response.writeHead(503, { "content-type": "application/json; charset=utf-8" });
    response.end(JSON.stringify({ ok: false, error: { code: "AUTH_DISABLED", message: "El acceso docente no está habilitado." } }));
  },
};
const server = createApiServer(database, { trainer: { service: trainer, store }, inspector: {}, auth });
server.listen(3000, "127.0.0.1", () => process.stdout.write("Ego fixture API listo en 127.0.0.1:3000; provider: fake etiquetado; Review: fixture local.\n"));
function close() { server.close(() => { database.close(); process.exit(0); }); }
process.once("SIGINT", close);
process.once("SIGTERM", close);
