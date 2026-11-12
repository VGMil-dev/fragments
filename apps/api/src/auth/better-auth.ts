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
  githubClientId?: string;
  githubClientSecret?: string;
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
  const githubClientId = options.githubClientId ?? process.env.GITHUB_CLIENT_ID;
  const githubClientSecret = options.githubClientSecret ?? process.env.GITHUB_CLIENT_SECRET;
  if (Boolean(githubClientId) !== Boolean(githubClientSecret)) {
    throw new Error("GITHUB_CLIENT_ID y GITHUB_CLIENT_SECRET deben configurarse juntos.");
  }
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
        githubLogin: { type: "string", required: false, input: false },
      },
    },
    ...(githubClientId && githubClientSecret ? {
      socialProviders: {
        github: {
          clientId: githubClientId,
          clientSecret: githubClientSecret,
          scope: ["read:user", "user:email"],
          mapProfileToUser: (profile) => ({ githubLogin: profile.login }),
        },
      },
    } : {}),
    account: { accountLinking: { disableImplicitLinking: true } },
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
    async userId(request: IncomingMessage): Promise<string | null> {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      const id = (session?.user as { id?: unknown } | undefined)?.id;
      return typeof id === "string" ? id : null;
    },
    async student(request: IncomingMessage): Promise<{ id: string; githubAccountId: string; githubLogin: string | null; avatarUrl: string | null; registeredAt: string } | null> {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
      const user = session?.user as { id?: unknown; role?: unknown; isTeacher?: unknown; githubLogin?: unknown; image?: unknown; createdAt?: unknown } | undefined;
      if (!user || typeof user.id !== "string" || user.isTeacher === true || (typeof user.role === "string" && user.role.split(",").includes("admin"))) return null;
      const account = auth.options.database.prepare("SELECT accountId FROM account WHERE userId = ? AND providerId = 'github' LIMIT 1").get(user.id) as { accountId: string } | undefined;
      if (!account) return null;
      return {
        id: user.id,
        githubAccountId: account.accountId,
        githubLogin: typeof user.githubLogin === "string" ? user.githubLogin : null,
        avatarUrl: typeof user.image === "string" ? user.image : null,
        registeredAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : typeof user.createdAt === "string" ? user.createdAt : new Date(0).toISOString(),
      };
    },
    get githubOAuthConfigured(): boolean { return Boolean(auth.options.socialProviders?.github); },
  };
}

export type FragmentsAuthService = ReturnType<typeof createFragmentsAuthService>;
