import { describe, expect, it, vi } from "vitest";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createTechnologyCatalogHttp } from "./technology-catalog-http.js";

function request(url: string) {
  return { method: "GET", url, headers: {} } as unknown as IncomingMessage;
}
async function call(handler: ReturnType<typeof createTechnologyCatalogHttp>, url: string, studentId?: string) {
  let status = 0;
  let raw = "";
  const response = {
    writeHead(value: number) { status = value; return this; },
    end(value?: string) { raw = value ?? ""; },
  } as unknown as ServerResponse;
  void studentId;
  await handler(request(url), response);
  return { status, body: JSON.parse(raw) as unknown };
}

describe("technology catalog HTTP", () => {
  it("requires an authenticated student before querying the catalog", async () => {
    const findMany = vi.fn();
    const database = { technologyCatalogItem: { findMany } } as unknown as PrismaClient;
    const auth = { async student() { return null; } } as unknown as FragmentsAuthService;
    const handler = createTechnologyCatalogHttp(database, auth);
    const result = await call(handler, "/api/mentor/suggested-technologies");
    expect(result.status).toBe(401);
    expect(findMany).not.toHaveBeenCalled();
  });

  it("derives suggestions from active enrollments in active classrooms, never from client classroom IDs", async () => {
    const findMany = vi.fn(async (_args: unknown) => []);
    const database = { technologyCatalogItem: { findMany } } as unknown as PrismaClient;
    const auth = { async student() { return { id: "student-authenticated" }; } } as unknown as FragmentsAuthService;
    const handler = createTechnologyCatalogHttp(database, auth);
    const result = await call(handler, "/api/mentor/suggested-technologies?classroomId=attacker-controlled");
    expect(result.status).toBe(200);
    const query = findMany.mock.calls[0]?.[0] as { where: Record<string, any> };
    expect(query.where.availability.some.enabled).toBe(true);
    expect(query.where.availability.some.classroom.status).toBe("active");
    expect(query.where.availability.some.classroom.enrollments.some).toEqual({ studentId: "student-authenticated", status: "active" });
    expect(JSON.stringify(query.where)).not.toContain("attacker-controlled");
  });

  it("searches the catalog and recovers selected labels without changing the stable cursor", async () => {
    const selected = [{ id: "technology-1", slug: "sample-tech", name: "Sample Tech", description: null }];
    const findMany = vi.fn(async (_args: unknown) => selected);
    const database = { technologyCatalogItem: { findMany } } as unknown as PrismaClient;
    const auth = { async student() { return { id: "student-authenticated" }; } } as unknown as FragmentsAuthService;
    const handler = createTechnologyCatalogHttp(database, auth);
    const result = await call(handler, "/api/mentor/technology-catalog?q=sample&cursor=technology-0&selectedIds=technology-1");
    expect(result.status).toBe(200);
    const query = findMany.mock.calls[0]?.[0] as { where: unknown; cursor: { id: string }; skip: number };
    expect(query.where).toEqual({ name: { contains: "sample", mode: "insensitive" } });
    expect(query.cursor).toEqual({ id: "technology-0" });
    expect(query.skip).toBe(1);
    expect(findMany.mock.calls[1]?.[0]).toMatchObject({ where: { id: { in: ["technology-1"] } } });
    expect(findMany).toHaveBeenCalledTimes(2);
    expect(result.body).toMatchObject({ ok: true, data: { items: [{ id: "technology-1", name: "Sample Tech" }], nextCursor: null } });
  });

  it("keeps all 20 selected labels alongside a full 50-item search page", async () => {
    const searchRows = Array.from({ length: 51 }, (_, index) => ({ id: `search-${index}`, slug: `search-${index}`, name: `Search ${String(index).padStart(2, "0")}`, description: null }));
    const selectedRows = Array.from({ length: 20 }, (_, index) => ({ id: `selected-${index}`, slug: `selected-${index}`, name: `Selected ${index}`, description: null }));
    const findMany = vi.fn(async (args: { where?: { name?: unknown } }) => args.where?.name ? searchRows : selectedRows);
    const database = { technologyCatalogItem: { findMany } } as unknown as PrismaClient;
    const auth = { async student() { return { id: "student-authenticated" }; } } as unknown as FragmentsAuthService;
    const handler = createTechnologyCatalogHttp(database, auth);
    const ids = selectedRows.map((entry) => entry.id).join(",");
    const result = await call(handler, `/api/mentor/technology-catalog?q=search&selectedIds=${ids}`);
    expect(result.status).toBe(200);
    const body = result.body as { data: { items: Array<{ id: string }>; nextCursor: string | null } };
    expect(body.data.items).toHaveLength(70);
    expect(body.data.items.map((entry) => entry.id)).toContain("selected-19");
    expect(body.data.nextCursor).toBe("search-49");
  });
});
