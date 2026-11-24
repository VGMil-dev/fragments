import { randomUUID } from "node:crypto";
import type { IncomingMessage } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "../db/open.js";
import type { PrismaClient } from "../generated/prisma/client.js";
import { createFragmentsAuth, createFragmentsAuthService } from "./better-auth.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para ejecutar Better Auth con Prisma.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = `f21-auth-${randomUUID().replaceAll("-", "")}`;
let database: PrismaClient;

describePostgres("Better Auth PostgreSQL integration", () => {
  beforeAll(async () => {
    database = openDatabase(databaseUrl!);
    await database.$connect();
  });
  afterAll(async () => {
    if (database) {
      await database.user.deleteMany({ where: { email: { startsWith: `${namespace}-` } } });
      await database.$disconnect();
    }
  });

  it("persists accounts and resolves a teacher session through Prisma", async () => {
    const auth = createFragmentsAuth(database, { secret: "test-only-better-auth-secret-0123456789", allowSignUp: true });
    const service = createFragmentsAuthService(auth, database);
    const email = `${namespace}-teacher@example.test`;
    const signup = await auth.api.signUpEmail({ body: { name: "Fixture Docente", email, password: "fixture-password-2026" } });
    await database.user.update({ where: { id: signup.user.id }, data: { isTeacher: true } });

    const signedIn = await auth.api.signInEmail({ returnHeaders: true, body: { email, password: "fixture-password-2026" } });
    const cookie = signedIn.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
    const request = { headers: { cookie } } as IncomingMessage;

    expect(await database.user.findUnique({ where: { id: signup.user.id }, select: { email: true, isTeacher: true } }))
      .toEqual({ email, isTeacher: true });
    expect(await service.teacherId(request)).toBe(signup.user.id);
  });

  it("requests an existing teacher password reset through the configured sender and reset route", async () => {
    const messages: Array<{ email: string; url: string }> = [];
    const auth = createFragmentsAuth(database, {
      secret: "test-only-better-auth-secret-0123456789",
      publicAppURL: "https://fragments.example.test",
      allowSignUp: true,
      passwordResetEmailSender: async (message) => {
        messages.push(message);
        return { providerAccepted: true, providerMessageId: "fake-resend-id" };
      },
    });
    const email = `${namespace}-reset@example.test`;
    await auth.api.signUpEmail({ body: { name: "Fixture Reset", email, password: "fixture-password-2026" } });

    await auth.api.requestPasswordReset({ body: { email, redirectTo: "https://fragments.example.test/teacher/reset-password" } });

    expect(messages).toHaveLength(1);
    expect(messages[0]?.email).toBe(email);
    const resetUrl = new URL(messages[0]!.url);
    expect(resetUrl.pathname).toBe("/teacher/reset-password");
    expect(resetUrl.hash).toMatch(/^#token=[^&]+$/);
  });
});
