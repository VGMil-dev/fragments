import { ApiResultSchema } from "@fragments/contracts";
import type { DatabaseSync } from "node:sqlite";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import type { TeacherSessionService } from "../auth/session-service.js";
import { createMentorHttp } from "../features/mentor/http.js";
import type { createMentorService } from "../features/mentor/service.js";

const healthSchema = ApiResultSchema(z.object({ status: z.literal("ok"), database: z.literal("ready") }).strict());
const errorSchema = ApiResultSchema(z.unknown());

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status).end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}

export function createHttpHandler(database: DatabaseSync, options: { auth?: TeacherSessionService; mentor?: ReturnType<typeof createMentorService> } = {}) {
  const mentorHandler = options.mentor ? createMentorHttp(database, options.mentor) : undefined;
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
      const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(1024) }).strict().safeParse(parsed);
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
    const notFound = ApiResultSchema(z.unknown()).parse({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    response.writeHead(404).end(JSON.stringify(notFound));
  };
}

export function createApiServer(database: DatabaseSync, options: { auth?: TeacherSessionService; mentor?: ReturnType<typeof createMentorService> } = {}) { return createServer(createHttpHandler(database, options)); }
