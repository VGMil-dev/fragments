import { createServer } from "node:http";
import { describe, expect, it } from "vitest";
import type { FragmentsAuthService } from "../../auth/better-auth.js";
import { createAssignmentHttp } from "./http.js";

async function request(handler: ReturnType<typeof createAssignmentHttp>, path: string, role: "teacher" | "student" | "anonymous", method = "GET", body?: unknown) {
  const server = createServer(async (req, res) => { if (await handler(req, res) === "unhandled") res.writeHead(404).end(); });
  await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
  const address = server.address(); if (!address || typeof address === "string") throw new Error("Expected local test server");
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, { method, headers: { "x-fixture-role": role, ...(body === undefined ? {} : { "content-type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, body: await response.json() as { error?: { code: string } } };
  } finally { server.closeAllConnections(); await new Promise<void>((done) => server.close(() => done())); }
}

describe("assignment HTTP boundary", () => {
  const database = {} as never;
  const auth = {
    async teacherId(req: { headers: Record<string, string | undefined> }) { return req.headers["x-fixture-role"] === "teacher" ? "fixture-teacher" : null; },
    async student(req: { headers: Record<string, string | undefined> }) { return req.headers["x-fixture-role"] === "student" ? { id: "fixture-student" } : null; },
  } as unknown as FragmentsAuthService;

  it("requires teacher auth before accessing assignment endpoints", async () => {
    const result = await request(createAssignmentHttp(database, auth), "/api/teacher/classrooms/fixture-class/assignments", "anonymous");
    expect(result).toMatchObject({ status: 401, body: { error: { code: "AUTH_REQUIRED" } } });
  });

  it("rejects a draft that assigns one skill as required and optional", async () => {
    const result = await request(createAssignmentHttp(database, auth), "/api/teacher/classrooms/fixture-class/assignments", "teacher", "POST", {
      title: "Misión fixture", instructions: "Describe el problema.", objectives: ["Identificar el problema"],
      requiredSkillIds: ["fixture-skill"], optionalSkillIds: ["fixture-skill"],
    });
    expect(result).toMatchObject({ status: 400, body: { error: { code: "INVALID_INPUT" } } });
  });
});
