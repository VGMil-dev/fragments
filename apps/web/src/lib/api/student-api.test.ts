import { describe, expect, it, vi } from "vitest";
import { createApiClient } from "./api-client";
import { createStudentApi } from "./student-api";

describe("createStudentApi", () => {
  it("loads the gallery through the shared response schema", async () => {
    const entries = [{ id: "garden-notes", title: "Diario", summary: "Una bitácora.", skills: ["HTML"], tags: ["Jardín"] }];
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: entries }), { status: 200 }),
    );
    const api = createStudentApi(createApiClient({ fetcher }));

    await expect(api.getGallery()).resolves.toEqual({ ok: true, data: entries });
    expect(fetcher).toHaveBeenCalledWith("/api/gallery", expect.any(Object));
  });

  it("rejects an invalid proposal before sending it", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createStudentApi(createApiClient({ fetcher }));

    const result = await api.saveProposal({ title: "", problem: "", solution: "", goals: [], skills: [], scope: "", constraints: [] });

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
