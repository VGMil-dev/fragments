import { ApiResultSchema } from "@fragments/contracts";
import type { DatabaseSync } from "node:sqlite";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createMentorHttp } from "../features/mentor/http.js";
import { createMentorControlHttp } from "../features/mentor/control-http.js";
import type { createMentorService } from "../features/mentor/service.js";
import { createInspectorHttp } from "../features/inspector/http.js";
import type { createInspectorService } from "../features/inspector/service.js";
import { createReviewHttp } from "../features/review/http.js";
import type { ReviewContextResolver } from "../features/review/http.js";
import type { createReviewService } from "../features/review/review.service.js";
import type { createSqliteReviewStore } from "../features/review/sqlite-store.js";
import { createTrainerHttp } from "../features/trainer/http.js";
import { createTrainerRepository } from "../features/trainer/repository.js";
import type { createTrainerService } from "../features/trainer/service.js";

const healthSchema = ApiResultSchema(z.object({ status: z.literal("ok"), database: z.literal("ready") }).strict());
const errorSchema = ApiResultSchema(z.unknown());

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status).end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}

export function createHttpHandler(database: DatabaseSync, options: {
  auth?: FragmentsAuthService;
  mentor?: ReturnType<typeof createMentorService>;
  inspector?: ReturnType<typeof createInspectorService>;
  review?: { store: ReturnType<typeof createSqliteReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver };
  trainer?: { service: ReturnType<typeof createTrainerService>; store: ReturnType<typeof createTrainerRepository> };
} = {}) {
  const mentorHandler = options.mentor ? createMentorHttp(database, options.mentor) : undefined;
  const mentorControlHandler = options.mentor ? createMentorControlHttp(database, options.auth) : undefined;
  const inspectorHandler = options.inspector ? createInspectorHttp(options.inspector, options.auth) : undefined;
  const reviewHandler = options.review ? createReviewHttp(options.review) : undefined;
  const trainerHandler = options.trainer ? createTrainerHttp(options.trainer.service, options.trainer.store.ensureSession) : undefined;
  return async (request: IncomingMessage, response: ServerResponse) => {
    const pathname = new URL(request.url ?? "/", "http://fragments.local").pathname;
    if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
      if (!options.auth) {
        sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado.");
        return;
      }
      options.auth.handle(request, response);
      return;
    }
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");
    if (request.method === "GET" && request.url === "/health") {
      try {
        database.prepare("SELECT 1").get();
        const body = healthSchema.parse({ ok: true, data: { status: "ok", database: "ready" } });
        response.writeHead(200).end(JSON.stringify(body));
      } catch {
        response.writeHead(503).end(JSON.stringify({ ok: false, error: { code: "NOT_READY", message: "El servicio no está listo." } }));
      }
      return;
    }
    if (mentorHandler && await mentorHandler(request, response) === "handled") return;
    if (mentorControlHandler && await mentorControlHandler(request, response) === "handled") return;
    if (inspectorHandler && await inspectorHandler(request, response) === "handled") return;
    if (trainerHandler && await trainerHandler(request, response) === "handled") return;
    if (reviewHandler && await reviewHandler(request, response) === "handled") return;
    const notFound = ApiResultSchema(z.unknown()).parse({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    response.writeHead(404).end(JSON.stringify(notFound));
  };
}

export function createApiServer(database: DatabaseSync, options: {
  auth?: FragmentsAuthService;
  mentor?: ReturnType<typeof createMentorService>;
  inspector?: ReturnType<typeof createInspectorService>;
  review?: { store: ReturnType<typeof createSqliteReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver };
  trainer?: { service: ReturnType<typeof createTrainerService>; store: ReturnType<typeof createTrainerRepository> };
} = {}) { return createServer(createHttpHandler(database, options)); }
