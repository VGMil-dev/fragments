import { createHash, randomBytes } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { z } from "zod";
import { TrainerError, type createTrainerService } from "./service.js";
import { TrainerAttemptRequestSchema, TrainerChallengeSchema, TrainerHistorySchema, TrainerReviewSchema } from "./schemas.js";
import { writeTrainerOperationalEvent, type TrainerOperationalEvent } from "./operational-events.js";

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
  if (value.code === "IDEMPOTENCY_CONFLICT") return 409;
  if (value.code === "REVIEW_STALE") return 409;
  if (value.code.startsWith("INVALID_")) return 400;
  if (value.code === "NO_VERIFIED_EVIDENCE" || value.code === "NO_COMPATIBLE_CHALLENGES") return 422;
  return 500;
}
async function session(request: IncomingMessage, response: ServerResponse, ensure: (hash: string, now: Date) => Promise<boolean>): Promise<string> {
  const token = (request.headers.cookie ?? "").split(";").map((part) => part.trim()).find((part) => part.startsWith("fragments_trainer_session="))?.slice("fragments_trainer_session=".length);
  let value = token && /^[a-f\d]{64}$/i.test(token) ? token : randomBytes(32).toString("hex");
  let hash = createHash("sha256").update(value).digest("hex");
  if (!await ensure(hash, new Date()) && token) {
    value = randomBytes(32).toString("hex");
    hash = createHash("sha256").update(value).digest("hex");
    await ensure(hash, new Date());
  }
  if (value !== token) {
    const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
    response.setHeader("set-cookie", `fragments_trainer_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=15552000${secure}`);
  }
  return hash;
}

export function createTrainerHttp(service: TrainerService, ensureSession: (hash: string, now: Date) => Promise<boolean>, resolveStudentId?: (request: IncomingMessage) => Promise<string | null>, logEvent: (event: TrainerOperationalEvent) => void = writeTrainerOperationalEvent) {
  return async (request: IncomingMessage, response: ServerResponse): Promise<RouteResult> => {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (!url.pathname.startsWith("/api/trainer/")) return "unhandled";
    const studentId = resolveStudentId ? await resolveStudentId(request) : undefined;
    if (resolveStudentId && !studentId) { error(response, 401, "AUTH_REQUIRED", "Inicia sesión como estudiante para consultar Trainer."); return "handled"; }
    const browserSessionHash = await session(request, response, ensureSession);
    const sessionHash = studentId ? createHash("sha256").update(browserSessionHash).update("\0").update(studentId).digest("hex") : browserSessionHash;
    if (studentId) await ensureSession(sessionHash, new Date());
    const ownsReview = async (reviewId: string) => !resolveStudentId || Boolean(studentId && (await service.listReviews(studentId)).some((review) => review.id === reviewId));
    let attemptStartedAt: number | undefined;
    try {
      if (request.method === "GET" && url.pathname === "/api/trainer/reviews") {
        const reviews = z.array(TrainerReviewSchema).max(100).parse(await service.listReviews(studentId ?? undefined));
        json(response, 200, { ok: true, data: reviews }); return "handled";
      }
      if (request.method === "GET" && url.pathname === "/api/trainer/history") {
        const reviewId = url.searchParams.get("reviewId") ?? undefined;
        const history = TrainerHistorySchema.parse(await service.history(sessionHash, reviewId));
        json(response, 200, { ok: true, data: history }); return "handled";
      }
      if (request.method === "POST" && url.pathname === "/api/trainer/draw") {
        const input = z.object({ reviewId: z.string().regex(/^[A-Za-z0-9_-]{1,100}$/) }).strict().parse(await body(request));
        if (!await ownsReview(input.reviewId)) { error(response, 404, "REVIEW_NOT_FOUND", "No se encontró el análisis solicitado."); return "handled"; }
        const result = await service.draw(sessionHash, input.reviewId);
        const data = z.object({ challenge: TrainerChallengeSchema, category: z.enum(["new", "pending", "review"]), bankSize: z.number().int().min(1).max(5) }).strict().parse(result);
        json(response, 200, { ok: true, data }); return "handled";
      }
      if (request.method === "POST" && url.pathname === "/api/trainer/attempts") {
        attemptStartedAt = Date.now();
        const input = TrainerAttemptRequestSchema.parse(await body(request));
        if (!await ownsReview(input.reviewId)) { error(response, 404, "REVIEW_NOT_FOUND", "No se encontró el análisis solicitado."); return "handled"; }
        const result = await service.record({ ...input, sessionHash });
        try { logEvent({ event: "trainer.attempt.finished", stage: "attempt_record", result: "success", error_code: "none", duration_ms: Date.now() - attemptStartedAt, occurredAt: new Date().toISOString() }); } catch { /* Logs do not affect practice. */ }
        json(response, 201, { ok: true, data: TrainerHistorySchema.element.parse(result) }); return "handled";
      }
      error(response, 404, "NOT_FOUND", "No se encontró la ruta."); return "handled";
    } catch (cause) {
      if (cause instanceof z.ZodError) {
        error(response, 400, "INVALID_INPUT", "La solicitud contiene campos no válidos.");
        return "handled";
      }
      const status = statusCode(cause);
      if (request.method === "POST" && url.pathname === "/api/trainer/attempts" && !(cause instanceof z.ZodError)) {
        try { logEvent({ event: "trainer.attempt.failed", stage: "attempt_record", result: "failure", error_code: "attempt_failed", duration_ms: attemptStartedAt === undefined ? 0 : Date.now() - attemptStartedAt, occurredAt: new Date().toISOString() }); } catch { /* Logs do not affect practice. */ }
      }
      error(response, status, cause instanceof TrainerError ? cause.code : "TRAINER_UNAVAILABLE", cause instanceof TrainerError ? cause.message : "No se pudo completar la solicitud de práctica.");
      return "handled";
    }
  };
}
