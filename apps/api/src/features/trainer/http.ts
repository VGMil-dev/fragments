import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { TrainerError, type createTrainerService } from "./service.js";
import { TrainerChallengeSchema, TrainerHistorySchema, TrainerReviewSchema, TrainerStatusSchema } from "./schemas.js";

type TrainerService = ReturnType<typeof createTrainerService>;
type RouteResult = "handled" | "unhandled";

function json(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}
function error(response: ServerResponse, status: number, code: string, message: string): void { json(response, status, { ok: false, error: { code, message } }); }
async function body(request: IncomingMessage): Promise<unknown> {
  let raw = "";
  for await (const chunk of request) { raw += chunk.toString(); if (Buffer.byteLength(raw) > 8192) throw new TrainerError("INVALID_INPUT", "La solicitud supera el tamaño permitido."); }
  try { return JSON.parse(raw); } catch { throw new TrainerError("INVALID_INPUT", "La solicitud no contiene JSON válido."); }
}
function statusCode(value: unknown): number {
  if (!(value instanceof TrainerError)) return 500;
  if (value.code === "REVIEW_NOT_FOUND" || value.code === "CHALLENGE_NOT_FOUND") return 404;
  if (value.code === "REVIEW_STALE") return 409;
  if (value.code.startsWith("INVALID_")) return 400;
  if (value.code === "NO_VERIFIED_EVIDENCE" || value.code === "NO_COMPATIBLE_CHALLENGES") return 422;
  return 500;
}
function session(request: IncomingMessage, response: ServerResponse, ensure: (hash: string, now: Date) => boolean): string {
  const token = (request.headers.cookie ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith("fragments_trainer_session="))?.slice("fragments_trainer_session=".length);
  let value = token && /^[a-f\d]{64}$/i.test(token) ? token : randomBytes(32).toString("hex");
  let hash = createHash("sha256").update(value).digest("hex");
  if (!ensure(hash, new Date()) && token) {
    value = randomBytes(32).toString("hex");
    hash = createHash("sha256").update(value).digest("hex");
    ensure(hash, new Date());
  }
  if (value !== token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader("set-cookie", `fragments_trainer_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000${secure}`);
  }
  return hash;
}

export function createTrainerHttp(service: TrainerService, ensureSession: (hash: string, now: Date) => boolean) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<RouteResult> => {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (!url.pathname.startsWith("/api/trainer/")) return "unhandled";
    const sessionHash = session(request, response, ensureSession);
    try {
      if (request.method === "GET" && url.pathname === "/api/trainer/reviews") {
        const reviews = z.array(TrainerReviewSchema).max(100).parse(await service.listReviews());
        json(response, 200, { ok: true, data: reviews }); return "handled";
      }
      if (request.method === "GET" && url.pathname === "/api/trainer/history") {
        const reviewId = url.searchParams.get("reviewId") ?? undefined;
        const history = TrainerHistorySchema.parse(service.history(sessionHash, reviewId));
        json(response, 200, { ok: true, data: history }); return "handled";
      }
      if (request.method === "POST" && url.pathname === "/api/trainer/draw") {
        const input = z.object({ reviewId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/) }).strict().parse(await body(request));
        const result = await service.draw(sessionHash, input.reviewId);
        const data = z.object({ challenge: TrainerChallengeSchema, category: z.enum(["new", "pending", "review"]), bankSize: z.number().int().min(1).max(5) }).strict().parse(result);
        json(response, 200, { ok: true, data }); return "handled";
      }
      if (request.method === "POST" && url.pathname === "/api/trainer/attempts") {
        const input = z.object({ reviewId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), challengeId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/), status: TrainerStatusSchema, hintsUsed: z.number().int().min(0).max(3) }).strict().parse(await body(request));
        const result = await service.record({ ...input, sessionHash });
        json(response, 201, { ok: true, data: TrainerHistorySchema.element.parse(result) }); return "handled";
      }
      error(response, 404, "NOT_FOUND", "No se encontró la ruta."); return "handled";
    } catch (cause) {
      const status = statusCode(cause);
      error(response, status, cause instanceof TrainerError ? cause.code : "TRAINER_UNAVAILABLE", cause instanceof TrainerError ? cause.message : "No se pudo completar la solicitud de práctica.");
      return "handled";
    }
  };
}
