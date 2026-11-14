import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client";
import { createStudentApi } from "./student-api";

describe("createStudentApi", () => {
  it("loads the gallery through the shared response schema", async () => {
    const page = { items: [], nextOffset: null };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: page }), { status: 200 }),
    );
    const api = createStudentApi(createApiClient({ fetcher }));

    await expect(api.getGallery()).resolves.toEqual({ ok: true, data: page });
    expect(fetcher).toHaveBeenCalledWith("/api/gallery?offset=0&limit=20", expect.any(Object));
  });

  it("loads only the authenticated student's saved proposals", async () => {
    const saved = [{
      id: "proposal-1",
      version: 2,
      proposal: { title: "Idea propia", problem: "Problema", solution: "Solución", goals: ["Meta"], skills: ["HTML"], tags: [], scope: "Alcance", constraints: [] },
      updatedAt: "2026-11-13T12:00:00.000Z",
    }];
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: saved }), { status: 200 }));
    const api = createStudentApi(createApiClient({ fetcher }));

    await expect(api.getMyProposals()).resolves.toEqual({ ok: true, data: saved });
    expect(fetcher).toHaveBeenCalledWith("/api/me/proposals", expect.any(Object));
  });

  it("updates an owned proposal with its expected version", async () => {
    const saved = {
      id: "proposal-1", version: 2,
      proposal: { title: "Idea editada", problem: "Problema", solution: "Solución", goals: ["Meta"], skills: ["HTML"], tags: [], scope: "Alcance", constraints: [] },
      updatedAt: "2026-11-13T12:00:00.000Z",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({ ok: true, data: saved }), { status: 200 }));
    const api = createStudentApi(createApiClient({ fetcher }));

    await expect(api.updateProposal("proposal-1", { ...saved.proposal, expectedVersion: 1 })).resolves.toEqual({ ok: true, data: saved });
    expect(fetcher).toHaveBeenCalledWith("/api/proposals/proposal-1", expect.objectContaining({ method: "PUT" }));
  });

  it("recovers a persisted Mentor evaluation with a read-only request", async () => {
    const evaluation = {
      evaluationId: "evaluation-1",
      proposalId: "proposal-1",
      proposalVersion: 1,
      viability: "needs_revision",
      analysis: {
        rubricVersion: "mentor-gateway-v1",
        score: 72,
        findings: [{
          criterionId: "scope",
          status: "not_verified",
          evidence: [{ source: "proposal", field: "scope", digest: "a".repeat(64) }],
          reason: "El alcance necesita un límite más concreto.",
          guidanceLevel: 1,
        }],
        limitations: [],
        modelId: "alibaba/qwen3.7-flash",
        inputDigest: "b".repeat(64),
      },
      guidance: ["Prueba primero con dos entradas."],
      similarityMatches: [],
      evaluatedAt: "2026-11-06T05:15:53.547Z",
    } as const;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: evaluation }), { status: 200 }),
    );
    const api = createStudentApi(createApiClient({ fetcher }));

    await expect(api.recoverProposalEvaluation("proposal-1")).resolves.toEqual({ ok: true, data: evaluation });
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/proposals/proposal-1/review");
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("GET");
  });

  it("rejects an invalid proposal before sending it", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createStudentApi(createApiClient({ fetcher }));

    const result = await api.saveProposal({ title: "", problem: "", solution: "", goals: [], skills: [], tags: [], scope: "", constraints: [] });

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_REQUEST", message: "Revisa los campos antes de continuar." },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects a malformed commit request before sending it", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createStudentApi(createApiClient({ fetcher }));

    const result = await api.createReview({ owner: "classroom", repo: "demo", commitSha: "not-a-commit" });

    expect(result.ok).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("sends a valid Review request to the contract-approved queue route", async () => {
    const queued = {
      id: "review-1",
      owner: "classroom",
      repo: "demo",
      commitSha: "a".repeat(40),
      status: "queued",
      createdAt: "2026-11-04T12:00:00.000Z",
    };
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: queued }), { status: 202 }),
    );
    const api = createStudentApi(createApiClient({ fetcher }));

    await expect(api.createReview({ owner: "classroom", repo: "demo", commitSha: "a".repeat(40) })).resolves.toEqual({ ok: true, data: queued });
    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/reviews");
    expect(fetcher.mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("uses the returned submission id for ephemeral README and PDF paths", async () => {
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("# Entrega", { status: 200, headers: { "content-type": "text/markdown" } }))
      .mockResolvedValueOnce(new Response(new Uint8Array([37, 80, 68, 70]), { status: 200, headers: { "content-type": "application/pdf" } }));
    const api = createStudentApi(createApiClient({ fetcher }));

    await api.downloadMentorReadme("submission-1");
    await api.downloadMentorPdf("submission-1");

    expect(fetcher.mock.calls.map(([path]) => path)).toEqual([
      "/api/mentor-submissions/submission-1/readme",
      "/api/mentor-submissions/submission-1/pdf",
    ]);
  });

  it("uses the Review submission path for its PDF", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const api = createStudentApi(createApiClient({ fetcher }));

    await api.downloadReviewPdf("review-submission-1");

    expect(fetcher.mock.calls[0]?.[0]).toBe("/api/review-submissions/review-submission-1/pdf");
  });
});
