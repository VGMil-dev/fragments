/**
 * Local-only F16 browser fixture server.
 * Run after `pnpm --filter @fragments/api build` with `node
 * task-list/F16/qa-fixtures/api-server.mjs`. It binds loopback only, uses an
 * in-memory database, creates labelled test identities, and injects fake
 * repository/AI/PDF providers. It never reads .env or calls external services.
 */
import { randomUUID } from "node:crypto";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "../../../apps/api/dist/db/migrate.js";
import { createMigratedFragmentsAuth, createFragmentsAuthService } from "../../../apps/api/dist/auth/better-auth.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "../../../apps/api/dist/features/mentor/local-fakes.js";
import { createMentorService } from "../../../apps/api/dist/features/mentor/service.js";
import { createSqliteReviewStore } from "../../../apps/api/dist/features/review/sqlite-store.js";
import { createReviewService, digestSnapshot, sha256 } from "../../../apps/api/dist/features/review/review.service.js";
import { createReviewWorker } from "../../../apps/api/dist/features/review/worker.js";
import { createTrainerRepository } from "../../../apps/api/dist/features/trainer/repository.js";
import { createTrainerService } from "../../../apps/api/dist/features/trainer/service.js";
import { createInspectorReviewAdapter } from "../../../apps/api/dist/features/inspector/review-adapter.js";
import { createInspectorRepository } from "../../../apps/api/dist/features/inspector/repository.js";
import { createInspectorService } from "../../../apps/api/dist/features/inspector/service.js";
import { createApiServer } from "../../../apps/api/dist/http/app.js";

for (const key of ["GITHUB_CLIENT_ID", "GITHUB_CLIENT_SECRET", "GITHUB_TOKEN", "AI_GATEWAY_API_KEY", "RESEND_API_KEY"]) {
  delete process.env[key];
}

const port = 3000;
const host = "127.0.0.1";
const authSecret = "F16_LOCAL_FIXTURE_ONLY_SECRET_2026_NO_EXTERNAL";
const fixturePassword = "F16-local-fixture-password-2026!";
const database = new DatabaseSync(":memory:");
migrate(database);

const authInstance = await createMigratedFragmentsAuth(database, {
  secret: authSecret,
  baseURL: `http://${host}:${port}`,
  publicAppURL: "http://127.0.0.1:5173",
  allowSignUp: true,
});
const auth = createFragmentsAuthService(authInstance);

const student = await authInstance.api.signUpEmail({ body: {
  name: "F16 Student Fixture", email: "f16-student@example.test", password: fixturePassword,
} });
const teacher = await authInstance.api.signUpEmail({ body: {
  name: "F16 Teacher Fixture", email: "f16-teacher@example.test", password: fixturePassword,
} });
database.prepare("UPDATE user SET githubLogin = ? WHERE id = ?").run("f16-student-fixture", student.user.id);
database.prepare(`INSERT INTO account (id, accountId, providerId, userId, createdAt, updatedAt)
  VALUES (?, ?, 'github', ?, ?, ?)`)
  .run("f16-github-fixture", "fixture-github-user-id", student.user.id, Date.now(), Date.now());
database.prepare("UPDATE user SET isTeacher = 1 WHERE id = ?").run(teacher.user.id);

const mentor = createMentorService({ evaluator: createLocalMentorEvaluator(), pdf: createMinimalPdfRenderer() });
const reviewStore = createSqliteReviewStore(database);
const fixtureRepository = {
  async getCommitSnapshot(input) {
    const content = {
      owner: input.owner,
      repo: input.repo,
      commitSha: input.commitSha,
      files: [{
        path: "src/example.ts",
        content: "export const total = (values: number[]) => values.reduce((sum, value) => sum + value, 0);\n",
        sha: "b".repeat(40),
      }],
    };
    return { ...content, digest: await digestSnapshot(content) };
  },
};
const reviewService = createReviewService({
  repository: fixtureRepository,
  packer: { async pack(snapshot) {
    const text = `F16 labeled fake repository fixture: ${snapshot.files[0]?.path ?? "empty"}`;
    return { text, inputDigest: await sha256(text), tokenCount: 12 };
  } },
  ai: { async analyze(input) {
    const snapshot = await fixtureRepository.getCommitSnapshot({
      owner: "f16-fixture", repo: "f16-demo", commitSha: "a".repeat(40),
    });
    return {
      rubricVersion: input.rubricVersion,
      score: 82,
      findings: [{
        criterionId: "fixture-total",
        status: "verified",
        evidence: [{ source: "repository", path: "src/example.ts", lines: [1, 1], digest: snapshot.digest }],
        file: "src/example.ts", lines: [1, 1],
        reason: "La suma está respaldada por el archivo de ejemplo local.",
        guidanceLevel: 1,
      }],
      limitations: ["Resultado sintético de QA F16; no es una revisión de GitHub."],
      modelId: "fake/f16-local-review-v1",
      inputDigest: input.inputDigest,
    };
  } },
  evaluations: reviewStore.evaluations,
  submissions: reviewStore.submissions,
  pdf: { async render(text) { return new TextEncoder().encode(`%PDF-1.4\n${text}\n%%EOF`); } },
  aiBudget: { maxOutputTokens: 512, timeoutMs: 5_000 },
});
const trainerStore = createTrainerRepository(database);
const inspectorReviews = createInspectorReviewAdapter({
  reviews: { getById: reviewStore.getById, getLatestCommit: reviewStore.getLatestCommit },
  repository: fixtureRepository,
});
const fakeChallengeProvider = {
  async createChallenge(input) {
    return {
      precondition: "Este reto usa el archivo sintético de QA F16.",
      mutation: `Cambia temporalmente el comportamiento de ${input.evidence.path} y observa el resultado.`,
      demonstration: "Describe qué cambia en el resultado del ejemplo.",
      restoration: "Restaura el cambio temporal al terminar.",
      estimatedMinutes: 10,
      teacherHint: "Pista privada de fixture; no debe mostrarse en Trainer.",
    };
  },
};
const trainer = createTrainerService({
  reviews: { listCompleted: reviewStore.listCompleted, getEvidence: inspectorReviews.getById },
  provider: fakeChallengeProvider,
  store: trainerStore,
  random: () => 0.99,
});
const inspector = createInspectorService({
  reviews: inspectorReviews,
  practicedFeatures: async (reviewId) => trainerStore.practicedFeatures(reviewId),
  provider: fakeChallengeProvider,
  store: createInspectorRepository(database),
});
const review = {
  store: reviewStore,
  service: reviewService,
  resolveContext: async (_request, input) => ({
    projectId: `${input.owner}/${input.repo}`.toLowerCase(),
    rubricVersion: "f16-fixture-v1",
    evaluatorVersion: "fake/f16-local-v1",
  }),
};

const server = createApiServer(database, {
  auth, mentor, review, inspector, trainer: { service: trainer, store: trainerStore },
});
server.listen(port, host, () => {
  process.stdout.write("F16 fixture API ready on loopback; in-memory DB; all AI/repository/PDF providers are labeled fake.\n");
});
const worker = createReviewWorker({ store: reviewStore, service: reviewService, workerId: `f16-fixture-${randomUUID()}` });
const workerTimer = setInterval(() => { void worker.runOnce().catch(() => {}); }, 100);
workerTimer.unref?.();

function shutdown() {
  clearInterval(workerTimer);
  server.close(() => { database.close(); process.exit(0); });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
