import { getMigrations } from "better-auth/db/migration";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import type { DatabaseSync } from "node:sqlite";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface FragmentsAuthOptions {
  secret: string;
  baseURL?: string;
  allowSignUp?: boolean;
}

export function createFragmentsAuth(database: DatabaseSync, options: FragmentsAuthOptions) {
  if (options.secret.length < 32) throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres.");
  const baseURL = options.baseURL ?? "http://localhost:3000";
  return betterAuth({
    database,
    secret: options.secret,
    baseURL,
    trustedOrigins: [baseURL],
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      minPasswordLength: 12,
      maxPasswordLength: 1024,
    },
    user: {
      additionalFields: {
        isTeacher: { type: "boolean", required: false, defaultValue: false, input: false },
      },
    },
    plugins: [admin()],
  });
}

export type FragmentsAuthInstance = ReturnType<typeof createFragmentsAuth>;

export async function migrateFragmentsAuth(auth: FragmentsAuthInstance): Promise<void> {
  const migration = await getMigrations(auth.options);
  await migration.runMigrations();
}

export function createFragmentsAuthService(auth: FragmentsAuthInstance) {
  const handle = toNodeHandler(auth);
  return {
    handle(request: IncomingMessage, response: ServerResponse): void {
      void handle(request, response);
    },
    async teacherId(request: IncomingMessage): Promise<string | null> {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      const user = session?.user as { id?: unknown; role?: unknown; isTeacher?: unknown } | undefined;
      if (!user || typeof user.id !== "string") return null;
      const roles = typeof user.role === "string" ? user.role.split(",") : [];
      return user.isTeacher === true || roles.includes("admin") ? user.id : null;
    },
  };
}

export type FragmentsAuthService = ReturnType<typeof createFragmentsAuthService>;
