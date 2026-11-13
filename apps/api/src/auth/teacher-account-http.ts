import { ApiResultSchema } from "@fragments/contracts";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import type { FragmentsAuthService } from "./better-auth.js";

const statusSchema = ApiResultSchema(z.object({
  credentialConnected: z.boolean(),
  githubConnected: z.boolean(),
}).strict());
const linkSchema = ApiResultSchema(z.object({ authorizationUrl: z.string().url() }).strict());
const errorSchema = ApiResultSchema(z.unknown());
const linkInputSchema = z.object({ password: z.string().min(1).max(1024) }).strict();

export function createTeacherAccountHttp(auth: FragmentsAuthService) {
  return async function handleTeacherAccountHttp(request: IncomingMessage, response: ServerResponse): Promise<"handled" | "unhandled"> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method === "GET" && url.pathname === "/api/teacher/account") {
      const result = await auth.teacherAccount(request);
      if (result.kind === "unauthenticated") return fail(response, 401, "AUTH_REQUIRED", "Inicia sesión para continuar.");
      if (result.kind === "forbidden") return fail(response, 403, "FORBIDDEN", "Esta acción requiere permisos docentes.");
      response.writeHead(200, noStoreHeaders).end(JSON.stringify(statusSchema.parse({ ok: true, data: result.status })));
      return "handled";
    }

    if (url.pathname !== "/api/teacher/account/github/link") return "unhandled";
    if (request.method !== "POST") return fail(response, 405, "METHOD_NOT_ALLOWED", "Método no permitido.");

    const origin = request.headers.origin;
    if (typeof origin !== "string" || !auth.isTrustedOrigin(origin)) {
      return fail(response, 403, "ORIGIN_NOT_ALLOWED", "No se pudo validar el origen de la solicitud.");
    }
    if (!request.headers["content-type"]?.toLowerCase().startsWith("application/json")) {
      return fail(response, 415, "INVALID_CONTENT_TYPE", "La solicitud debe usar JSON.");
    }
    const input = await readInput(request, response);
    if (input === undefined) return "handled";
    const parsed = linkInputSchema.safeParse(input);
    if (!parsed.success) return fail(response, 400, "INVALID_INPUT", "Confirma tu contraseña para continuar.");

    const result = await auth.beginTeacherGitHubLink(request, parsed.data.password);
    if (result.kind === "unauthenticated") return fail(response, 401, "AUTH_REQUIRED", "Inicia sesión para continuar.");
    if (result.kind === "forbidden") return fail(response, 403, "FORBIDDEN", "Esta acción requiere permisos docentes.");
    if (result.kind === "rate_limited") return fail(response, 429, "TOO_MANY_ATTEMPTS", "Espera antes de volver a confirmar tu contraseña.");
    if (result.kind === "invalid_password") return fail(response, 401, "PASSWORD_CONFIRMATION_FAILED", "No se pudo confirmar la contraseña.");
    if (result.kind === "already_linked") return fail(response, 409, "ACCOUNT_ALREADY_LINKED", "Esta cuenta docente ya tiene GitHub conectado.");
    if (result.kind === "unavailable") return fail(response, 503, "GITHUB_LINK_UNAVAILABLE", "No se pudo iniciar la vinculación de GitHub.");

    response.writeHead(200, { ...noStoreHeaders, "set-cookie": result.setCookies }).end(JSON.stringify(linkSchema.parse({
      ok: true,
      data: { authorizationUrl: result.authorizationUrl },
    })));
    return "handled";
  };
}

const noStoreHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

async function readInput(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  try {
    for await (const chunk of request) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 2048) {
        fail(response, 413, "INVALID_INPUT", "La solicitud supera el tamaño permitido.");
        return undefined;
      }
    }
    return JSON.parse(raw);
  } catch {
    fail(response, 400, "INVALID_INPUT", "La solicitud no contiene JSON válido.");
    return undefined;
  }
}

function fail(response: ServerResponse, status: number, code: string, message: string): "handled" {
  response.writeHead(status, noStoreHeaders).end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
  return "handled";
}
