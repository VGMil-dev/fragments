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

type RecordValue = Record<string, unknown>;
const safeCodePattern = /^[A-Za-z0-9_.:-]{1,80}$/;
const safeGenerationIdPattern = /^gen_[A-Za-z0-9]{16,64}$/;

function record(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function safeCode(value: unknown): string | null {
  return typeof value === "string" && safeCodePattern.test(value) ? value : null;
}

function httpStatus(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
}

function gatewayError(value: RecordValue | null): boolean {
  const name = typeof value?.name === "string" ? value.name : "";
  const type = typeof value?.type === "string" ? value.type : "";
  return name.startsWith("Gateway") || type === "rate_limit_exceeded" || type === "quota_for_entity_exceeded";
}

function isProviderCallError(value: unknown): value is RecordValue {
  return APICallError.isInstance(value) || record(value)?.name === "APICallError";
}

function providerCallError(value: unknown): RecordValue | null {
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

function providerCode(error: RecordValue | null): string | null {
  if (!error) return null;
  let body = record(error.data);
  if (!body && typeof error.responseBody === "string") {
    try { body = record(JSON.parse(error.responseBody)); } catch { body = null; }
  }
  const nested = record(body?.error);
  return safeCode(nested?.code) ?? safeCode(body?.code) ?? safeCode(nested?.type) ?? safeCode(body?.type);
}

function retryAfterMs(error: RecordValue | null): number | null {
  const headers = error?.responseHeaders;
  const rawValue = headers && typeof headers === "object" && "get" in headers && typeof headers.get === "function"
    ? headers.get("retry-after")
    : headers && typeof headers === "object"
      ? Object.entries(headers).find(([name]) => name.toLowerCase() === "retry-after")?.[1]
      : undefined;
  if (typeof rawValue !== "string" || !rawValue) return null;
  const seconds = Number(rawValue);
  const delay = Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : Date.parse(rawValue) - Date.now();
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
  const gatewayHttpStatus = isGatewayError ? httpStatus(root?.statusCode) ?? httpStatus(root?.gatewayHttpStatus) : null;
  const providerHttpStatus = httpStatus(root?.providerHttpStatus) ?? httpStatus(upstreamCall?.statusCode) ?? httpStatus(nestedProviderCall?.statusCode);
  const gatewayCode = safeCode(root?.type) ?? safeCode(root?.gatewayCode);
  const rawGenerationId = root?.generationId ?? root?.gatewayGenerationId;
  const gatewayGenerationId = typeof rawGenerationId === "string" && safeGenerationIdPattern.test(rawGenerationId) ? rawGenerationId : null;
  const providerDispatchPossible = typeof root?.providerDispatchPossible === "boolean"
    ? root.providerDispatchPossible
    : root?.safeNoCharge === true
      ? false
      : isGatewayError && gatewayHttpStatus === 402 && gatewayCode === "quota_for_entity_exceeded" && providerHttpStatus === null
        ? false
        : true;

  return {
    gatewayHttpStatus,
    gatewayCode,
    gatewayGenerationId,
    providerHttpStatus,
    providerCode: safeCode(root?.providerCode) ?? providerCode(upstreamCall) ?? providerCode(nestedProviderCall),
    retryAfterMs: typeof root?.retryAfterMs === "number" && Number.isSafeInteger(root.retryAfterMs) && root.retryAfterMs >= 0
      ? root.retryAfterMs
      : (isGatewayError ? retryAfterMs(root) : null) ?? retryAfterMs(causeHasStatus ? cause : upstreamCall),
    retryable: root?.isRetryable === true || gatewayHttpStatus === 429 || providerHttpStatus === 429 || providerHttpStatus === 503,
    providerDispatchPossible,
  };
}

export function hasProviderResponseEvidence(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth += 1) {
    const item = record(current);
    if (!item) return false;
    if (isProviderCallError(current) && (httpStatus(item.statusCode) !== null || typeof item.responseBody === "string"
      || item.data !== undefined || item.responseHeaders !== undefined)) return true;
    if (httpStatus(item.providerHttpStatus) !== null || typeof item.providerCode === "string") return true;
    if (!item.cause || item.cause === current) return false;
    current = item.cause;
  }
  return false;
}

export function hasConfirmedNoChargeGatewayRejection(error: unknown): boolean {
  const details = classifyGatewayFailure(error);
  if (details.providerDispatchPossible || details.providerHttpStatus !== null || hasProviderResponseEvidence(error)) return false;
  if (details.gatewayHttpStatus === 429) return record(error)?.providerDispatchPossible === false;
  return details.gatewayHttpStatus === 402 && details.gatewayCode === "quota_for_entity_exceeded";
}
