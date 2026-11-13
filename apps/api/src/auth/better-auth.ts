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

export type TeacherAccountStatus = {
  credentialConnected: boolean;
  githubConnected: boolean;
};

export type TeacherGitHubLinkResult =
  | { kind: "unauthenticated" }
  | { kind: "forbidden" }
  | { kind: "rate_limited" }
  | { kind: "invalid_password" }
  | { kind: "already_linked" }
  | { kind: "unavailable" }
  | { kind: "started"; authorizationUrl: string; setCookies: string[] };

type StudentIdentity = { id: string; githubAccountId: string; githubLogin: string | null; avatarUrl: string | null; registeredAt: string };
type StudentAccessResult = { kind: "student"; student: StudentIdentity }
  | { kind: "session_required" | "role_not_student" | "github_account_not_linked" | "invalid_github_identity" };

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
    disabledPaths: ["/link-social"],
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
  const passwordConfirmations = new Map<string, { attempts: number; resetAt: number }>();
  async function resolveStudent(request: IncomingMessage): Promise<StudentAccessResult> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers), query: { disableCookieCache: true } });
    const user = session?.user as { id?: unknown; role?: unknown; isTeacher?: unknown; githubLogin?: unknown; image?: unknown; createdAt?: unknown } | undefined;
    if (!user || typeof user.id !== "string") return { kind: "session_required" };
    if (user.isTeacher === true || (typeof user.role === "string" && user.role.split(",").includes("admin"))) return { kind: "role_not_student" };
    const account = auth.options.database.prepare("SELECT accountId FROM account WHERE userId = ? AND providerId = 'github' LIMIT 1").get(user.id) as { accountId: string } | undefined;
    if (!account) return { kind: "github_account_not_linked" };
    if (typeof account.accountId !== "string" || !account.accountId.trim()) return { kind: "invalid_github_identity" };
    return {
      kind: "student",
      student: {
        id: user.id,
        githubAccountId: account.accountId,
        githubLogin: typeof user.githubLogin === "string" ? user.githubLogin : null,
        avatarUrl: typeof user.image === "string" ? user.image : null,
        registeredAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : typeof user.createdAt === "string" ? user.createdAt : new Date(0).toISOString(),
      },
    };
  }
  return {
    handle(request: IncomingMessage, response: ServerResponse): void {
      void handle(request, response);
    },
    async teacherId(request: IncomingMessage): Promise<string | null> {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers), query: { disableCookieCache: true } });
      const user = session?.user as { id?: unknown; role?: unknown; isTeacher?: unknown } | undefined;
      if (!user || typeof user.id !== "string") return null;
      const roles = typeof user.role === "string" ? user.role.split(",") : [];
      return user.isTeacher === true || roles.includes("admin") ? user.id : null;
    },
    async userId(request: IncomingMessage): Promise<string | null> {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(request.headers), query: { disableCookieCache: true } });
      const id = (session?.user as { id?: unknown } | undefined)?.id;
      return typeof id === "string" ? id : null;
    },
    isTrustedOrigin(origin: string): boolean {
      const origins = auth.options.trustedOrigins;
      return Array.isArray(origins) && origins.includes(origin);
    },
    async teacherAccount(request: IncomingMessage): Promise<{ kind: "unauthenticated" } | { kind: "forbidden" } | { kind: "ok"; status: TeacherAccountStatus }> {
      const headers = fromNodeHeaders(request.headers);
      const current = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
      if (!current?.user) return { kind: "unauthenticated" };
      const roles = typeof current.user.role === "string" ? current.user.role.split(",") : [];
      if (current.user.isTeacher !== true && !roles.includes("admin")) return { kind: "forbidden" };
      const accounts = auth.options.database.prepare("SELECT providerId FROM account WHERE userId = ?").all(current.user.id) as Array<{ providerId: string }>;
      return {
        kind: "ok",
        status: {
          credentialConnected: accounts.some((account) => account.providerId === "credential"),
          githubConnected: accounts.some((account) => account.providerId === "github"),
        },
      };
    },
    async beginTeacherGitHubLink(request: IncomingMessage, password: string): Promise<TeacherGitHubLinkResult> {
      const headers = fromNodeHeaders(request.headers);
      const current = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
      if (!current?.user) return { kind: "unauthenticated" };
      const roles = typeof current.user.role === "string" ? current.user.role.split(",") : [];
      if (current.user.isTeacher !== true && !roles.includes("admin")) return { kind: "forbidden" };

      const now = Date.now();
      for (const [userId, state] of passwordConfirmations) if (state.resetAt <= now) passwordConfirmations.delete(userId);
      const attempt = passwordConfirmations.get(current.user.id);
      if (attempt && attempt.attempts >= 5) return { kind: "rate_limited" };
      passwordConfirmations.set(current.user.id, attempt
        ? { attempts: attempt.attempts + 1, resetAt: attempt.resetAt }
        : { attempts: 1, resetAt: now + 10 * 60_000 });

      try {
        await auth.api.verifyPassword({ body: { password }, headers });
      } catch {
        return { kind: "invalid_password" };
      }

      const confirmed = await auth.api.getSession({ headers, query: { disableCookieCache: true } });
      if (!confirmed?.user || confirmed.user.id !== current.user.id) return { kind: "unauthenticated" };
      const confirmedRoles = typeof confirmed.user.role === "string" ? confirmed.user.role.split(",") : [];
      if (confirmed.user.isTeacher !== true && !confirmedRoles.includes("admin")) return { kind: "forbidden" };
      const github = auth.options.database.prepare("SELECT 1 FROM account WHERE userId = ? AND providerId = 'github' LIMIT 1").get(current.user.id);
      if (github) return { kind: "already_linked" };

      passwordConfirmations.delete(current.user.id);
      try {
        const result = await auth.api.linkSocialAccount({
          body: {
            provider: "github",
            callbackURL: "/teacher/mentor-control?githubLink=success",
            errorCallbackURL: "/teacher/mentor-control?githubLink=error",
            disableRedirect: true,
          },
          headers,
          returnHeaders: true,
        });
        const target = new URL(result.response?.url ?? "");
        if (target.origin !== "https://github.com" || target.pathname !== "/login/oauth/authorize") return { kind: "unavailable" };
        return { kind: "started", authorizationUrl: target.toString(), setCookies: result.headers.getSetCookie() };
      } catch {
        return { kind: "unavailable" };
      }
    },
    async student(request: IncomingMessage): Promise<{ id: string; githubAccountId: string; githubLogin: string | null; avatarUrl: string | null; registeredAt: string } | null> {
      const result = await resolveStudent(request);
      return result.kind === "student" ? result.student : null;
    },
    studentAccess(request: IncomingMessage): Promise<StudentAccessResult> { return resolveStudent(request); },
    get githubOAuthConfigured(): boolean { return Boolean(auth.options.socialProviders?.github); },
  };
}

export type FragmentsAuthService = ReturnType<typeof createFragmentsAuthService>;
