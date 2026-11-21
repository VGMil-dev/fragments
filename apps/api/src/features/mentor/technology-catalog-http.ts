import type { IncomingMessage, ServerResponse } from "node:http";
import { TechnologyCatalogPageSchema, TechnologyCatalogQuerySchema } from "@fragments/contracts";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";

type RouteResult = "handled" | "unhandled";
const PAGE_SIZE = 50;

export function createTechnologyCatalogHttp(database: PrismaClient, auth?: FragmentsAuthService) {
  return async function handleTechnologyCatalogHttp(request: IncomingMessage, response: ServerResponse): Promise<RouteResult> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    const catalogRoute = request.method === "GET" && url.pathname === "/api/mentor/technology-catalog";
    const suggestedRoute = request.method === "GET" && url.pathname === "/api/mentor/suggested-technologies";
    if (!catalogRoute && !suggestedRoute) return "unhandled";
    if (!auth) { sendError(response, 503, "AUTH_DISABLED", "El acceso estudiantil no está habilitado."); return "handled"; }
    let student: { id: string } | null;
    try { student = await auth.student(request); }
    catch { sendError(response, 503, "AUTH_UNAVAILABLE", "No se pudo validar la sesión."); return "handled"; }
    if (!student) { sendError(response, 401, "AUTH_REQUIRED", "Inicia sesión con GitHub para continuar."); return "handled"; }

    if (suggestedRoute) {
      const cursor = url.searchParams.get("cursor") ?? undefined;
      if (cursor && !/^[A-Za-z0-9_-]{1,100}$/.test(cursor)) { sendError(response, 400, "INVALID_PAGINATION", "Revisa el cursor solicitado."); return "handled"; }
      const rows = await database.technologyCatalogItem.findMany({
        where: { availability: { some: { enabled: true, classroom: { status: "active", enrollments: { some: { studentId: student.id, status: "active" } } } } } },
        orderBy: [{ name: "asc" }, { id: "asc" }], take: PAGE_SIZE + 1,
        ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      });
      sendJson(response, 200, { ok: true, data: page(rows) });
      return "handled";
    }

    const selectedRaw = url.searchParams.get("selectedIds");
    const parsed = TechnologyCatalogQuerySchema.safeParse({
      ...(url.searchParams.has("q") ? { q: url.searchParams.get("q") } : {}),
      ...(url.searchParams.has("cursor") ? { cursor: url.searchParams.get("cursor") } : {}),
      ...(selectedRaw ? { selectedIds: selectedRaw.split(",") } : {}),
    });
    if (!parsed.success) { sendError(response, 400, "INVALID_QUERY", "Revisa la búsqueda del catálogo."); return "handled"; }
    const { q = "", cursor, selectedIds = [] } = parsed.data;
    const searchRows = await database.technologyCatalogItem.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      orderBy: [{ name: "asc" }, { id: "asc" }], take: PAGE_SIZE + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    const selectedRows = selectedIds.length ? await database.technologyCatalogItem.findMany({ where: { id: { in: selectedIds } }, orderBy: [{ name: "asc" }, { id: "asc" }] }) : [];
    const searchPage = searchRows.slice(0, PAGE_SIZE);
    const byId = new Map([...searchPage, ...selectedRows].map((row) => [row.id, row]));
    const data = TechnologyCatalogPageSchema.parse({ items: [...byId.values()], nextCursor: searchRows.length > PAGE_SIZE ? searchPage.at(-1)?.id ?? null : null });
    sendJson(response, 200, { ok: true, data });
    return "handled";
  };
}

function page(rows: Array<{ id: string; slug: string; name: string; description: string | null }>) {
  const hasMore = rows.length > PAGE_SIZE;
  const items = rows.slice(0, PAGE_SIZE);
  return TechnologyCatalogPageSchema.parse({ items, nextCursor: hasMore ? items.at(-1)?.id ?? null : null });
}
function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(body));
}
function sendError(response: ServerResponse, status: number, code: string, message: string): void {
  sendJson(response, status, { ok: false, error: { code, message } });
}
