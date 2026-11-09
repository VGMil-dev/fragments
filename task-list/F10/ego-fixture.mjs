import { DatabaseSync } from "node:sqlite";
import { digestSnapshot } from "../../apps/api/src/features/review/review.service.ts";
import { createTrainerRepository } from "../../apps/api/src/features/trainer/repository.ts";
import { createTrainerService } from "../../apps/api/src/features/trainer/service.ts";
import { migrate } from "../../apps/api/src/db/migrate.ts";
import { createApiServer } from "../../apps/api/src/http/app.ts";

const commitSha = "a".repeat(40);
const snapshotBody = {
  owner: "fragments-fixture", repo: "trainer-demo", commitSha,
  files: [{ path: "src/search.ts", content: "export function search(term: string, items: string[]) {\n  const query = term.trim().toLowerCase();\n  return items.filter((item) => item.toLowerCase().includes(query));\n}\n", sha: "b".repeat(40) }],
};
const digest = await digestSnapshot(snapshotBody);
const review = {
  id: "fixture-review-1", projectId: "fragments-fixture/trainer-demo", owner: snapshotBody.owner, repo: snapshotBody.repo,
  commitSha, snapshot: { ...snapshotBody, digest },
  analysis: {
    rubricVersion: "review-v1", score: 80,
    findings: [{ criterionId: "search-behavior", status: "verified", evidence: [{ source: "repository", path: "src/search.ts", lines: [1, 4], digest }], file: "src/search.ts", lines: [1, 4], reason: "La búsqueda ignora mayúsculas y espacios en los extremos.", guidanceLevel: 1 }],
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
    async createChallenge() {
      return {
        precondition: "El filtro normaliza la consulta.",
        mutation: "Modifica temporalmente la búsqueda para que ignore los espacios iniciales, pero no los finales. Muestra el efecto y restaura el comportamiento original.",
        demonstration: "Prueba consultas con espacios iniciales y finales y compara los resultados.",
        restoration: "Restaura la normalización original antes de cerrar la práctica.",
        estimatedMinutes: 15,
        teacherHint: "FAKE_PRIVATE_HINT_DO_NOT_LEAK",
      };
    },
  },
  store,
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
