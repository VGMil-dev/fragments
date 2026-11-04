import { afterEach, describe, expect, it } from "vitest";
import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import { createHttpHandler } from "./app.js";
import { migrate } from "../db/migrate.js";
import { SessionAuth } from "../auth/session.js";
import { TeacherSessionService } from "../auth/session-service.js";

const servers: ReturnType<typeof createServer>[] = [];
const databases: DatabaseSync[] = [];
afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))));
  for (const db of databases.splice(0)) db.close();
});

describe("HTTP API", () => {
  it("reports SQLite readiness without exposing environment secrets", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const server = createServer(createHttpHandler(db)); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, data: { status: "ok", database: "ready" } });
  });

  it("returns a uniform non-reflecting envelope for unknown paths", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const server = createServer(createHttpHandler(db)); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/private?token=redact-me`);
    expect(response.status).toBe(404);
    const body = await response.text();
    expect(JSON.parse(body)).toEqual({ ok: false, error: { code: "NOT_FOUND", message: "No se encontró la ruta." } });
    expect(body).not.toContain("redact-me");
  });

  it("rejects malformed teacher-session input without echoing credentials", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const server = createServer(createHttpHandler(db)); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/teacher/session`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "not-an-email", password: "sensitive-value" }),
    });
    const body = await response.text();
    expect(response.status).toBe(400);
    expect(JSON.parse(body)).toEqual({ ok: false, error: { code: "INVALID_INPUT", message: "La solicitud no es válida." } });
    expect(body).not.toContain("sensitive-value");
  });

  it("creates a teacher session through the injected fake credential verifier", async () => {
    const db = new DatabaseSync(":memory:"); databases.push(db); migrate(db);
    const auth = new TeacherSessionService({
      async verify(email, password) { return email === "teacher@example.test" && password === "fake-fixture-password" ? "teacher-fixture-01" : null; },
    }, new SessionAuth("http-test-session-secret-".repeat(2)));
    const server = createServer(createHttpHandler(db, { auth })); servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}/api/teacher/session`, {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: "teacher@example.test", password: "fake-fixture-password" }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toMatch(/^fragments_session=.+; HttpOnly; Secure; SameSite=Strict; Path=\//);
    expect(await response.json()).toMatchObject({ ok: true, data: { teacherId: "teacher-fixture-01" } });
  });
});
