import type { IncomingMessage, ServerResponse } from "node:http";
import {
  ApiResultSchema,
  GitHubPublicRepositorySchema,
  GitHubCommitListSchema,
  GitHubCommitSummarySchema,
  CreateReviewSubmissionRequestSchema,
  MissionDeliveryHistorySchema,
  ReviewAcademicLinkSchema,
  ReviewQueuedResponseSchema,
  ReviewRequestSchema,
  ReviewResponseSchema,
  ReviewSubmissionResponseSchema,
  TeacherClassroomReviewsResponseSchema,
  VerifySubmissionResponseSchema,
} from "@fragments/contracts";
import { reviewIdempotencyKey, type ReviewContext } from "./review.service.js";
import type { createReviewService } from "./review.service.js";
import type { ReviewJobView, createPrismaReviewStore } from "./prisma-store.js";

type Store = ReturnType<typeof createPrismaReviewStore>;
type Service = ReturnType<typeof createReviewService>;
type RouteResult = "handled" | "unhandled";
export type ReviewContextResolver = (request: IncomingMessage, input: ReturnType<typeof ReviewRequestSchema.parse>) => Promise<ReviewContext | null>;
export type ReviewAcademicLinkResolver = (studentId: string, proposalId: string, deliverableId?: string, commitSha?: string) => Promise<unknown | null>;
export type ReviewTeacherIdResolver = (request: IncomingMessage) => Promise<string | null>;
type GitHubRepositoryCatalog = {
  getPublicRepository(owner: string, repo: string, signal?: AbortSignal): Promise<unknown>;
  listRecentCommits(owner: string, repo: string, branch: string, signal?: AbortSignal): Promise<unknown>;
  resolveCommit(owner: string, repo: string, sha: string, signal?: AbortSignal): Promise<unknown>;
};

