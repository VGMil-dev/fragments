import { DatabaseSync } from "node:sqlite";
import { migrate } from "../../apps/api/src/db/migrate.ts";
import { createMentorService } from "../../apps/api/src/features/mentor/service.ts";
import { createMinimalPdfRenderer } from "../../apps/api/src/features/mentor/local-fakes.ts";
import { createApiServer } from "../../apps/api/src/http/app.ts";

const database = new DatabaseSync(":memory:");
migrate(database);
const mentor = createMentorService({
  pdf: createMinimalPdfRenderer(),
  evaluator: {
    async evaluate({ proposal, proposalDigest, config }) {
      return {
        findings: config.criteria.map((criterion, index) => ({
          criterionId: criterion.id,
          status: criterion.id === "scope" ? "not_verified" : "verified",
          evidence: [{ source: "proposal", field: index === 0 ? "problem" : "scope", digest: proposalDigest }],
          reason: criterion.id === "scope" ? "El alcance puede concretarse con una demostración pequeña." : `La propuesta describe ${criterion.title.toLowerCase()}.`,
          guidanceLevel: 1,
        })),
        limitations: ["Fixture local etiquetado; no se llamó a un modelo externo."],
        modelId: "fake-provider:mentor-control-ego-fixture",
        inputDigest: proposalDigest,
        guidance: ["¿Qué resultado pequeño podrías mostrar primero?"],
        similarities: [],
      };
    },
  },
});

const auth = {
  async teacherId(request) { return request.headers.cookie?.includes("mentor_fixture_teacher=ok") ? "fixture-teacher" : null; },
  handle(request, response) {
    if (request.method === "GET" && request.url?.startsWith("/api/auth/get-session")) {
      const signedIn = request.headers.cookie?.includes("mentor_fixture_teacher=ok");
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(signedIn ? { user: { id: "fixture-teacher", isTeacher: true, role: "user" } } : null));
      return;
    }
    if (request.method === "POST" && request.url?.startsWith("/api/auth/sign-in/email")) {
      let body = "";
      request.on("data", (chunk) => { body += chunk.toString(); });
      request.on("end", () => {
        const credentials = JSON.parse(body);
        if (credentials.email !== "docente@example.test" || credentials.password !== "fixture-password") {
          response.writeHead(401, { "content-type": "application/json" }).end(JSON.stringify({ message: "Invalid credentials" }));
          return;
        }
        response.writeHead(200, { "content-type": "application/json", "set-cookie": "mentor_fixture_teacher=ok; Path=/; HttpOnly; SameSite=Lax" })
          .end(JSON.stringify({ user: { id: "fixture-teacher", isTeacher: true, role: "user" } }));
      });
      return;
    }
    response.writeHead(503, { "content-type": "application/json" }).end(JSON.stringify({ ok: false, error: { code: "AUTH_DISABLED", message: "Solo fixture local." } }));
  },
};

const server = createApiServer(database, { mentor, auth });
server.listen(3031, "127.0.0.1", () => process.stdout.write("Mentor Ego fixture listo en 127.0.0.1:3031; solo fake-provider local.\n"));
function close() { server.close(() => { database.close(); process.exit(0); }); }
process.once("SIGINT", close);
process.once("SIGTERM", close);
