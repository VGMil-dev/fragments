import type { IncomingMessage, ServerResponse } from "node:http";
import {
  InspectorAssignChallengeRequestSchema,
  InspectorChallengeRecordResponseSchema,
  InspectorChallengeRecordsResponseSchema,
  InspectorDefenseRecordRequestSchema,
} from "@fragments/contracts";
import type { TeacherSessionService } from "../../auth/session-service.js";
import { InspectorError, type createInspectorService } from "./service.js";

type InspectorService = ReturnType<typeof createInspectorService>;
type RouteResult = "handled" | "unhandled";

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  sendJson(response, status, { ok: false, error: { code, message } });
}

async function readJson(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  for await (const chunk of request) {
    raw += chunk.toString();
    if (raw.length > 8192) {
      sendError(response, 413, "INVALID_INPUT", "La solicitud no es válida.");
      return undefined;
    }
  }
  try { return JSON.parse(raw); } catch {
    sendError(response, 400, "INVALID_INPUT", "La solicitud no es válida.");
    return undefined;
  }
}

function cookie(request: IncomingMessage, name: string): string | undefined {
  return request.headers.cookie?.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1);
}

function statusFor(error: unknown): number {
  if (!(error instanceof InspectorError)) return 500;
  if (error.code.startsWith("INVALID_")) return 400;
  if (error.code === "REVIEW_NOT_FOUND" || error.code === "CHALLENGE_NOT_FOUND") return 404;
  if (error.code === "REVIEW_STALE" || error.code === "CHALLENGE_NOT_PENDING" || error.code === "CHALLENGE_NOT_ASSIGNED" || error.code === "TEACHER_MISMATCH") return 409;
  return 500;
}

export function createInspectorHttp(service: InspectorService, auth?: TeacherSessionService) {
  return async function handleInspectorHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    const listMatch = url.pathname.match(/^\/api\/inspector\/([A-Za-z0-9_-]{1,100})\/challenges$/);
    const assignMatch = url.pathname.match(/^\/api\/inspector\/challenges\/([A-Za-z0-9_-]{1,100})\/assign$/);
    const recordMatch = url.pathname.match(/^\/api\/inspector\/challenges\/([A-Za-z0-9_-]{1,100})\/record$/);
    if (!(listMatch || assignMatch || recordMatch)) return "unhandled";

    if (!auth) {
      sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado.");
      return "handled";
    }
    const sessionToken = cookie(request, "fragments_session");
    const session = sessionToken ? auth.verify(sessionToken) : null;
    if (!session) {
      sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión como docente para continuar.");
      return "handled";
    }

    try {
      if (listMatch && request.method === "GET") {
        const records = await service.listForTeacher(listMatch[1]!);
        sendJson(response, 200, { ok: true, data: InspectorChallengeRecordsResponseSchema.parse(records) });
        return "handled";
      }
      if (listMatch && request.method === "POST") {
        const record = await service.createChallenge(listMatch[1]!);
        sendJson(response, 201, { ok: true, data: InspectorChallengeRecordResponseSchema.parse(record) });
        return "handled";
      }
      if (assignMatch && request.method === "POST") {
        const raw = await readJson(request, response);
        if (raw === undefined) return "handled";
        const body = InspectorAssignChallengeRequestSchema.safeParse(raw);
        if (!body.success) {
          sendError(response, 400, "INVALID_INPUT", "No se requieren campos para asignar el reto.");
          return "handled";
        }
        const record = await service.assignChallenge(assignMatch[1]!, session.teacherId);
        sendJson(response, 200, { ok: true, data: InspectorChallengeRecordResponseSchema.parse(record) });
        return "handled";
      }
      if (recordMatch && request.method === "POST") {
        const raw = await readJson(request, response);
        if (raw === undefined) return "handled";
        const body = InspectorDefenseRecordRequestSchema.safeParse(raw);
        if (!body.success) {
          sendError(response, 400, "INVALID_INPUT", "Registra la mutación, restauración y una nota de hasta 2000 caracteres.");
          return "handled";
        }
        const record = await service.recordDefense(recordMatch[1]!, session.teacherId, body.data);
        sendJson(response, 200, { ok: true, data: InspectorChallengeRecordResponseSchema.parse(record) });
        return "handled";
      }
      sendError(response, 405, "METHOD_NOT_ALLOWED", "El método no está disponible para esta ruta.");
    } catch (error) {
      sendError(response, statusFor(error), error instanceof InspectorError ? error.code : "INSPECTOR_UNAVAILABLE",
        error instanceof InspectorError ? error.message : "No se pudo completar la operación Inspector.");
    }
    return "handled";
  };
}