export function createReviewHttp(options: { store: Store; service: Service; resolveContext: ReviewContextResolver; resolveStudentId?: (request: IncomingMessage) => Promise<string | null>;
  resolveAcademicLink?: ReviewAcademicLinkResolver; resolveTeacherId?: ReviewTeacherIdResolver; repositoryCatalog?: GitHubRepositoryCatalog }) {
  return async function handleReviewHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    const teacherReviewsMatch = request.method === "GET" && url.pathname.match(/^\/api\/teacher\/classrooms\/([A-Za-z0-9_-]{1,100})\/reviews$/);
    if (teacherReviewsMatch) {
      const teacherId = options.resolveTeacherId ? await options.resolveTeacherId(request).catch(() => null) : null;
      if (!teacherId) { sendError(response, 403, "FORBIDDEN", "Esta acción requiere permisos docentes."); return "handled"; }
      try {
        const items = await options.store.listForTeacherClassroom(teacherId, teacherReviewsMatch[1]!);
        if (items === null) { sendError(response, 404, "NOT_FOUND", "No se encontró el aula solicitada."); return "handled"; }
        sendJson(response, 200, items);
      } catch {
        sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudieron consultar las revisiones vinculadas.");
      }
      return "handled";
    }
    const deliveryHistoryMatch = request.method === "GET" && url.pathname.match(/^\/api\/me\/proposals\/([A-Za-z0-9_-]{1,100})\/deliveries$/);
    const catalogMatch = url.pathname.match(/^\/api\/github\/repositories\/([^/]+)\/([^/]+)(?:\/commits(?:\/([^/]+))?)?$/);
    const catalogRoute = request.method === "GET" && Boolean(catalogMatch);
    const studentRoute = Boolean(deliveryHistoryMatch) || catalogRoute || (url.pathname === "/api/reviews" || url.pathname.startsWith("/api/reviews/") || url.pathname === "/api/review-submissions" || url.pathname.startsWith("/api/review-submissions/")) && !url.pathname.startsWith("/api/review-submissions/verify/");
    const studentId = studentRoute && options.resolveStudentId ? await options.resolveStudentId(request) : null;
    if (studentRoute && options.resolveStudentId && !studentId) {
      sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión como estudiante para consultar Review.");
      return "handled";
    }
    const ownsJob = async (id: string) => !options.resolveStudentId || Boolean(studentId && await options.store.getStudentIdForJob(id) === studentId);
    if (deliveryHistoryMatch) {
      if (!studentId || !options.store.listMissionDeliveryHistory) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta solicitada.");
        return "handled";
      }
      try {
        const history = await options.store.listMissionDeliveryHistory(studentId, deliveryHistoryMatch[1]!);
        if (!history) { sendError(response, 404, "NOT_FOUND", "No se encontró la propuesta solicitada."); return "handled"; }
        sendJson(response, 200, MissionDeliveryHistorySchema.parse(history));
      } catch {
        sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo consultar el historial de entregas.");
      }
      return "handled";
    }
    if (catalogRoute && catalogMatch) {
      if (!options.repositoryCatalog) { sendCatalogError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo consultar GitHub en este momento."); return "handled"; }
      let owner: string; let repo: string; let sha: string | undefined;
      try { owner = decodeURIComponent(catalogMatch[1]!); repo = decodeURIComponent(catalogMatch[2]!); sha = catalogMatch[3] ? decodeURIComponent(catalogMatch[3]) : undefined; }
      catch { sendCatalogError(response, 400, "INVALID_INPUT", "Indica un repositorio válido."); return "handled"; }
      try {
        let result: unknown; let schema;
        if (sha) { result = await options.repositoryCatalog.resolveCommit(owner, repo, sha); schema = GitHubCommitSummarySchema; }
        else if (url.pathname.endsWith("/commits")) {
          const branch = url.searchParams.get("branch") ?? "";
          result = await options.repositoryCatalog.listRecentCommits(owner, repo, branch); schema = GitHubCommitListSchema;
        } else { result = await options.repositoryCatalog.getPublicRepository(owner, repo); schema = GitHubPublicRepositorySchema; }
        sendCatalogJson(response, schema.parse(result));
      } catch (error) {
        const sourceCode = error && typeof error === "object" && "errorCode" in error ? String(error.errorCode) : "";
        const code = sourceCode === "GITHUB_RATE_LIMITED" ? "RATE_LIMITED" : sourceCode === "GITHUB_EMPTY_REPOSITORY" ? "EMPTY_REPOSITORY" : sha ? "COMMIT_NOT_FOUND" : "NOT_FOUND";
        const responseCode = sourceCode === "GITHUB_INVALID_BRANCH" ? "INVALID_BRANCH" : code;
        const status = responseCode === "RATE_LIMITED" ? 429 : responseCode === "EMPTY_REPOSITORY" ? 409 : responseCode === "INVALID_BRANCH" ? 400 : 404;
        const message = responseCode === "RATE_LIMITED" ? "GitHub limitó temporalmente las consultas. Inténtalo más tarde."
          : responseCode === "EMPTY_REPOSITORY" ? "Este repositorio todavía no tiene commits."
            : responseCode === "COMMIT_NOT_FOUND" ? "No encontramos ese commit en el repositorio público seleccionado."
              : responseCode === "INVALID_BRANCH" ? "La rama dejó de ser la predeterminada. Vuelve a detectar el repositorio."
              : "No encontramos ese repositorio público en GitHub.";
        sendCatalogError(response, status, responseCode, message);
      }
      return "handled";
    }
    const resolveRequestContext = async (input: ReturnType<typeof ReviewRequestSchema.parse>, storedAcademicLink?: ReviewContext["academicLink"]): Promise<ReviewContext | null> => {
      const context = await options.resolveContext(request, input);
      if (!context || !input.linkedProposalId) return context;
      if (storedAcademicLink) {
        const savedLink = ReviewAcademicLinkSchema.safeParse(storedAcademicLink);
        return savedLink.success ? { ...context, academicLink: savedLink.data } : null;
      }
      if (!context.githubLogin || context.githubLogin.toLowerCase() !== input.owner.toLowerCase()) return null;
      if (!studentId || !options.resolveAcademicLink) return null;
      const link = ReviewAcademicLinkSchema.safeParse(await options.resolveAcademicLink(studentId, input.linkedProposalId, input.assignmentDeliverableId, input.commitSha));
      return link.success ? { ...context, academicLink: link.data } : null;
    };

    if (request.method === "POST" && url.pathname === "/api/reviews") {
      const raw = await readJson(request, response);
      if (raw === undefined) return "handled";
      const parsed = ReviewRequestSchema.safeParse(raw);
      if (!parsed.success) {
        sendError(response, 400, "INVALID_INPUT", "Indica un repositorio público y el SHA completo del commit.");
        return "handled";
      }
      try {
        const context = await resolveRequestContext(parsed.data);
        if (!context) {
          if (parsed.data.linkedProposalId) sendError(response, 404, "ACADEMIC_LINK_UNAVAILABLE", "No se encontró una propuesta de misión disponible para esta revisión.");
          else sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo determinar el proyecto y la rúbrica para esta revisión.");
          return "handled";
        }
        if (options.resolveStudentId && context.studentId !== studentId) {
          sendError(response, 403, "FORBIDDEN", "La revisión debe pertenecer a la sesión estudiantil actual.");
          return "handled";
        }
        const job = await options.store.enqueue({ request: parsed.data, context });
        if (job.status === "failed") {
          sendError(response, 409, "REVIEW_RETRY_REQUIRED", "Esta revisión falló. Usa el reintento disponible o pide apoyo a tu docente.");
          return "handled";
        }
        sendJson(response, job.status === "completed" ? 200 : 202, publicReview(job));
      } catch {
        sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo encolar la revisión en este momento.");
      }
      return "handled";
    }

    const retryMatch = request.method === "POST" && url.pathname.match(/^\/api\/reviews\/([A-Za-z0-9_-]{1,100})\/retry$/);
    if (retryMatch) {
      try {
        const current = await options.store.getJob(retryMatch[1]!);
        if (!current) {
          sendError(response, 404, "NOT_FOUND", "No se encontró la revisión solicitada.");
          return "handled";
        }
        if (!await ownsJob(current.id)) {
          sendError(response, 404, "NOT_FOUND", "No se encontró la revisión solicitada.");
          return "handled";
        }
        const reviewRequest = ReviewRequestSchema.parse({ owner: current.owner, repo: current.repo, commitSha: current.commitSha,
          ...(current.linkedProposalId ? { linkedProposalId: current.linkedProposalId } : {}),
          ...(current.academicLink?.deliverable ? { assignmentDeliverableId: current.academicLink.deliverable.id } : {}) });
        const context = await resolveRequestContext(reviewRequest, current.academicLink);
        if (!context || await reviewIdempotencyKey(reviewRequest, context) !== current.key) {
          sendError(response, 404, "NOT_FOUND", "No se encontró la revisión solicitada.");
          return "handled";
        }
        const retry = await options.store.retryFailed(retryMatch[1]!);
        if (retry.kind === "missing") {
          sendError(response, 404, "NOT_FOUND", "No se encontró la revisión solicitada.");
          return "handled";
        }
        if (retry.kind === "too_early") {
          sendError(response, 429, "REVIEW_RETRY_DELAY", "Espera un momento antes de volver a intentarlo.");
          return "handled";
        }
        if (retry.kind === "not_retryable" || retry.kind === "exhausted") {
          sendError(response, 409, "REVIEW_RETRY_UNAVAILABLE", "No es posible reintentar esta revisión de forma segura. Pide apoyo a tu docente.");
          return "handled";
        }
        sendJson(response, retry.kind === "completed" ? 200 : 202, publicReview(retry.job));
      } catch {
        sendError(response, 503, "REVIEW_UNAVAILABLE", "No se pudo reintentar la revisión en este momento.");
      }
      return "handled";
    }

    const reviewMatch = request.method === "GET" && url.pathname.match(/^\/api\/reviews\/([A-Za-z0-9_-]{1,100})$/);
    if (reviewMatch) {
      const job = await options.store.getJob(reviewMatch[1]!);
      if (!job) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la revisión.");
        return "handled";
      }
      if (!await ownsJob(job.id)) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la revisión.");
        return "handled";
      }
      const data = publicReview(job);
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
      const review = await options.store.getJob(parsed.data.reviewId);
      if (!review) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la revisión solicitada.");
        return "handled";
      }
      if (!await ownsJob(review.id)) {
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
      const submission = await options.store.getReviewSubmission(pdfMatch[1]!);
      if (!submission) {
        sendError(response, 404, "NOT_FOUND", "No se encontró la entrega Review.");
        return "handled";
      }
      if (options.resolveStudentId && (!studentId || !await ownsJob(submission.sourceId))) {
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

function sendCatalogJson(response: ServerResponse, data: unknown): void {
  const body = ApiResultSchema(GitHubPublicRepositorySchema.or(GitHubCommitSummarySchema).or(GitHubCommitListSchema)).parse({ ok: true, data });
  response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }).end(JSON.stringify(body));
}
function sendCatalogError(response: ServerResponse, status: number, code: string, message: string): void {
  const body = ApiResultSchema(GitHubPublicRepositorySchema.or(GitHubCommitSummarySchema).or(GitHubCommitListSchema)).parse({ ok: false, error: { code, message } });
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" }).end(JSON.stringify(body));
}

