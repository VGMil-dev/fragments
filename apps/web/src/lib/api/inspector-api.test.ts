import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client.js";
import { createInspectorApi } from "./inspector-api.js";

const challenge = {
  id: "challenge-1", reviewId: "review-1", projectId: "project-1", commitSha: "a".repeat(40),
  challenge: {
    evaluationId: "review-1", sourceEvidence: [{ source: "repository", path: "src/math.ts", lines: [1, 1], digest: "c".repeat(64) }],
    precondition: "Hay una suma.", mutation: "Invierte la operación.", demonstration: "Prueba dos valores.", restoration: "Restaura la suma.",
    estimatedMinutes: 10, teacherHint: "Mira el operador.",
  },
  status: "pending", createdAt: "2026-11-04T12:00:00.000Z",
};

describe("createInspectorApi", () => {
  it("loads, creates, assigns and records using the private teacher contracts", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: [challenge] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: challenge }), { status: 201 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: challenge }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true, data: challenge }), { status: 200 }));
    const api = createInspectorApi(createApiClient({ fetcher }));

    await expect(api.list("review-1")).resolves.toMatchObject({ ok: true, data: [challenge] });
    await api.create("review-1");
    await api.assign("challenge-1");
    await api.record("challenge-1", { mutationObserved: true, restorationConfirmed: true, notes: "Listo." });

    expect(fetcher.mock.calls.map(([path, init]) => [path, init?.method])).toEqual([
      ["/api/inspector/review-1/challenges", "GET"],
      ["/api/inspector/review-1/challenges", "POST"],
      ["/api/inspector/challenges/challenge-1/assign", "POST"],
      ["/api/inspector/challenges/challenge-1/record", "POST"],
    ]);
    expect(JSON.parse(String(fetcher.mock.calls[3]?.[1]?.body))).toEqual({ mutationObserved: true, restorationConfirmed: true, notes: "Listo." });
  });

  it("rejects blank identifiers and invalid defense notes before sending", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createInspectorApi(createApiClient({ fetcher }));

    expect((await api.create("  ")).ok).toBe(false);
    expect((await api.record("challenge-1", { mutationObserved: true, restorationConfirmed: true, notes: "x".repeat(2001) })).ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
