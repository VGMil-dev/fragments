import { APICallError } from "ai";

export type GatewayFailureDetails = {
  gatewayHttpStatus: number | null;
  gatewayCode: string | null;
  gatewayGenerationId: string | null;
  providerHttpStatus: number | null;
  providerCode: string | null;
  retryAfterMs: number | null;
  retryable: boolean;
  providerDispatchPossible: boolean;
};

const safeCodePattern = /^[A-Za-z0-9_.:-]{1,80}$/;
const safeGenerationIdPattern = /^gen_[A-Za-z0-9]{16,64}$/;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeCode(value: unknown): string | null {
  return typeof value === "string" && safeCodePattern.test(value) ? value : null;
}

function httpStatus(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

function gatewayError(value: Record<string, unknown> | null): boolean {
  const name = typeof value?.name === "string" ? value.name : "";
  const type = typeof value?.type === "string" ? value.type : "";
  return name.startsWith("Gateway") || type === "rate_limit_exceeded" || type === "quota_for_entity_exceeded";
}

function codeFromProviderError(error: Record<string, unknown> | null): string | null {
  if (!error) return null;
  let body: Record<string, unknown> | null = record(error.data);
  if (!body && typeof error.responseBody === "string") {
    try { body = record(JSON.parse(error.responseBody)); } catch { body = null; }
  }
  const nested = record(body?.error);
  return safeCode(nested?.code) ?? safeCode(body?.code) ?? safeCode(nested?.type) ?? safeCode(body?.type);
}

function isProviderCallError(value: unknown): value is Record<string, unknown> {
  const item = record(value);
  return APICallError.isInstance(value) || (item?.name === "APICallError" && httpStatus(item.statusCode) !== null);
}

function providerCallError(value: unknown): Record<string, unknown> | null {
  if (gatewayError(record(value))) return null;
  let current: unknown = value;
  for (let depth = 0; depth < 5; depth += 1) {
    if (isProviderCallError(current)) return record(current);
    const next = record(current)?.cause;
    if (!next || next === current) return null;
    current = next;
  }
  return null;
}

function retryAfterMs(error: Record<string, unknown> | null): number | null {
  const headers = error?.responseHeaders;
  let raw: string | undefined;
  if (headers && typeof headers === "object" && "get" in headers && typeof headers.get === "function") {
    const value = headers.get("retry-after");
    raw = typeof value === "string" ? value : undefined;
  } else if (headers && typeof headers === "object") {
    const value = Object.entries(headers).find(([name]) => name.toLowerCase() === "retry-after")?.[1];
    raw = typeof value === "string" ? value : undefined;
  }
  if (!raw) return null;
  const seconds = Number(raw);
  const delay = Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : Date.parse(raw) - Date.now();
  return Number.isFinite(delay) && delay >= 0 ? Math.min(delay, 86_400_000) : null;
}

export function classifyGatewayFailure(error: unknown): GatewayFailureDetails {
  const root = record(error);
  const normalizedGatewayFailure = httpStatus(root?.gatewayHttpStatus) !== null;
  const isGatewayError = gatewayError(root) || normalizedGatewayFailure;
  const upstreamCall = providerCallError(error);
  const cause = record(root?.cause);
  const nestedProviderCall = isGatewayError ? providerCallError(cause) : null;
  const causeHasStatus = httpStatus(cause?.statusCode) !== null;
  const gatewayStatus = isGatewayError ? httpStatus(root?.statusCode) ?? httpStatus(root?.gatewayHttpStatus) : null;
  const providerStatus = httpStatus(root?.providerHttpStatus) ?? httpStatus(upstreamCall?.statusCode) ?? httpStatus(nestedProviderCall?.statusCode);
  const gatewayType = safeCode(root?.type) ?? safeCode(root?.gatewayCode);
  const rawGenerationId = root?.generationId ?? root?.gatewayGenerationId;
  const generationId = typeof rawGenerationId === "string" && safeGenerationIdPattern.test(rawGenerationId)
    ? rawGenerationId
    : null;

  return {
    gatewayHttpStatus: gatewayStatus,
    gatewayCode: gatewayType,
    gatewayGenerationId: generationId,
    providerHttpStatus: providerStatus,
    providerCode: safeCode(root?.providerCode) ?? codeFromProviderError(upstreamCall) ?? codeFromProviderError(nestedProviderCall),
    retryAfterMs: typeof root?.retryAfterMs === "number" && Number.isSafeInteger(root.retryAfterMs) && root.retryAfterMs >= 0
      ? root.retryAfterMs
      : (isGatewayError ? retryAfterMs(root) : null) ?? retryAfterMs(causeHasStatus ? cause : upstreamCall),
    retryable: root?.isRetryable === true || gatewayStatus === 429 || providerStatus === 429 || providerStatus === 503,
    providerDispatchPossible: typeof root?.providerDispatchPossible === "boolean" ? root.providerDispatchPossible : root?.safeNoCharge === true ? false : isGatewayError
      ? Boolean(gatewayStatus !== 402 && (providerStatus !== null || gatewayStatus !== 429 || generationId !== null))
      : true,
  };
}

export function hasConfirmedNoChargeGatewayRejection(error: unknown): boolean {
  if (record(error)?.safeNoCharge === true) return true;
  const details = classifyGatewayFailure(error);
  if (details.providerDispatchPossible || details.providerHttpStatus !== null) return false;
  return details.gatewayHttpStatus === 402 || details.gatewayHttpStatus === 429;
}