function publicReview(job: ReviewJobView) {
  return ReviewResponseSchema.parse(job.status === "completed" && job.record ? {
    id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
    status: "completed", analysis: job.record.analysis, progress: 100, updatedAt: job.updatedAt,
  } : job.status === "failed" ? {
    id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
    status: "failed", message: "No se pudo completar la revisión en este momento.", updatedAt: job.updatedAt,
  } : job.status === "running" ? {
    id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
    status: "running", progress: job.progress, updatedAt: job.updatedAt,
  } : {
    id: job.id, owner: job.owner, repo: job.repo, commitSha: job.commitSha,
    status: "queued", createdAt: job.createdAt, progress: job.progress, updatedAt: job.updatedAt,
  });
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
  const body = ApiResultSchema(ReviewResponseSchema.or(ReviewQueuedResponseSchema).or(ReviewSubmissionResponseSchema).or(VerifySubmissionResponseSchema).or(TeacherClassroomReviewsResponseSchema).or(MissionDeliveryHistorySchema)).parse({ ok: true, data });
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  const body = ApiResultSchema(ReviewResponseSchema.or(ReviewQueuedResponseSchema).or(ReviewSubmissionResponseSchema).or(VerifySubmissionResponseSchema).or(TeacherClassroomReviewsResponseSchema).or(MissionDeliveryHistorySchema)).parse({ ok: false, error: { code, message } });
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}
