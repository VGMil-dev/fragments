import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createServer, type Server } from "node:http";
import { openDatabase } from "../../db/open.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createTechnologyCatalogHttp } from "./technology-catalog-http.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para probar el catálogo Mentor.");
if (databaseUrl && decodeURIComponent(new URL(databaseUrl).pathname.replace(/^\//, "")) !== "fragments_test") throw new Error("La integración UX-08 solo puede ejecutarse contra fragments_test.");
const describePostgres = databaseUrl ? describe : describe.skip;
const servers: Server[] = [];
const databases: PrismaClient[] = [];
const fixture = randomUUID();

afterEach(async () => {
  for (const server of servers.splice(0)) {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  for (const database of databases.splice(0)) {
    await database.classroomTechnologyAvailability.deleteMany({ where: { classroom: { teacherId: { startsWith: `ux08-${fixture}` } } } });
    await database.classEnrollment.deleteMany({ where: { classroom: { teacherId: { startsWith: `ux08-${fixture}` } } } });
    await database.classroom.deleteMany({ where: { teacherId: { startsWith: `ux08-${fixture}` } } });
    await database.technologyCatalogItem.deleteMany({ where: { id: { startsWith: `ux08-${fixture}` } } });
    await database.account.deleteMany({ where: { userId: { startsWith: `ux08-${fixture}` } } });
    await database.user.deleteMany({ where: { id: { startsWith: `ux08-${fixture}` } } });
    await database.$disconnect();
  }
});

describePostgres("Mentor technology catalog PostgreSQL integration", () => {
  it("returns only suggestions from active student enrollments in active classrooms", async () => {
    const database = openDatabase(databaseUrl!); databases.push(database); await database.$connect();
    const teacherId = `ux08-${fixture}-teacher`;
    const studentId = `ux08-${fixture}-student`;
    const otherStudentId = `ux08-${fixture}-other`;
    for (const [id, isTeacher] of [[teacherId, true], [studentId, false], [otherStudentId, false]] as const) {
      await database.user.create({ data: { id, name: id, email: `${id}@fixture.test`, emailVerified: true, isTeacher } });
    }
    await database.account.create({ data: { id: `account-${fixture}`, providerId: "github", accountId: `github-${fixture}`, userId: studentId } });
    const classroomIds = ["active", "pending", "removed", "rejected", "other-student", "inactive-class"].map((kind) => `ux08-${fixture}-${kind}`);
    for (const [index, classroomId] of classroomIds.entries()) await database.classroom.create({ data: {
      id: classroomId, teacherId, title: classroomId, subject: "Prueba", groupLabel: classroomId, identityKey: classroomId,
      status: index === 5 ? "archived" : "active", createdAt: new Date(), updatedAt: new Date(),
    } });
    const techIds = ["active", "pending", "removed", "rejected", "other-student", "inactive-class"].map((kind) => `ux08-${fixture}-tech-${kind}`);
    for (const [index, id] of techIds.entries()) {
      const kind = ["active", "pending", "removed", "rejected", "other-student", "inactive-class"][index]!;
      await database.technologyCatalogItem.create({ data: { id, slug: `${fixture}-${kind}`, name: `Technology ${kind}` } });
      await database.classroomTechnologyAvailability.create({ data: { classroomId: classroomIds[index]!, technologyId: id, enabled: true, updatedAt: new Date() } });
    }
    const statuses = ["active", "pending", "removed", "rejected", "active", "active"] as const;
    for (let index = 0; index < classroomIds.length; index += 1) await database.classEnrollment.create({ data: {
      id: `enrollment-${fixture}-${index}`, classroomId: classroomIds[index]!, studentId: index === 4 ? otherStudentId : studentId,
      status: statuses[index]!, source: "teacher_assignment", requestedAt: new Date(),
    } });
    const secondActiveClassId = `ux08-${fixture}-active-second`;
    await database.classroom.create({ data: {
      id: secondActiveClassId, teacherId, title: secondActiveClassId, subject: "Prueba", groupLabel: secondActiveClassId,
      identityKey: secondActiveClassId, status: "active", createdAt: new Date(), updatedAt: new Date(),
    } });
    await database.classEnrollment.create({ data: {
      id: `enrollment-${fixture}-active-second`, classroomId: secondActiveClassId, studentId, status: "active",
      source: "teacher_assignment", requestedAt: new Date(),
    } });
    await database.classroomTechnologyAvailability.create({ data: {
      classroomId: secondActiveClassId, technologyId: techIds[0]!, enabled: true, updatedAt: new Date(),
    } });

    const auth = { async student(request: { headers: Record<string, string | string[] | undefined> }) {
      const id = request.headers["x-fixture-user"];
      return id === studentId ? { id: studentId } : null;
    } } as unknown as FragmentsAuthService;
    const server = createServer((request, response) => { void createTechnologyCatalogHttp(database, auth)(request, response); }); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected a local test server");
    const base = `http://127.0.0.1:${address.port}`;
    const anonymous = await fetch(`${base}/api/mentor/suggested-technologies`);
    expect(anonymous.status).toBe(401);
    const response = await fetch(`${base}/api/mentor/suggested-technologies?classroomId=${classroomIds[1]}`, { headers: { "x-fixture-user": studentId } });
    expect(response.status).toBe(200);
    const result = await response.json() as { data: { items: Array<{ id: string }> } };
    expect(result.data.items.map((item) => item.id)).toEqual([techIds[0]]);
  });
});
