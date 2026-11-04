export interface AppConfig {
  port: number;
  databasePath: string;
  authEnabled: boolean;
  sessionSecret?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const portText = env.API_PORT ?? "3000";
  const port = Number(portText);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("API_PORT debe ser un puerto válido.");

  const authEnabled = env.AUTH_ENABLED === "true";
  if (env.AUTH_ENABLED !== undefined && env.AUTH_ENABLED !== "true" && env.AUTH_ENABLED !== "false") {
    throw new Error("AUTH_ENABLED debe ser true o false.");
  }
  if (authEnabled && !env.SESSION_SECRET) throw new Error("SESSION_SECRET es obligatorio para habilitar auth.");
  if (authEnabled && (env.SESSION_SECRET?.length ?? 0) < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres.");

  return {
    port,
    databasePath: env.DATABASE_PATH ?? "./data/fragments.sqlite",
    authEnabled,
    ...(authEnabled ? { sessionSecret: env.SESSION_SECRET! } : {}),
  };
}
