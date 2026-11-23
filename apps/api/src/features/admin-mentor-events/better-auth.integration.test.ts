import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { openDatabase } from "../../db/open.js";
import { createFragmentsAuth, createFragmentsAuthService } from "../../auth/better-auth.js";
import { createHttpHandler } from "../../http/app.js";
import { createMentorOperationalLog } from "../mentor/operational-log.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para la integración F22.12 con Better Auth.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID().replaceAll("-", "");
const fixtureEmail = `f22-admin-${namespace}@example.test`;
const fixturePassword = `QaF22-${randomUUID()}-Only!`;
const authSecret = "f22-better-auth-integration-test-secret-only-0123456789";
let database: PrismaClient | undefined;
let fixtureAdminId: string | undefined;

describePostgres("F22.12 Better Auth session → audited Mentor events endpoint · PostgreSQL", () => {
  beforeAll(async () => {
    const configured = new URL(databaseUrl!);
    if (configured.pathname !== "/fragments_test" || !["localhost", "127.0.0.1", "::1"].includes(configured.hostname)) {
      throw new Error("La integración F22.12 solo admite una URL local dirigida a fragments_test.");
    }
    const candidate = openDatabase(databaseUrl!);
    await candidate.$connect();
    const [{ name }] = await candidate.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (name !== "fragments_test") {
      await candidate.$disconnect();
      throw new Error("La integración Better Auth F22.12 solo puede ejecutarse en fragments_test.");
    }
    database = candidate;
  });

  afterAll(async () => {
    if (!database) return;
    try {
      if (fixtureAdminId) await database.user.deleteMany({ where: { id: fixtureAdminId } });
    } finally {
      await database.$disconnect();
      database = undefined;
    }
  });

  it("uses a persisted Better Auth admin session to read a fake buffered event after audit", async () => {
    const db = database!;
    const authInstance = createFragmentsAuth(db, {
      secret: authSecret,
      baseURL: "http://localhost:3000",
      publicAppURL: "http://localhost:5173",
      allowSignUp: true,
    });
    const created = await authInstance.api.signUpEmail({ body: { name: "Admin QA F22", email: fixtureEmail, password: fixturePassword } });
    fixtureAdminId = created.user.id;
    await db.user.update({ where: { id: fixtureAdminId }, data: { role: "admin" } });

    const login = await authInstance.api.signInEmail({ returnHeaders: true, body: { email: fixtureEmail, password: fixturePassword } });
    const cookie = login.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
    expect(cookie).toContain("better-auth.session_token=");

    const mentorLog = createMentorOperationalLog();
    mentorLog.record({
      event: "mentor_evaluation_completed",
      stage: "evaluation",
      result: "success",
      error_code: "none",
      duration_ms: 47,
      occurred_at: "2026-11-23T04:00:00.000Z",
    });
    const auditLines: string[] = [];
    const auth = createFragmentsAuthService(authInstance, db);
    const server = createServer(createHttpHandler(db, {
      auth,
      mentorOperationalLog: mentorLog,
      adminAuditLogWriteLine: (line) => { auditLines.push(line); },
    }));
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected local API address");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const anonymous = await fetch(`${base}/api/admin/mentor-events?limit=5`);
      expect(anonymous.status).toBe(401);
      expect(auditLines).toHaveLength(0);

      await db.user.update({ where: { id: fixtureAdminId }, data: { role: null } });
      const nonAdminSession = await fetch(`${base}/api/admin/mentor-events?limit=5`, { headers: { cookie } });
      expect(nonAdminSession.status).toBe(403);
      expect(auditLines).toHaveLength(0);
      await db.user.update({ where: { id: fixtureAdminId }, data: { role: "admin" } });

      const response = await fetch(`${base}/api/admin/mentor-events?limit=5`, { headers: { cookie } });
      const body = await response.json() as { data: { events: Array<Record<string, unknown>> } };
      expect(response.status).toBe(200);
      expect(body.data.events).toEqual([{
        event: "mentor_evaluation_completed",
        stage: "evaluation",
        result: "success",
        error_code: "none",
        duration_ms: 47,
        occurred_at: "2026-11-23T04:00:00.000Z",
      }]);
      expect(auditLines).toHaveLength(1);
      expect(JSON.parse(auditLines[0]!)).toMatchObject({ event: "admin.mentor_events.read", adminActorId: fixtureAdminId });
      expect(JSON.stringify(body)).not.toMatch(/Admin QA F22|f22-admin-|score|prompt|provider/);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
