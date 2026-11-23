import { afterEach, describe, expect, it, vi } from "vitest";
import { createTrainerApi } from "./trainer-api.js";

describe("Trainer API academic context", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("accepts the bounded mission and skills summary", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, data: [{ id: "review-1", owner: "student", repo: "demo",
      commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00.000Z", academicContext: { missionTitle: "Programación Móvil", missionVersion: 2,
        mentorContextVersion: 3, classroomTitle: "Terceros", requiredSkills: ["Navegación"] } }] }), { status: 200, headers: { "content-type": "application/json" } })));
    await expect(createTrainerApi().reviews()).resolves.toMatchObject({ ok: true, data: [{ academicContext: { missionTitle: "Programación Móvil", requiredSkills: ["Navegación"] } }] });
  });

  it("rejects an unbounded or blank skill name rather than rendering malformed context", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ok: true, data: [{ id: "review-1", owner: "student", repo: "demo",
      commitSha: "a".repeat(40), updatedAt: "2026-11-01T00:00:00.000Z", academicContext: { missionTitle: "Programación Móvil", missionVersion: 2,
        mentorContextVersion: 3, classroomTitle: "Terceros", requiredSkills: [" ", "x".repeat(101)] } }] }), { status: 200, headers: { "content-type": "application/json" } })));
    await expect(createTrainerApi().reviews()).resolves.toMatchObject({ ok: false, error: { code: "TRAINER_UNAVAILABLE" } });
  });
});
