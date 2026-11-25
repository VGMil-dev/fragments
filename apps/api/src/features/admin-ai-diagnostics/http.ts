import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { AiBudgetSummary } from "../../adapters/ai/budget-ledger.js";

export type AdminAiDiagnosticsConfig = {
  apiKeyConfigured: boolean;
  model?: string;
  providerOnly?: string;
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  readLedger: () => Promise<AiBudgetSummary>;
};
type AuditEvent = { requestId: string; event: "admin.ai_diagnostics.read"; occurredAt: string; adminActorId: string };
type AdminCheck = (request: IncomingMessage) => Promise<boolean | null>;
type Audit = { getActorId(request: IncomingMessage): Promise<string | null>; write(event: AuditEvent): void | Promise<void>; now?: () => Date };

export function createAdminAiDiagnosticsHttp(config: AdminAiDiagnosticsConfig, isAdmin: AdminCheck, audit: Audit) {
  return async function handleAdminAiDiagnostics(request: IncomingMessage, response: ServerResponse): Promise<"handled" | "unhandled"> {
    const url = new URL(request.url ?? "/", "http://fragments.local");
    if (request.method !== "GET" || url.pathname !== "/api/admin/ai-diagnostics") return "unhandled";
    let allowed: boolean | null;
    try { allowed = await isAdmin(request); }
    catch { send(response, 503, { ok: false, error: { code: "AUTH_UNAVAILABLE", message: "No se pudieron validar los permisos." } }); return "handled"; }
    if (allowed === null) { send(response, 401, { ok: false, error: { code: "AUTH_REQUIRED", message: "Inicia sesión para continuar." } }); return "handled"; }
    if (!allowed) { send(response, 403, { ok: false, error: { code: "FORBIDDEN", message: "No tienes permiso para consultar el diagnóstico IA." } }); return "handled"; }
    let actorId: string | null;
    try { actorId = await audit.getActorId(request); } catch { actorId = null; }
    if (!actorId) { send(response, 503, { ok: false, error: { code: "AUDIT_IDENTITY_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } }); return "handled"; }
    const requestId = response.getHeader("x-request-id");
    try { await audit.write({ requestId: typeof requestId === "string" ? requestId : randomUUID(), event: "admin.ai_diagnostics.read", occurredAt: (audit.now ?? (() => new Date()))().toISOString(), adminActorId: actorId }); }
    catch { send(response, 503, { ok: false, error: { code: "AUDIT_UNAVAILABLE", message: "No se pudo registrar la consulta administrativa." } }); return "handled"; }
    let ledger: AiBudgetSummary;
    try {
      ledger = await config.readLedger();
      if (![ledger.settledMicroUsd, ledger.reservedMicroUsd, ledger.uncertainMicroUsd].every((value) => Number.isSafeInteger(value) && value >= 0)) throw new Error("Invalid ledger aggregate");
    }
    catch { send(response, 503, { ok: false, error: { code: "AI_LEDGER_UNAVAILABLE", message: "No se pudo consultar el agregado del ledger IA." } }); return "handled"; }
    const data = {
      configuration: {
        apiKeyConfigured: config.apiKeyConfigured,
        model: safeIdentifier(config.model),
        providerOnly: safeIdentifier(config.providerOnly),
        inputUsdPerMillion: safeRate(config.inputUsdPerMillion),
        outputUsdPerMillion: safeRate(config.outputUsdPerMillion),
      },
      ledger,
      providerBalance: { status: "unknown" as const },
      globalBudgetLimit: { status: "unknown" as const },
    };
    send(response, 200, { ok: true, data });
    return "handled";
  };
}

function safeIdentifier(value: string | undefined): string | null {
  if (!value || value.length > 120 || !/^[a-zA-Z0-9@._:/+-]+$/.test(value)) return null;
  return value;
}
function safeRate(value: number | undefined): number | null { return value !== undefined && Number.isFinite(value) && value > 0 ? value : null; }
function send(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
  response.end(JSON.stringify(payload));
}
