export interface AppConfig {
  port: number;
  databasePath: string;
  authEnabled: boolean;
  betterAuthSecretConfigured: boolean;
  betterAuthUrl: string;
  publicAppUrl: string;
  githubTokenConfigured: boolean;
  aiGatewayKeyConfigured: boolean;
  aiGatewayModel?: string;
  aiGatewayProviderOnly?: string;
  aiGatewayMaxInputUsdPerMillion?: number;
  aiGatewayMaxOutputUsdPerMillion?: number;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const portText = env.API_PORT ?? "3000";
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("API_PORT debe ser un puerto válido.");

  const authEnabled = env.AUTH_ENABLED === undefined ? Boolean(env.BETTER_AUTH_SECRET) : env.AUTH_ENABLED === "true";
  if (env.AUTH_ENABLED !== undefined && env.AUTH_ENABLED !== "true" && env.AUTH_ENABLED !== "false") {
    throw new Error("AUTH_ENABLED debe ser true o false.");
  }
  if (authEnabled && !env.BETTER_AUTH_SECRET) throw new Error("BETTER_AUTH_SECRET es obligatorio para habilitar auth.");
  if (env.BETTER_AUTH_SECRET && env.BETTER_AUTH_SECRET.length < 32) throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres.");

  const betterAuthUrl = parseHttpUrl(env.BETTER_AUTH_URL ?? `http://localhost:${port}`, "BETTER_AUTH_URL");
  const publicAppUrl = parseHttpUrl(env.PUBLIC_APP_URL ?? "http://localhost:5173", "PUBLIC_APP_URL");

  const databaseUrl = env.DATABASE_URL ?? "file:./data/fragments.sqlite";
  if (!databaseUrl.startsWith("file:") || databaseUrl.length <= "file:".length || databaseUrl.includes("?")) {
    throw new Error("DATABASE_URL debe ser una ruta SQLite con prefijo file:.");
  }

  const inputRate = parsePositiveRate(env.AI_GATEWAY_MAX_INPUT_USD_PER_MILLION, "AI_GATEWAY_MAX_INPUT_USD_PER_MILLION");
  const outputRate = parsePositiveRate(env.AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION, "AI_GATEWAY_MAX_OUTPUT_USD_PER_MILLION");
  const model = env.AI_GATEWAY_MODEL?.trim();
  if (model && model.length > 200) throw new Error("AI_GATEWAY_MODEL supera el tamaño permitido.");
  const providerOnly = env.AI_GATEWAY_PROVIDER_ONLY?.trim();
  if (providerOnly && !/^[a-z0-9][a-z0-9-]{0,63}$/.test(providerOnly)) throw new Error("AI_GATEWAY_PROVIDER_ONLY debe identificar un proveedor válido.");
  if ((inputRate !== undefined || outputRate !== undefined) && (inputRate === undefined || outputRate === undefined || !providerOnly || !model)) {
    throw new Error("Los máximos de precio requieren modelo y AI_GATEWAY_PROVIDER_ONLY para fijar la tarifa presupuestada.");
  }

  return {
    port,
    databasePath: databaseUrl.slice("file:".length),
    authEnabled,
    betterAuthSecretConfigured: Boolean(env.BETTER_AUTH_SECRET),
    betterAuthUrl,
    publicAppUrl,
    githubTokenConfigured: Boolean(env.GITHUB_TOKEN?.trim()),
    aiGatewayKeyConfigured: Boolean(env.AI_GATEWAY_API_KEY?.trim()),
    ...(model ? { aiGatewayModel: model } : {}),
    ...(providerOnly ? { aiGatewayProviderOnly: providerOnly } : {}),
    ...(inputRate !== undefined ? { aiGatewayMaxInputUsdPerMillion: inputRate } : {}),
    ...(outputRate !== undefined ? { aiGatewayMaxOutputUsdPerMillion: outputRate } : {}),
  };
}

function parseHttpUrl(value: string, name: string): string {
  let parsed: URL;
  try { parsed = new URL(value); } catch { throw new Error(`${name} debe ser una URL HTTP o HTTPS válida.`); }
  if (!["http:", "https:"].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error(`${name} debe ser una URL HTTP o HTTPS válida.`);
  return parsed.origin;
}

function parsePositiveRate(value: string | undefined, name: string): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1_000_000) throw new Error(`${name} debe ser un máximo de precio positivo por millón de tokens.`);
  return parsed;
}
