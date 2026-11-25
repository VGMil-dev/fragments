import { createServer } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createHttpHandler } from "../../http/app.js";

const servers: ReturnType<typeof createServer>[] = [];
afterEach(async () => { await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve())))); });

describe("admin AI budget diagnostics", () => {
  it("protects and audits the read, returns non-secret config and makes unknown balances explicit", async () => {
    const auth = {
      adminCheck: vi.fn(async (request: { headers: Record<string, unknown> }) => request.headers["x-fixture-role"] === "admin" ? true : request.headers["x-fixture-role"] === "teacher" ? false : null),
      userId: vi.fn(async () => "fixture-admin"),
    } as unknown as FragmentsAuthService;
    const readLedger = vi.fn(async () => ({ settledMicroUsd: 125000, reservedMicroUsd: 40000, uncertainMicroUsd: 9000 }));
    const audit: unknown[] = [];
    const handler = createHttpHandler({} as PrismaClient, {
      auth, aiDiagnostics: { apiKeyConfigured: true, model: "gateway/model-x", providerOnly: "openai", inputUsdPerMillion: 1.2, outputUsdPerMillion: 4.5, readLedger },
      adminAuditLogWriteLine: (line) => { audit.push(JSON.parse(line)); },
    });
    const server = createServer(handler); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("server bind failed");
    const url = `http://127.0.0.1:${address.port}/api/admin/ai-diagnostics`;
    expect((await fetch(url)).status).toBe(401);
    expect((await fetch(url, { headers: { "x-fixture-role": "teacher" } })).status).toBe(403);
    expect(readLedger).not.toHaveBeenCalled();
    const response = await fetch(url, { headers: { "x-fixture-role": "admin" } });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toMatchObject({ ok: true, data: {
      configuration: { apiKeyConfigured: true, model: "gateway/model-x", providerOnly: "openai", inputUsdPerMillion: 1.2, outputUsdPerMillion: 4.5 },
      ledger: { settledMicroUsd: 125000, reservedMicroUsd: 40000, uncertainMicroUsd: 9000 },
      providerBalance: { status: "unknown" }, globalBudgetLimit: { status: "unknown" },
    } });
    expect(JSON.stringify(body)).not.toMatch(/secret|api.?key\s*[:=]\s*[^\s]/i);
    expect(audit).toEqual([expect.objectContaining({ event: "admin.ai_diagnostics.read", adminActorId: "fixture-admin" })]);
    expect(readLedger).toHaveBeenCalledOnce();
  });

  it("does not turn a ledger failure into zero cost or a successful response", async () => {
    const auth = { adminCheck: async () => true, userId: async () => "fixture-admin" } as unknown as FragmentsAuthService;
    const server = createServer(createHttpHandler({} as PrismaClient, { auth, aiDiagnostics: {
      apiKeyConfigured: false, readLedger: async () => { throw new Error("offline"); },
    } })); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("server bind failed");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/admin/ai-diagnostics`);
    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({ ok: false, error: { code: "AI_LEDGER_UNAVAILABLE" } });
  });
});
