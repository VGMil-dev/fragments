import { loadConfig } from "./platform/config.js";
import { openDatabase } from "./db/open.js";
import { createApiServer } from "./http/app.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "./features/mentor/local-fakes.js";
import { createMentorService } from "./features/mentor/service.js";

const config = loadConfig();
if (config.authEnabled) throw new Error("AUTH_ENABLED requiere conectar un verificador docente antes de iniciar.");
const database = openDatabase(config.databasePath);
const mentor = createMentorService({ evaluator: createLocalMentorEvaluator(), pdf: createMinimalPdfRenderer() });
const server = createApiServer(database, { mentor });
server.listen(config.port, "0.0.0.0", () => {
  process.stdout.write(`Fragments API escuchando en puerto ${config.port}\n`);
});
function shutdown() {
  server.close(() => { database.close(); process.exit(0); });
}
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
