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
import type { ReviewAcademicLinkResolver, ReviewContextResolver, ReviewTeacherIdResolver } from "../features/review/http.js";
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
import { createAdminQueueSummaryHttp, type AdminQueueAuditEvent } from "../features/admin-queue/http.js";
import { createAdminQueueSummaryRepository } from "../features/admin-queue/repository.js";
import { createAdminAuditLogHttp } from "../features/admin-audit-log/http.js";
import { createAdminAuditLog, type AdminAuditSourceEvent } from "../features/admin-audit-log/store.js";
import { createAdminReviewEventsHttp } from "../features/admin-review-events/http.js";
import type { ReviewOperationalEvent, StoredReviewOperationalEvent } from "../features/review/review-errors.js";
import { createAdminMentorEventsHttp } from "../features/admin-mentor-events/http.js";
import { createAdminTrainerEventsHttp } from "../features/admin-trainer-events/http.js";
import type { MentorOperationalEvent } from "../features/mentor/operational-events.js";
import type { TrainerOperationalEvent } from "../features/trainer/operational-events.js";
import { createAdminTeachersHttp } from "../features/admin-teachers/http.js";
import { createAdminTeachersRepository } from "../features/admin-teachers/repository.js";
import { createAdminTeachersService } from "../features/admin-teachers/service.js";

const healthSchema = ApiResultSchema(z.object({ status: z.literal("ok"), database: z.literal("ready") }).strict());
const errorSchema = ApiResultSchema(z.unknown());
type AdminAuditWrite = (event: AdminClassroomRequestsAuditEvent) => void | Promise<void>;
type AdminQueueAuditWrite = (event: AdminQueueAuditEvent) => void | Promise<void>;
type MaybePromise<T> = T | Promise<T>;
type ReviewOperationalLog = { record(event: ReviewOperationalEvent): void; list(limit?: number): MaybePromise<StoredReviewOperationalEvent[]> };
type MentorOperationalLog = { record(event: MentorOperationalEvent): void; list(limit?: number): MaybePromise<MentorOperationalEvent[]> };
type TrainerOperationalLog = { record(event: TrainerOperationalEvent): void; list(limit?: number): MaybePromise<TrainerOperationalEvent[]> };
type HttpOptions = {
  auth?: FragmentsAuthService;
  mentor?: ReturnType<typeof createMentorService>;
  logFailure?: (diagnostic: MentorEvaluationDiagnostic) => void;
  inspector?: ReturnType<typeof createInspectorService>;
  review?: { store: ReturnType<typeof createPrismaReviewStore>; service: ReturnType<typeof createReviewService>; resolveContext: ReviewContextResolver;
    resolveStudentId?: (request: IncomingMessage) => Promise<string | null>; resolveTeacherId?: ReviewTeacherIdResolver; resolveAcademicLink?: ReviewAcademicLinkResolver };
  trainer?: { service: ReturnType<typeof createTrainerService>; store: ReturnType<typeof createTrainerRepository> };
  adminAuditWrite?: AdminAuditWrite;
  adminQueueAuditWrite?: AdminQueueAuditWrite;
  adminAuditLogWriteLine?: (line: string) => void | Promise<void>;
  reviewOperationalLog?: ReviewOperationalLog;
  mentorOperationalLog?: MentorOperationalLog;
  trainerOperationalLog?: TrainerOperationalLog;
};

function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  response.writeHead(status).end(JSON.stringify(errorSchema.parse({ ok: false, error: { code, message } })));
}

