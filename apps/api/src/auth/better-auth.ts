import { getMigrations } from "better-auth/db/migration";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import { betterAuth } from "better-auth";
import { admin } from "better-auth/plugins";
import { createResendPasswordResetEmailSender, type PasswordResetEmailSender } from "./resend-password-reset.js";
import type { DatabaseSync } from "node:sqlite";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface FragmentsAuthOptions {
  secret: string;
  baseURL?: string;
  publicAppURL?: string;
  allowSignUp?: boolean;
  validateSchema?: boolean;
  passwordResetEmailSender?: PasswordResetEmailSender;
}

export function createFragmentsAuth(database: DatabaseSync, options: FragmentsAuthOptions) {
  if (options.secret.length < 32) throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres.");
  const baseURL = options.baseURL ?? "http://localhost:3000";
  const trustedOrigins = [...new Set([baseURL, options.publicAppURL]
    .filter((value): value is string => Boolean(value))
    .map((value) => {
      const url = new URL(value);
      if ((url.protocol !== "http:" && url.protocol !== "https:") || url.username || url.password) {
        throw new Error("Las URL de Better Auth deben usar HTTP(S) y no incluir credenciales.");
      }
      return url.origin;
    }))];
  const passwordResetEmailSender = options.passwordResetEmailSender ?? createResendPasswordResetEmailSender();
  return betterAuth({
    database,
    secret: options.secret,
    baseURL,
    trustedOrigins,
    advanced: { database: { validateSchema: options.validateSchema ?? true } },
    rateLimit: {
      enabled: true,
      customRules: {
        "/request-password-reset": { window: 60, max: 3 },
        "/reset-password": { window: 60, max: 5 },
      },
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: !options.allowSignUp,
      minPasswordLength: 12,
      maxPasswordLength: 1024,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, token }) => {
        const resetUrl = new URL("/teacher/reset-password", options.publicAppURL ?? "http://localhost:5173");
        resetUrl.hash = new URLSearchParams({ token }).toString();
        try {
          await passwordResetEmailSender({ email: user.email, url: resetUrl.toString() });
        } catch {
          process.stderr.write("No se pudo enviar el correo de recuperación.\n");
        }
      },
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

export async function createMigratedFragmentsAuth(database: DatabaseSync, options: FragmentsAuthOptions): Promise<FragmentsAuthInstance> {
  const migrationAuth = createFragmentsAuth(database, { ...options, validateSchema: false });
  await migrateFragmentsAuth(migrationAuth);
  const schema = await getMigrations(migrationAuth.options);
  if (schema.toBeCreated.length > 0 || schema.toBeAdded.length > 0) {
    throw new Error("La migración de Better Auth no dejó el esquema listo para iniciar el servicio.");
  }
  return createFragmentsAuth(database, { ...options, validateSchema: false });
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
