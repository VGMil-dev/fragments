import { randomUUID } from "node:crypto";
import { performance } from "node:perf_hooks";
import type { IncomingMessage, ServerResponse } from "node:http";

export const REQUEST_DIAGNOSTICS_CAPACITY = 100;
export const REQUEST_DIAGNOSTICS_MAX_PAGE_SIZE = 50;

export const REQUEST_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "OTHER"] as const;
export type DiagnosticMethod = (typeof REQUEST_METHODS)[number];
export const ROUTE_FAMILIES = ["health", "auth", "classrooms", "assignments", "mentor", "review", "trainer", "inspector", "admin.diagnostics", "admin.requests", "admin.queue", "admin.audit_log", "admin.teachers", "admin.review_events", "admin.mentor_events", "admin.ai_diagnostics", "other"] as const;
export type RouteFamily = (typeof ROUTE_FAMILIES)[number];

export type RequestDiagnosticEvent = {
  requestId: string;
  occurredAt: string;
  method: DiagnosticMethod;
  routeFamily: RouteFamily;
  statusCode: number;
  durationMs: number;
};

type RecordInput = { method?: string; pathname?: string; statusCode?: number; durationMs?: number };
type Options = { write?: (line: string) => void; id?: () => string; now?: () => Date };

const methods = new Set<string>(REQUEST_METHODS.slice(0, -1));

export function classifyRouteFamily(pathname: string): RouteFamily {
  const path = pathname.split(/[?#]/, 1)[0] ?? "";
  if (path === "/health") return "health";
  if (path === "/api/auth" || path.startsWith("/api/auth/")) return "auth";
  if (path.startsWith("/api/admin/diagnostics/")) return "admin.diagnostics";
  if (path === "/api/admin/classroom-requests") return "admin.requests";
  if (path === "/api/admin/queue/summary") return "admin.queue";
  if (path === "/api/admin/audit-log") return "admin.audit_log";
  if (path === "/api/admin/teachers") return "admin.teachers";
  if (path === "/api/admin/review-events") return "admin.review_events";
  if (path === "/api/admin/mentor-events") return "admin.mentor_events";
  if (path === "/api/admin/ai-diagnostics") return "admin.ai_diagnostics";
  if ((path === "/api/teacher/classrooms" || path === "/api/me/classrooms" || path.startsWith("/api/teacher/classrooms/") || path.startsWith("/api/me/classrooms/")) && path.includes("/assignments")) return "assignments";
  if (path.startsWith("/api/teacher/assignments/") || path.startsWith("/api/me/assignments/")) return "assignments";
  if (path === "/api/teacher/classrooms" || path === "/api/me/classrooms" || path.startsWith("/api/teacher/classrooms/") || path.startsWith("/api/me/classrooms/")) return "classrooms";
  if (path.startsWith("/api/mentor/")) return "mentor";
  if (path.startsWith("/api/reviews") || path.startsWith("/api/review/")) return "review";
  if (path.startsWith("/api/trainer/")) return "trainer";
  if (path.startsWith("/api/inspector/")) return "inspector";
  return "other";
}

function safeMethod(method: string | undefined): DiagnosticMethod {
  if (typeof method !== "string") return "OTHER";
  const normalized = method.toUpperCase();
  return methods.has(normalized) ? normalized as DiagnosticMethod : "OTHER";
}

function safeStatus(statusCode: number | undefined): number {
  return Number.isInteger(statusCode) && statusCode! >= 100 && statusCode! <= 599 ? statusCode! : 500;
}

function safeDuration(durationMs: number | undefined): number {
  return Number.isFinite(durationMs) ? Math.max(0, Math.round(durationMs!)) : 0;
}

export function createRequestDiagnostics(options: Options = {}) {
  const events: RequestDiagnosticEvent[] = [];
  const write = options.write ?? ((line: string) => { process.stdout.write(`${line}\n`); });
  const newId = options.id ?? randomUUID;
  const now = options.now ?? (() => new Date());

  function record(input: RecordInput): RequestDiagnosticEvent {
    const event: RequestDiagnosticEvent = {
      requestId: newId(),
      occurredAt: now().toISOString(),
      method: safeMethod(input.method),
      routeFamily: classifyRouteFamily(input.pathname ?? ""),
      statusCode: safeStatus(input.statusCode),
      durationMs: safeDuration(input.durationMs),
    };
    events.unshift(event);
    if (events.length > REQUEST_DIAGNOSTICS_CAPACITY) events.length = REQUEST_DIAGNOSTICS_CAPACITY;
    try { write(JSON.stringify(event)); } catch { /* Logging failure must not fail the API response. */ }
    return event;
  }

  function observe(request: IncomingMessage, response: ServerResponse): string {
    const requestId = newId();
    const startedAt = performance.now();
    response.setHeader("x-request-id", requestId);
    response.once("finish", () => {
      recordWithId(requestId, {
        ...(request.method ? { method: request.method } : {}),
        ...(request.url ? { pathname: request.url } : {}),
        statusCode: response.statusCode,
        durationMs: performance.now() - startedAt,
      });
    });
    return requestId;
  }

  function recordWithId(requestId: string, input: RecordInput): RequestDiagnosticEvent {
    const event: RequestDiagnosticEvent = {
      requestId,
      occurredAt: now().toISOString(),
      method: safeMethod(input.method),
      routeFamily: classifyRouteFamily(input.pathname ?? ""),
      statusCode: safeStatus(input.statusCode),
      durationMs: safeDuration(input.durationMs),
    };
    events.unshift(event);
    if (events.length > REQUEST_DIAGNOSTICS_CAPACITY) events.length = REQUEST_DIAGNOSTICS_CAPACITY;
    try { write(JSON.stringify(event)); } catch { /* Logging failure must not fail the API response. */ }
    return event;
  }

  return {
    record,
    observe,
    list(limit = REQUEST_DIAGNOSTICS_MAX_PAGE_SIZE): RequestDiagnosticEvent[] {
      const bounded = Math.max(1, Math.min(REQUEST_DIAGNOSTICS_CAPACITY, Math.trunc(limit) || 1));
      return events.slice(0, bounded);
    },
  };
}