export function createHttpHandler(database: PrismaClient, options: HttpOptions = {}) {
  const requestDiagnostics = createRequestDiagnostics();
  const adminAuditLog = createAdminAuditLog({ writeLine: options.adminAuditLogWriteLine ?? ((line) => {
    const event = JSON.parse(line) as AdminAuditSourceEvent;
    if (event.event === "admin.classroom_requests.read" && options.adminAuditWrite) return options.adminAuditWrite(event as AdminClassroomRequestsAuditEvent);
    if (event.event === "admin.queue_summary.read" && options.adminQueueAuditWrite) return options.adminQueueAuditWrite(event as AdminQueueAuditEvent);
    return new Promise<void>((resolve, reject) => {
      process.stdout.write(`${line}\n`, (error?: Error | null) => error ? reject(error) : resolve());
    });
  }) });
  const adminDiagnosticsHandler = createAdminDiagnosticsHttp(requestDiagnostics, async (request) => options.auth ? options.auth.adminCheck(request) : null);
  const adminClassroomRequests = createAdminClassroomRequestsRepository(database);
  const adminClassroomRequestsHandler = createAdminClassroomRequestsHttp(adminClassroomRequests, async (request) => options.auth ? options.auth.adminCheck(request) : null, {
    getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
    write: (event) => adminAuditLog.write(event),
  });
  const adminQueueSummaryHandler = createAdminQueueSummaryHttp(createAdminQueueSummaryRepository(database), async (request) => options.auth ? options.auth.adminCheck(request) : null, {
    getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
    write: (event) => adminAuditLog.write(event),
  });
  const adminAuditLogHandler = createAdminAuditLogHttp(adminAuditLog, async (request) => options.auth ? options.auth.adminCheck(request) : null, {
    getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
    write: (event) => adminAuditLog.write(event),
  });
  const adminReviewEventsHandler = options.reviewOperationalLog ? createAdminReviewEventsHttp(options.reviewOperationalLog, async (request) => options.auth ? options.auth.adminCheck(request) : null, {
    getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
    write: (event) => adminAuditLog.write(event),
  }) : undefined;
  const adminMentorEventsHandler = options.mentorOperationalLog ? createAdminMentorEventsHttp(options.mentorOperationalLog, async (request) => options.auth ? options.auth.adminCheck(request) : null, {
    getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
    write: (event) => adminAuditLog.write(event),
  }) : undefined;
  const adminTrainerEventsHandler = options.trainerOperationalLog ? createAdminTrainerEventsHttp(options.trainerOperationalLog, async (request) => options.auth ? options.auth.adminCheck(request) : null, { getActorId: async (request) => options.auth ? options.auth.userId(request) : null, write: (event) => adminAuditLog.write(event) }) : undefined;
  const adminTeachersHandler = createAdminTeachersHttp(
    createAdminTeachersService(createAdminTeachersRepository(database)),
    async (request) => options.auth ? options.auth.adminCheck(request) : null,
    {
      getActorId: async (request) => options.auth ? options.auth.userId(request) : null,
      write: (event) => adminAuditLog.write(event),
    },
  );
  const academicHandler = createAcademicHttp(database, options.auth);
  const classroomHandler = createClassroomHttp(database, options.auth);
  const technologyCatalogHandler = createTechnologyCatalogHttp(database, options.auth);
  const assignmentHandler = createAssignmentHttp(database, options.auth);
  const teacherAccountHandler = options.auth ? createTeacherAccountHttp(options.auth) : undefined;
  const mentorHandler = options.mentor ? createMentorHttp(database, options.mentor, {
    ...(options.auth ? { auth: options.auth } : {}),
    ...(options.logFailure ? { logFailure: options.logFailure } : {}),
    ...(options.mentorOperationalLog ? { logEvent: (event: MentorOperationalEvent) => {
      options.mentorOperationalLog?.record(event);
      console.log(JSON.stringify(event));
    } } : {}),
  }) : undefined;
  const mentorControlHandler = options.mentor ? createMentorControlHttp(database, options.auth) : undefined;
  const inspectorHandler = options.inspector ? createInspectorHttp(options.inspector, options.auth) : undefined;
  const reviewHandler = options.review ? createReviewHttp(options.review) : undefined;
  const trainerHandler = options.trainer ? createTrainerHttp(options.trainer.service, options.trainer.store.ensureSession, async (request) => (await options.auth?.student(request))?.id ?? null, options.trainerOperationalLog ? (event) => options.trainerOperationalLog?.record(event) : undefined) : undefined;
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
    // Review has a teacher classroom route; dispatch it before Classroom Studio's prefix catch-all.
    if (reviewHandler && await reviewHandler(request, response) === "handled") return;
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
    if (await adminClassroomRequestsHandler(request, response) === "handled") return;
    if (await adminQueueSummaryHandler(request, response) === "handled") return;
    if (await adminAuditLogHandler(request, response) === "handled") return;
    if (adminReviewEventsHandler && await adminReviewEventsHandler(request, response) === "handled") return;
    if (adminMentorEventsHandler && await adminMentorEventsHandler(request, response) === "handled") return;
    if (adminTrainerEventsHandler && await adminTrainerEventsHandler(request, response) === "handled") return;
    if (await adminTeachersHandler(request, response) === "handled") return;
    if (await adminDiagnosticsHandler(request, response) === "handled") return;
    const notFound = ApiResultSchema(z.unknown()).parse({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    response.writeHead(404).end(JSON.stringify(notFound));
  };
}

export function createApiServer(database: PrismaClient, options: HttpOptions = {}) { return createServer(createHttpHandler(database, options)); }
