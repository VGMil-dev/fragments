import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminMentorEventsHttp } from "./http.js";
import type { MentorOperationalEvent } from "../mentor/operational-events.js";

const mentorEvent: MentorOperationalEvent = {
  event: "mentor_evaluation_failed", stage: "response_validation", result: "failure", error_code: "response_validation_failed",
  duration_ms: 850, occurred_at: "2026-11-22T20:00:00.000Z",
};

describe("admin Mentor events endpoint", () => {
  const servers: Server[] = [];
  afterEach(async () => {
    await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
  });

  async function request(options: {
    isAdmin?: () => Promise<boolean | null>;
    getActorId?: () => Promise<string | null>;
    write?: (event: unknown) => Promise<void>;
    list?: (limit?: number) => MentorOperationalEvent[] | Promise<MentorOperationalEvent[]>;
  } = {}, path = "/api/admin/mentor-events?limit=2") {
    const server = createServer(createAdminMentorEventsHttp(
      { list: options.list ?? (() => [mentorEvent]) },
      async () => options.isAdmin ? options.isAdmin() : true,
      {
        getActorId: async () => options.getActorId ? options.getActorId() : "admin-actor",
        write: options.write ?? (async () => undefined),
        now: () => new Date("2026-11-22T21:00:00.000Z"),
        id: () => "00000000-0000-4000-8000-000000000009",
      },
    ));
    servers.push(server);
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Expected TCP address");
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`);
    return { response, body: await response.json() as Record<string, unknown> };
  }

  it("audits before reading and returns only the bounded authorized sample", async () => {
    const calls: string[] = [];
    const write = vi.fn(async (entry: unknown) => { calls.push("audit"); expect(entry).toMatchObject({ event: "admin.mentor_events.read", adminActorId: "admin-actor" }); });
    const list = vi.fn((limit?: number) => { calls.push("list"); expect(limit).toBe(2); return [mentorEvent]; });
    const { response, body } = await request({ write, list });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect((body.data as { events: unknown[] }).events).toEqual([mentorEvent]);
    expect(calls).toEqual(["audit", "list"]);
  });

  it("denies anonymous and non-admin access without reading events", async () => {
    const list = vi.fn(() => [mentorEvent]);
    const anonymous = await request({ isAdmin: async () => null, list });
    const denied = await request({ isAdmin: async () => false, list });

    expect(anonymous.response.status).toBe(401);
    expect(denied.response.status).toBe(403);
    expect(list).not.toHaveBeenCalled();
  });

  it("fails closed if the admin identity or audit sink is unavailable", async () => {
    const list = vi.fn(() => [mentorEvent]);
    const missingActor = await request({ getActorId: async () => null, list });
    const rejectedAudit = await request({ write: async () => { throw new Error("private audit failure"); }, list });

    expect(missingActor.response.status).toBe(503);
    expect(rejectedAudit.response.status).toBe(503);
    expect(list).not.toHaveBeenCalled();
  });

  it("rejects invalid limits before audit and does not expose event rows", async () => {
    const write = vi.fn(async () => undefined);
    const list = vi.fn(() => [mentorEvent]);
    const invalid = await request({ write, list }, "/api/admin/mentor-events?limit=51");

    expect(invalid.response.status).toBe(400);
    expect(write).not.toHaveBeenCalled();
    expect(list).not.toHaveBeenCalled();
  });

  it("awaits a persistent store and returns a safe error when it is unavailable", async () => {
    const { response, body } = await request({ list: async () => { throw new Error("private database details"); } });
    expect(response.status).toBe(503);
    expect(body).toEqual({ ok: false, error: { code: "EVENTS_UNAVAILABLE", message: "No se pudieron consultar los eventos de Mentor." } });
  });
});
