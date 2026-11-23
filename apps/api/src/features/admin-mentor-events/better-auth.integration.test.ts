import { randomUUID } from "node:crypto";
import { createServer } from "node:http";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Server } from "node:http";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { openDatabase } from "../../db/open.js";
import { createFragmentsAuth, createFragmentsAuthService } from "../../auth/better-auth.js";
import { createHttpHandler } from "../../http/app.js";
import { createMentorOperationalLog } from "../mentor/operational-log.js";
import { createMentorService } from "../mentor/service.js";
import { createLocalMentorEvaluator, createMinimalPdfRenderer } from "../mentor/local-fakes.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para la integración F22.12 con Better Auth.");
const describePostgres = databaseUrl ? describe : describe.skip;
const namespace = randomUUID().replaceAll("-", "");
const fixtureAdminEmail = `f22-admin-${namespace}@example.test`;
const fixtureStudentEmail = `f22-student-${namespace}@example.test`;
const fixtureAdminPassword = `QaF22-${randomUUID()}-Only!`;
const fixtureStudentPassword = `QaF22-${randomUUID()}-Only!`;
const fixtureProposalId = `f22-proposal-${namespace}`;
const fixtureContextVersion = 2_000_000_000 + Math.floor(Math.random() * 100_000_000);
const authSecret = "f22-better-auth-integration-test-secret-only-0123456789";
let database: PrismaClient | undefined;
let fixtureAdminId: string | undefined;
let fixtureStudentId: string | undefined;
const servers: Server[] = [];

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
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
    if (!database) return;
    try {
      await database.proposal.deleteMany({ where: { id: fixtureProposalId } });
      await database.mentorControlVersion.deleteMany({ where: { version: fixtureContextVersion } });
      const fixtureUserIds = [fixtureAdminId, fixtureStudentId].filter((id): id is string => Boolean(id));
      if (fixtureUserIds.length) await database.user.deleteMany({ where: { id: { in: fixtureUserIds } } });
    } finally {
      await database.$disconnect();
      database = undefined;
    }
  });

  it("evaluates through the real Mentor handler and reads its buffered event with a Better Auth admin session", async () => {
    const db = database!;
    const authInstance = createFragmentsAuth(db, {
      secret: authSecret,
      baseURL: "http://localhost:3000",
      publicAppURL: "http://localhost:5173",
      allowSignUp: true,
      githubClientId: "fake-f22-github-client",
      githubClientSecret: "fake-f22-github-secret",
    });
    const createdAdmin = await authInstance.api.signUpEmail({ body: { name: "Admin QA F22", email: fixtureAdminEmail, password: fixtureAdminPassword } });
    fixtureAdminId = createdAdmin.user.id;
    await db.user.update({ where: { id: fixtureAdminId }, data: { role: "admin" } });
    const createdStudent = await authInstance.api.signUpEmail({ body: { name: "Estudiante QA F22", email: fixtureStudentEmail, password: fixtureStudentPassword } });
    fixtureStudentId = createdStudent.user.id;
    await db.account.create({ data: { id: `f22-github-${namespace}`, accountId: `f22-github-${namespace}`, providerId: "github", userId: fixtureStudentId } });

    const now = new Date("2026-11-23T04:00:00.000Z");
    await db.mentorControlVersion.create({ data: {
      version: fixtureContextVersion,
      configJson: {
        subject: "Proyectos estudiantiles", theme: "Idea de proyecto",
        assignment: "Describe un problema, una solución inicial y un alcance que puedas demostrar.",
        requirements: ["Propón una primera versión pequeña y comprobable."],
        expectedLevel: "Estudiante que inicia su proyecto", rubricTitle: "Propuesta inicial",
        criteria: [
          { id: "problem", title: "Problema claro", description: "Explica a quién le ocurre y qué necesita resolver.", weight: 25 },
          { id: "solution", title: "Solución relacionada", description: "La idea responde al problema descrito.", weight: 20 },
          { id: "scope", title: "Alcance de MVP", description: "La primera versión cabe en el tiempo y nivel indicados.", weight: 25 },
          { id: "goals", title: "Objetivos comprobables", description: "Se puede observar si cada objetivo se logró.", weight: 15 },
          { id: "feasibility", title: "Viabilidad inicial", description: "Las herramientas permiten empezar.", weight: 15 },
        ],
      },
      publishedAt: now,
      publishedBy: fixtureAdminId,
    } });
    await db.proposal.create({ data: {
      id: fixtureProposalId,
      version: 1,
      proposalJson: {
        title: "Propuesta sintética F22", problem: "El curso necesita registrar cambios del huerto escolar.",
        solution: "Una bitácora sencilla permite registrar riegos y observar el crecimiento de las plantas.",
        description: "Aplicación de aula para registrar observaciones de un huerto.",
        purpose: "Ayudar al curso a observar cambios en las plantas.", goals: ["Registrar un riego"], skills: [],
        mentorSkills: { classroomId: null, selectedSkillIds: [] }, technologies: [], technologyIds: [],
        expectedOutcome: "Una bitácora con registros consultables.", tags: [], scope: "Una pantalla para ingresar y revisar observaciones.", constraints: [],
      },
      updatedAt: now,
      ownerHash: null,
      ownerUserId: fixtureStudentId,
      assignmentVersionId: null,
    } });

    const adminLogin = await authInstance.api.signInEmail({ returnHeaders: true, body: { email: fixtureAdminEmail, password: fixtureAdminPassword } });
    const adminCookie = adminLogin.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
    const studentLogin = await authInstance.api.signInEmail({ returnHeaders: true, body: { email: fixtureStudentEmail, password: fixtureStudentPassword } });
    const studentCookie = studentLogin.headers.getSetCookie().map((part) => part.split(";", 1)[0]).join("; ");
    expect(adminCookie).toContain("better-auth.session_token=");
    expect(studentCookie).toContain("better-auth.session_token=");

    const mentorLog = createMentorOperationalLog();
    const calls: string[] = [];
    const operationalLog = {
      record(event: Parameters<typeof mentorLog.record>[0]) { mentorLog.record(event); },
      list(limit?: number) { calls.push("events-list"); return mentorLog.list(limit); },
    };
    const auditLines: string[] = [];
    const auth = createFragmentsAuthService(authInstance, db);
    const localEvaluator = createLocalMentorEvaluator();
    const evaluateFake = vi.fn((input: Parameters<typeof localEvaluator.evaluate>[0]) => localEvaluator.evaluate(input));
    const server = createServer(createHttpHandler(db, {
      auth,
      mentor: createMentorService({ evaluator: { evaluate: evaluateFake }, pdf: createMinimalPdfRenderer() }),
      mentorOperationalLog: operationalLog,
      adminAuditLogWriteLine: (line) => { auditLines.push(line); calls.push("audit-write"); },
    }));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected local API address");
    const base = `http://127.0.0.1:${address.port}`;

    try {
      const anonymous = await fetch(`${base}/api/admin/mentor-events?limit=5`);
      expect(anonymous.status).toBe(401);
      expect(auditLines).toHaveLength(0);

      const evaluation = await fetch(`${base}/api/proposals/${fixtureProposalId}/review`, { method: "POST", headers: { cookie: studentCookie } });
      expect(evaluation.status).toBe(200);
      expect(evaluateFake).toHaveBeenCalledOnce();
      expect(mentorLog.list(5)).toMatchObject([{ event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none" }]);

      calls.length = 0;
      const response = await fetch(`${base}/api/admin/mentor-events?limit=5`, { headers: { cookie: adminCookie } });
      const body = await response.json() as { data: { events: Array<Record<string, unknown>> } };
      expect(response.status).toBe(200);
      expect(body.data.events).toHaveLength(1);
      expect(body.data.events[0]).toMatchObject({ event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none" });
      expect(typeof body.data.events[0]?.duration_ms).toBe("number");
      expect(typeof body.data.events[0]?.occurred_at).toBe("string");
      expect(auditLines).toHaveLength(1);
      expect(JSON.parse(auditLines[0]!)).toMatchObject({ event: "admin.mentor_events.read", adminActorId: fixtureAdminId });
      expect(calls).toEqual(["audit-write", "events-list"]);
      expect(JSON.stringify(body)).not.toMatch(/Admin QA F22|Estudiante QA F22|f22-admin-|f22-student-|Propuesta sintética|score|prompt|provider|modelId/);
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      const index = servers.indexOf(server);
      if (index >= 0) servers.splice(index, 1);
    }
  });
});
