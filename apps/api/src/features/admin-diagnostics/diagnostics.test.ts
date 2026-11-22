import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";
import { createRequestDiagnostics, classifyRouteFamily } from "./diagnostics.js";

describe("safe request diagnostics", () => {
  it("uses only allowlisted fields and removes dynamic URL content", () => {
    const write = vi.fn();
    const diagnostics = createRequestDiagnostics({ write, id: () => "00000000-0000-4000-8000-000000000001", now: () => new Date("2026-11-22T12:00:00.000Z") });
    const event = diagnostics.record({ method: "GET", pathname: "/api/teacher/classrooms/private-email@example.test?token=private", statusCode: 500, durationMs: 42 });
    expect(event).toEqual({ requestId: "00000000-0000-4000-8000-000000000001", occurredAt: "2026-11-22T12:00:00.000Z", method: "GET", routeFamily: "classrooms", statusCode: 500, durationMs: 42 });
    expect(JSON.stringify(event)).not.toContain("private");
    expect(write).toHaveBeenCalledWith(JSON.stringify(event));
  });

  it("classifies unknown paths and methods without copying them", () => {
    expect(classifyRouteFamily("/unmapped/person@example.test?secret=1")).toBe("other");
    expect(classifyRouteFamily("/api/admin/classroom-requests?status=pending")).toBe("admin.requests");
    expect(classifyRouteFamily("/api/admin/queue/summary")).toBe("admin.queue");
    expect(classifyRouteFamily("/api/admin/audit-log?limit=50")).toBe("admin.audit_log");
    expect(classifyRouteFamily("/api/admin/teachers?limit=20")).toBe("admin.teachers");
    const diagnostics = createRequestDiagnostics({ write: () => undefined, id: () => "fake-request-id" });
    expect(diagnostics.record({ method: "TRACE /secret", pathname: "/secret" as never, statusCode: 204, durationMs: -9 })).toMatchObject({ method: "OTHER", routeFamily: "other", durationMs: 0 });
  });

  it("records the completed response status with a server-generated request ID", () => {
    const write = vi.fn();
    const diagnostics = createRequestDiagnostics({ write, id: () => "00000000-0000-4000-8000-000000000002", now: () => new Date("2026-11-22T12:00:00.000Z") });
    let finish: (() => void) | undefined;
    const response = {
      statusCode: 503,
      setHeader: vi.fn(),
      once: vi.fn((_event: string, callback: () => void) => { finish = callback; }),
    } as unknown as ServerResponse;
    const request = { method: "GET", url: "/api/teacher/classrooms/secret-id/assignments?email=private@example.test", headers: { "x-request-id": "client-controlled" } } as unknown as IncomingMessage;
    const requestId = diagnostics.observe(request, response);
    expect(requestId).toBe("00000000-0000-4000-8000-000000000002");
    expect(response.setHeader).toHaveBeenCalledWith("x-request-id", requestId);
    finish?.();
    const event = diagnostics.list(1)[0]!;
    expect(event).toMatchObject({ requestId, method: "GET", routeFamily: "assignments", statusCode: 503 });
    expect(JSON.stringify(event)).not.toContain("secret-id");
    expect(JSON.stringify(event)).not.toContain("private@example.test");
    expect(JSON.stringify(event)).not.toContain("client-controlled");
  });

  it("retains at most 100 events newest first and clamps reads", () => {
    let nextId = 0;
    const diagnostics = createRequestDiagnostics({ write: () => undefined, id: () => `fake-${++nextId}` });
    for (let index = 0; index < 103; index += 1) diagnostics.record({ method: "GET", pathname: "/health", statusCode: 200, durationMs: index });
    expect(diagnostics.list(100)).toHaveLength(100);
    expect(diagnostics.list(999)).toHaveLength(100);
    expect(diagnostics.list(0)).toHaveLength(1);
    expect(diagnostics.list(2).map((event) => event.durationMs)).toEqual([102, 101]);
  });
});
