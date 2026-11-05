import { ApiResultSchema, TeacherLoginRequestSchema, TeacherSessionResponseSchema } from "@fragments/contracts";
import type { DatabaseSync } from "node:sqlite";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import type { TeacherSessionService } from "../auth/session-service.js";
import { createMentorHttp } from "../features/mentor/http.js";
import type { createMentorService } from "../features/mentor/service.js";
import { createInspectorHttp } from "../features/inspector/http.js";
import type { createInspectorService } from "../features/inspector/service.js";
import { createReviewHttp } from "../features/review/http.js";
import type { ReviewContextResolver } from "../features/review/http.js";
import type { createReviewService } from "../features/review/review.service.js";
import type { createSqliteReviewStore } from "../features/review/sqlite-store.js";

const healthSchema = ApiResultSchema(z.object({ status: z.literal("ok"), database: z.literal("ready") }).strict());
const errorSchema = ApiResultSchema(z.unknown());

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status).end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}

export function createHttpHandler(database: DatabaseSync, options: {
  auth?: TeacherSessionService;
  mentor?: ReturnType<typeof createMentorService>;
  inspector?: ReturnType<typeof createInspectorService>;
  review?: { store: ReturnType<typeof createSqliteReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver };
} = {}) {
  const mentorHandler = options.mentor ? createMentorHttp(database, options.mentor) : undefined;
  const inspectorHandler = options.inspector ? createInspectorHttp(options.inspector, options.auth) : undefined;
  const reviewHandler = options.review ? createReviewHttp(options.review) : undefined;
  return async (request: IncomingMessage, response: ServerResponse) => {
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
    if (request.method === "GET" && request.url === "/api/teacher/session") {
      const token = readCookie(request, "fragments_session");
      const session = token ? options.auth?.verify(token) ?? null : null;
      const data = TeacherSessionResponseSchema.parse(session
        ? { authenticated: true, teacherId: session.teacherId, expiresAt: session.expiresAt }
        : { authenticated: false });
      response.writeHead(200).end(JSON.stringify(ApiResultSchema(TeacherSessionResponseSchema).parse({ ok: true, data })));
      return;
    }
    if (request.method === "POST" && request.url === "/api/teacher/session") {
      let raw = "";
      for await (const chunk of request) {
        raw += chunk.toString();
        if (raw.length > 8192) {
          sendError(response, 413, "INVALID_INPUT", "La solicitud no es válida.");
          return;
        }
      }
      let parsed: unknown;
      try { parsed = JSON.parse(raw); } catch {
        sendError(response, 400, "INVALID_INPUT", "La solicitud no es válida.");
        return;
      }
      const credentials = TeacherLoginRequestSchema.safeParse(parsed);
      if (!credentials.success) {
        sendError(response, 400, "INVALID_INPUT", "La solicitud no es válida.");
        return;
      }
      if (!options.auth) {
        sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado.");
        return;
      }
      const issued = await options.auth.login(credentials.data.email, credentials.data.password);
      if (!issued) {
        sendError(response, 401, "INVALID_CREDENTIALS", "No se pudo iniciar sesión.");
        return;
      }
      const body = ApiResultSchema(z.object({ teacherId: z.string(), expiresAt: z.number().int() }).strict())
        .parse({ ok: true, data: { teacherId: issued.teacherId, expiresAt: issued.expiresAt } });
      response.setHeader("set-cookie", `fragments_session=${issued.token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`);
      response.writeHead(200).end(JSON.stringify(body));
      return;
    }
    if (mentorHandler && await mentorHandler(request, response) === "handled") return;
    if (inspectorHandler && await inspectorHandler(request, response) === "handled") return;
    if (reviewHandler && await reviewHandler(request, response) === "handled") return;
    const notFound = ApiResultSchema(z.unknown()).parse({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    response.writeHead(404).end(JSON.stringify(notFound));
  };
}

export function createApiServer(database: DatabaseSync, options: {
  auth?: TeacherSessionService;
  mentor?: ReturnType<typeof createMentorService>;
  inspector?: ReturnType<typeof createInspectorService>;
  review?: { store: ReturnType<typeof createSqliteReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver };
} = {}) { return createServer(createHttpHandler(database, options)); }

function readCookie(request: IncomingMessage, name: string): string | undefined {
  const prefix = `${name}=`;
  return request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(prefix))?.slice(prefix.length);
}
