type BetterAuthLogLevel = "debug" | "info" | "warn" | "error";
type AuthDiagnosticWriter = (line: string) => void;

const safeAuthCodes = new Set([
  "state_generation_error",
  "state_not_found",
  "state_mismatch",
  "state_security_mismatch",
  "state_invalid",
]);

function findSafeAuthCode(value: unknown, depth = 0, visited = new Set<object>()): string | undefined {
  if (depth > 4 || value === null || typeof value !== "object" || visited.has(value)) return undefined;
  visited.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const code = findSafeAuthCode(item, depth + 1, visited);
      if (code) return code;
    }
    return undefined;
  }

  let code: unknown;
  let cause: unknown;
  try {
    code = Reflect.get(value, "code");
    cause = Reflect.get(value, "cause");
  } catch {
    return undefined;
  }
  if (typeof code === "string" && safeAuthCodes.has(code)) return code;
  return findSafeAuthCode(cause, depth + 1, visited);
}

/**
 * Better Auth errors can contain the complete OAuth callback state in Error.details.
 * Keep useful severity and known OAuth failure categories while dropping messages,
 * request context, nested errors, headers, and other arbitrary arguments.
 */
export function createSafeBetterAuthLogger(write: AuthDiagnosticWriter = (line) => console.error(line)) {
  return {
    level: "warn" as const,
    log(level: BetterAuthLogLevel, _message: string, ...args: unknown[]) {
      if (level !== "warn" && level !== "error") return;
      const code = findSafeAuthCode(args) ?? (level === "error" ? "AUTH_ERROR" : "AUTH_WARNING");
      write(JSON.stringify({ event: "auth.diagnostic", level, code }));
    },
  };
}
