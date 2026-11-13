import type { IncomingMessage, ServerResponse } from "node:http";
import type { DatabaseSync } from "node:sqlite";
import { ApiResultSchema, MentorControlConfigSchema, MentorControlWorkspaceResponseSchema, MentorPublishedConfigSchema } from "@fragments/contracts";
import { z } from "zod";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createMentorControlRepository } from "./control-repository.js";

type RouteResult = "handled" | "unhandled";
const emptyRequest = z.object({}).strict();
const errorSchema = ApiResultSchema(z.unknown());

export function createMentorControlHttp(database: DatabaseSync, auth?: FragmentsAuthService) {
  const repository = createMentorControlRepository(database);

  return async function handleMentorControlHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method === "GET" && url.pathname === "/api/mentor/context") {
      try { sendJson(response, 200, { ok: true, data: MentorPublishedConfigSchema.parse(repository.getActive()) }); }
      catch { sendError(response, 503, "CONFIG_UNAVAILABLE", "Mentor no tiene una configuración publicada."); }
      return "handled";
    }

    if (!url.pathname.startsWith("/api/teacher/mentor-control")) return "unhandled";
    if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado."); return "handled"; }
    let teacherId: string | null;
    try {
      const userId = await auth.userId(request);
      if (!userId) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión para continuar."); return "handled"; }
      teacherId = await auth.teacherId(request);
    } catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión docente."); return "handled"; }
    if (!teacherId) { sendError(response, 403, "FORBIDDEN", "Esta acción requiere permisos docentes."); return "handled"; }

    try {
      if (request.method === "GET" && url.pathname === "/api/teacher/mentor-control") {
        sendJson(response, 200, { ok: true, data: MentorControlWorkspaceResponseSchema.parse(repository.workspace()) });
        return "handled";
      }
      if (request.method === "PUT" && url.pathname === "/api/teacher/mentor-control/draft") {
        const raw = await readJson(request, response);
        if (raw === undefined) return "handled";
        const config = MentorControlConfigSchema.safeParse(raw);
        if (!config.success) { sendError(response, 400, "INVALID_INPUT", "Revisa la temática y los criterios de la rúbrica."); return "handled"; }
        sendJson(response, 200, { ok: true, data: repository.saveDraft(config.data) });
        return "handled";
      }
      if (request.method === "POST" && url.pathname === "/api/teacher/mentor-control/publish") {
        const raw = await readJson(request, response);
        if (raw === undefined) return "handled";
        if (!emptyRequest.safeParse(raw).success) { sendError(response, 400, "INVALID_INPUT", "La publicación no requiere campos."); return "handled"; }
        const result = repository.publishDraft(teacherId);
        if (result.status === "invalid_weights") { sendError(response, 400, "INVALID_RUBRIC_WEIGHTS", "Los pesos de la rúbrica deben sumar 100."); return "handled"; }
        sendJson(response, 201, { ok: true, data: result.active });
        return "handled";
      }
      sendError(response, 404, "NOT_FOUND", "No se encontró la ruta de control de Mentor.");
    } catch {
      sendError(response, 500, "MENTOR_CONTROL_UNAVAILABLE", "No se pudo completar la acción docente de Mentor.");
    }
    return "handled";
  };
}

async function readJson(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  try {
    for await (const chunk of request) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 64 * 1024) { sendError(response, 413, "INVALID_INPUT", "La solicitud supera el tamaño permitido."); return undefined; }
    }
    return JSON.parse(raw);
  } catch { sendError(response, 400, "INVALID_INPUT", "La solicitud no contiene JSON válido."); return undefined; }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}
