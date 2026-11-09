import { randomUUID } from "node:crypto";
import { createGatewayInspectorProvider } from "./adapters/ai/gateway-inspector-provider.js";
import { createGatewayMentorEvaluator } from "./adapters/ai/gateway-mentor-evaluator.js";
import { SqliteAiBudgetLedger } from "./adapters/ai/budget-ledger.js";
import { createGatewayReviewAiProvider } from "./adapters/ai/gateway-review-provider.js";
import { createPdfRenderer } from "./adapters/ai/pdf-renderer.js";
import { createGitHubRestRepositoryReader } from "./adapters/github/github-rest-client.js";
import { runOfficialRepomix } from "./adapters/repomix/official-runner.js";
import { createRepomixRepositoryPacker } from "./adapters/repomix/repomix.repository-packer.js";
import { createMigratedFragmentsAuth, createFragmentsAuthService } from "./auth/better-auth.js";
import { createInspectorReviewAdapter } from "./features/inspector/review-adapter.js";
import { createInspectorRepository } from "./features/inspector/repository.js";
import { createInspectorService } from "./features/inspector/service.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./features/mentor/local-fakes.js";
import { createMentorService } from "./features/mentor/service.js";
import { createReviewService } from "./features/review/review.service.js";
import { createSqliteReviewStore } from "./features/review/sqlite-store.js";
import { createReviewWorker } from "./features/review/worker.js";
import { createTrainerRepository } from "./features/trainer/repository.js";
import { createTrainerService } from "./features/trainer/service.js";
import { openDatabase } from "./db/open.js";
import { createApiServer } from "./http/app.js";
import { loadConfig } from "./platform/config.js";

const config = loadConfig();
const database = openDatabase(config.databasePath);
const ledger = new SqliteAiBudgetLedger(database);
const rates = config.aiGatewayMaxInputUsdPerMillion !== undefined && config.aiGatewayMaxOutputUsdPerMillion !== undefined
  ? { inputUsdPerMillion: config.aiGatewayMaxInputUsdPerMillion, outputUsdPerMillion: config.aiGatewayMaxOutputUsdPerMillion }
  : undefined;
const github = createGitHubRestRepositoryReader(process.env.GITHUB_TOKEN ? { token: process.env.GITHUB_TOKEN } : {});
const pdf = createPdfRenderer();
const mentorPdf = createMinimalPdfRenderer();
const repomix = createRepomixRepositoryPacker(runOfficialRepomix);

const mentor = createMentorService({
  evaluator: config.aiGatewayKeyConfigured
    ? createGatewayMentorEvaluator({ ...(config.aiGatewayModel ? { modelId: config.aiGatewayModel } : {}), ...(config.aiGatewayProviderOnly ? { providerOnly: config.aiGatewayProviderOnly } : {}), gatewayKeyConfigured: true, ...(rates ? { rates } : {}), ledger })
    : createLocalMentorEvaluator(),
  pdf: mentorPdf,
});

const reviewStore = createSqliteReviewStore(database);
const reviewService = createReviewService({
  repository: { getCommitSnapshot: (input, options) => github.readCommitSnapshot(input, options) },
  packer: repomix,
  ai: createGatewayReviewAiProvider({ ...(config.aiGatewayModel ? { modelId: config.aiGatewayModel } : {}), ...(config.aiGatewayProviderOnly ? { providerOnly: config.aiGatewayProviderOnly } : {}), gatewayKeyConfigured: config.aiGatewayKeyConfigured, ...(rates ? { rates } : {}), ledger }),
  evaluations: reviewStore.evaluations,
  submissions: reviewStore.submissions,
  pdf,
  aiBudget: { maxOutputTokens: 2_000, timeoutMs: 30_000 },
});

const inspectorReviews = createInspectorReviewAdapter({
  reviews: {
    getById: reviewStore.getById,
    getLatestCommit: reviewStore.getLatestCommit,
  },
  repository: { getCommitSnapshot: (input) => github.readCommitSnapshot(input) },
});
const gatewayInspectorProvider = createGatewayInspectorProvider({
  ...(config.aiGatewayModel ? { modelId: config.aiGatewayModel } : {}),
  ...(config.aiGatewayProviderOnly ? { providerOnly: config.aiGatewayProviderOnly } : {}),
  gatewayKeyConfigured: config.aiGatewayKeyConfigured,
  ...(rates ? { rates } : {}),
  ledger,
});
const trainerStore = createTrainerRepository(database);
const inspector = createInspectorService({
  reviews: inspectorReviews,
  practicedFeatures: async (reviewId) => trainerStore.practicedFeatures(reviewId),
  provider: {
    async createChallenge(input) {
      if (input.evidence.source !== "repository") throw new Error("Inspector solo puede usar evidencia del repositorio.");
      return gatewayInspectorProvider.createChallenge({
        ...input,
        evidence: { path: input.evidence.path, lines: input.evidence.lines, digest: input.evidence.digest },
      });
    },
  },
  store: createInspectorRepository(database),
});
const trainer = createTrainerService({
  reviews: {
    listCompleted: async () => reviewStore.listCompleted(),
    getEvidence: (id) => inspectorReviews.getById(id),
  },
  provider: gatewayInspectorProvider,
  store: trainerStore,
});
const betterAuth = config.authEnabled && process.env.BETTER_AUTH_SECRET
  ? await createMigratedFragmentsAuth(database, { secret: process.env.BETTER_AUTH_SECRET, baseURL: config.betterAuthUrl, publicAppURL: config.publicAppUrl })
  : undefined;
const auth = betterAuth ? createFragmentsAuthService(betterAuth) : undefined;

const review = {
  store: reviewStore,
  service: reviewService,
  resolveContext: async (_request: unknown, input: { owner: string; repo: string }) => ({
    projectId: `${input.owner}/${input.repo}`.toLowerCase(),
    rubricVersion: "review-v1",
    evaluatorVersion: "gateway-structured-v1",
  }),
};

const server = createApiServer(database, { mentor, inspector, ...(auth ? { auth } : {}), review, trainer: { service: trainer, store: trainerStore } });
server.listen(config.port, "0.0.0.0", () => {
  process.stdout.write(`Fragments API escuchando en puerto ${config.port}\n`);
});

const worker = createReviewWorker({ store: reviewStore, service: reviewService, workerId: `review-${randomUUID()}` });
let workerRunning = false;
async function processReviewQueue() {
  if (workerRunning) return;
  workerRunning = true;
  try { await worker.runOnce(); } catch { /* Queue polling continues; public errors stay generic. */ }
  finally { workerRunning = false; }
}
const workerTimer = setInterval(() => { void processReviewQueue(); }, 500);
workerTimer.unref?.();

function shutdown() {
  clearInterval(workerTimer);
  server.close(() => { database.close(); process.exit(0); });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
