import { ApiResultSchema } from "@fragments/contracts";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { z } from "zod";
import type { FragmentsAuthService } from "../auth/better-auth.js";
import { createTeacherAccountHttp } from "../auth/teacher-account-http.js";
import { createMentorHttp, type MentorEvaluationDiagnostic } from "../features/mentor/http.js";
import { createAcademicHttp } from "../features/mentor/academic-http.js";
import { createMentorControlHttp } from "../features/mentor/control-http.js";
import type { createMentorService } from "../features/mentor/service.js";
import { createInspectorHttp } from "../features/inspector/http.js";
import type { createInspectorService } from "../features/inspector/service.js";
import { createReviewHttp } from "../features/review/http.js";
import type { ReviewContextResolver } from "../features/review/http.js";
import type { createReviewService } from "../features/review/review.service.js";
import type { createPrismaReviewStore } from "../features/review/prisma-store.js";
import { createTrainerHttp } from "../features/trainer/http.js";
import { createTrainerRepository } from "../features/trainer/repository.js";
import type { createTrainerService } from "../features/trainer/service.js";
import { createClassroomHttp } from "../features/classroom/http.js";
import { createTechnologyCatalogHttp } from "../features/mentor/technology-catalog-http.js";
import { createAssignmentHttp } from "../features/assignments/http.js";
import { createRequestDiagnostics } from "../features/admin-diagnostics/diagnostics.js";
import { createAdminDiagnosticsHttp } from "../features/admin-diagnostics/http.js";
import { createAdminClassroomRequestsHttp, type AdminClassroomRequestsAuditEvent } from "../features/admin-requests/http.js";
import { createAdminClassroomRequestsRepository } from "../features/admin-requests/repository.js";

const healthSchema = ApiResultSchema(z.object({ status: z.literal("ok"), database: z.literal("ready") }).strict());
const errorSchema = ApiResultSchema(z.unknown());
type AdminAuditWrite = (event: AdminClassroomRequestsAuditEvent) => void | Promise<void>;
type HttpOptions = {
  auth?: FragmentsAuthService;
  mentor?: ReturnType<typeof createMentorService>;
  logFailure?: (diagnostic: MentorEvaluationDiagnostic) => void;
  inspector?: ReturnType<typeof createInspectorService>;
  review?: { store: ReturnType<typeof createPrismaReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver; resolveStudentId?: (request: IncomingMessage) => Promise<string | null> };
  trainer?: { service: ReturnType<typeof createTrainerService>; store: ReturnType<typeof createTrainerRepository> };
  adminAuditWrite?: AdminAuditWrite;
};

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status).end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}

export function createHttpHandler(database: PrismaClient, options: HttpOptions = {}) {
  const requestDiagnostics = createRequestDiagnostics();
  const adminDiagnosticsHandler = createAdminDiagnosticsHttp(requestDiagnostics, async (request) => options.auth ? options.auth.adminCheck(request) : null);
  const adminClassroomRequests = createAdminClassroomRequestsRepository(database);
  const adminClassroomRequestsHandler = createAdminClassroomRequestsHttp(adminClassroomRequests, async (request) => options.auth ? options.auth.adminCheck(request) : null, {
    getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
    write: options.adminAuditWrite ?? ((event) => new Promise<void>((resolve, reject) => {
      process.stdout.write(`${JSON.stringify(event)}\n`, (error?: Error | null) => error ? reject(error) : resolve());
    })),
  });
  const academicHandler = createAcademicHttp(database, options.auth);
  const classroomHandler = createClassroomHttp(database, options.auth);
  const technologyCatalogHandler = createTechnologyCatalogHttp(database, options.auth);
  const assignmentHandler = createAssignmentHttp(database, options.auth);
  const teacherAccountHandler = options.auth ? createTeacherAccountHttp(options.auth) : undefined;
  const mentorHandler = options.mentor ? createMentorHttp(database, options.mentor, {
    ...(options.auth ? { auth: options.auth } : {}),
    ...(options.logFailure ? { logFailure: options.logFailure } : {}),
  }) : undefined;
  const mentorControlHandler = options.mentor ? createMentorControlHttp(database, options.auth) : undefined;
  const inspectorHandler = options.inspector ? createInspectorHttp(options.inspector, options.auth) : undefined;
  const reviewHandler = options.review ? createReviewHttp(options.review) : undefined;
  const trainerHandler = options.trainer ? createTrainerHttp(options.trainer.service, options.trainer.store.ensureSession, async (request) => (await options.auth?.student(request))?.id ?? null) : undefined;
  return async (request: IncomingMessage, response: ServerResponse) => {
    requestDiagnostics.observe(request, response);
    const pathname = new URL(request.url ?? "/", "http://fragments.local").pathname;
    if (pathname === "/api/auth/link-social" && request.method === "POST") {
      sendError(response, 404, "NOT_FOUND", "No se encontró la ruta.");
      return;
    }
    if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
      if (!options.auth) {
        sendError(response, 503, "AUTH_DISABLED", "El acceso docente no está habilitado.");
        return;
      }
      options.auth.handle(request, response);
      return;
    }
    if (teacherAccountHandler && await teacherAccountHandler(request, response) === "handled") return;
    if (await assignmentHandler(request, response) === "handled") return;
    if (classroomHandler && await classroomHandler(request, response) === "handled") return;
    if (await technologyCatalogHandler(request, response) === "handled") return;
    response.setHeader("content-type", "application/json; charset=utf-8");
    response.setHeader("x-content-type-options", "nosniff");
    if (request.method === "GET" && request.url === "/health") {
      try {
        await database.$queryRaw`SELECT 1`;
        const body = healthSchema.parse({ ok: true, data: { status: "ok", database: "ready" } });
        response.writeHead(200).end(JSON.stringify(body));
      } catch {
        response.writeHead(503).end(JSON.stringify({ ok: false, error: { code: "NOT_READY", message: "El servicio no está listo." } }));
      }
      return;
    }
    if (academicHandler && await academicHandler(request, response) === "handled") return;
    if (mentorHandler && await mentorHandler(request, response) === "handled") return;
    if (mentorControlHandler && await mentorControlHandler(request, response) === "handled") return;
    if (inspectorHandler && await inspectorHandler(request, response) === "handled") return;
    if (trainerHandler && await trainerHandler(request, response) === "handled") return;
    if (reviewHandler && await reviewHandler(request, response) === "handled") return;
    if (await adminClassroomRequestsHandler(request, response) === "handled") return;
    if (await adminDiagnosticsHandler(request, response) === "handled") return;
    const notFound = ApiResultSchema(z.unknown()).parse({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    response.writeHead(404).end(JSON.stringify(notFound));
  };
}

export function createApiServer(database: PrismaClient, options: Omit<HttpOptions, "review"> & { review?: { store: ReturnType<typeof createPrismaReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver } } = {}) { return createServer(createHttpHandler(database, options)); }
