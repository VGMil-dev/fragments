import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ApiResultSchema,
  CreateReviewSubmissionRequestSchema,
  ReviewQueuedResponseSchema,
  ReviewRequestSchema,
  ReviewResponseSchema,
  ReviewSubmissionResponseSchema,
  VerifySubmissionResponseSchema,
} from "@fragments/contracts";
import type { ReviewContext } from "./review.service.js";
import type { createReviewService } from "./review.service.js";
import type { createSqliteReviewStore } from "./sqlite-store.js";

type Store = ReturnType<typeof createSqliteReviewStore>;
type Service = ReturnType<typeof createReviewService>;
type RouteResult = "handled" | "unhandled";
export type ReviewContextResolver = (request: IncomingMessage, input: ReturnType<typeof ReviewRequestSchema.parse>) => Promise<ReviewContext | null>;

export function createReviewHttp(options: { store: Store; service: Service; resolveContext: ReviewContextResolver }) {
  return async function handleReviewHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");

    if (request.method === "POST" && url.pathname === "/api/reviews") {
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const parsed = ReviewRequestSchema.safeParse(raw);
      if (!parsed.success) {
        sendError(response, 400, "INVALID_INPUT", "Indica un repositorio público y el SHA completo del commit.");
        return "handled";
      }
      try {
        const context = await options.resolveContext(request, parsed.data);
        if (!context) {
          sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo determinar el proyecto y la rúbrica para esta revisión.");
          return "handled";
        }
        const job = await options.store.enqueue({ request: parsed.data, context });
        const data = ReviewQueuedResponseSchema.parse({
          id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
          status: "queued", createdAt: job.createdAt,
        });
        sendJson(response, 202, data);
      } catch {
        sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo encolar la revisión en este momento.");
      }
      return "handled";
    }

    const reviewMatch = request.method === "GET" && url.pathname.match(/^\/api\/reviews\/([A-Za-z0-9_-]{1,100})$/);
    if (reviewMatch) {
      const job = options.store.getJob(reviewMatch[1]!);
      if (!job) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la revisión.");
        return "handled";
      }
      const data = ReviewResponseSchema.parse(job.status === "completed" && job.record ? {
        id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
        status: "completed", analysis: job.record.analysis, progress: 100, updatedAt: job.updatedAt,
      } : job.status === "failed" ? {
        id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
        status: "failed", message: job.message ?? "No se pudo completar la revisión en este momento.", updatedAt: job.updatedAt,
      } : job.status === "running" ? {
        id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
        status: "running", progress: job.progress, updatedAt: job.updatedAt,
      } : {
        id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
        status: "queued", createdAt: job.createdAt, progress: job.progress, updatedAt: job.updatedAt,
      });
      sendJson(response, 200, data);
      return "handled";
    }

    if (request.method === "POST" && url.pathname === "/api/review-submissions") {
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const parsed = CreateReviewSubmissionRequestSchema.safeParse(raw);
      if (!parsed.success) {
        sendError(response, 400, "INVALID_INPUT", "Revisa los datos de la entrega.");
        return "handled";
      }
      const review = options.store.getJob(parsed.data.reviewId);
      if (!review) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la revisión solicitada.");
        return "handled";
      }
      if (review.status !== "completed") {
        sendError(response, 409, "REVIEW_INCOMPLETE", "La revisión debe completarse antes de generar la entrega.");
        return "handled";
      }
      try {
        const report = await options.service.createPdf(parsed.data.reviewId);
        sendJson(response, 201, ReviewSubmissionResponseSchema.parse(report.submission));
      } catch {
        sendError(response, 503, "SUBMISSION_UNAVAILABLE", "No se pudo generar la entrega en este momento.");
      }
      return "handled";
    }

    const pdfMatch = request.method === "GET" && url.pathname.match(/^\/api\/review-submissions\/([A-Za-z0-9_-]{1,100})\/pdf$/);
    if (pdfMatch) {
      const submission = options.store.getReviewSubmission(pdfMatch[1]!);
      if (!submission) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la entrega Review.");
        return "handled";
      }
      try {
        const bytes = await options.service.renderSubmissionPdf(submission);
        response.writeHead(200, { "content-type": "application/pdf", "content-disposition": "attachment; filename=fragments-review.pdf", "x-content-type-options": "nosniff" });
        response.end(Buffer.from(bytes));
      } catch {
        sendError(response, 500, "ARTIFACT_UNAVAILABLE", "No se pudo crear el PDF solicitado.");
      }
      return "handled";
    }

    const verifyMatch = request.method === "GET" && url.pathname.match(/^\/api\/verify\/([A-Za-z0-9_-]{24,128})$/);
    if (verifyMatch) {
      const submission = await options.store.getByVerificationCode(verifyMatch[1]!);
      if (!submission) return "unhandled";
      try {
        sendJson(response, 200, VerifySubmissionResponseSchema.parse(await options.service.verify(verifyMatch[1]!)));
      } catch {
        sendError(response, 409, "INTEGRITY_FAILED", "La integridad de la entrega no se pudo confirmar.");
      }
      return "handled";
    }

    return "unhandled";
  };
}

async function readJson(request: IncomingMessage, response: ServerResponse): Promise<unknown | undefined> {
  let raw = "";
  try {
    for await (const chunk of request) {
      raw += chunk.toString();
      if (Buffer.byteLength(raw) > 64 * 1024) {
        sendError(response, 413, "INVALID_INPUT", "La solicitud supera el tamaño permitido.");
        return undefined;
      }
    }
    return JSON.parse(raw);
  } catch {
    sendError(response, 400, "INVALID_INPUT", "La solicitud no contiene JSON válido.");
    return undefined;
  }
}

function sendJson(response: ServerResponse, status: number, data: unknown): void {
  const body = ApiResultSchema(ReviewResponseSchema.or(ReviewQueuedResponseSchema).or(ReviewSubmissionResponseSchema).or(VerifySubmissionResponseSchema)).parse({ ok: true, data });
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  const body = ApiResultSchema(ReviewResponseSchema.or(ReviewQueuedResponseSchema).or(ReviewSubmissionResponseSchema).or(VerifySubmissionResponseSchema)).parse({ ok: false, error: { code, message } });
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}
