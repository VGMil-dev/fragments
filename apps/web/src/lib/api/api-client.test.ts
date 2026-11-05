import { describe, expect, it, vi } from "vitest";
import { ApiErrorSchema } from "@fragments/contracts";
import { createApiClient } from "./api-client";

const ProfileSchema = ApiErrorSchema;

describe("createApiClient", () => {
  it("returns data only after validating the shared ApiResult contract", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { code: "PROFILE", message: "Ada" } }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
    const api = createApiClient({ fetcher });

    await expect(api.request("/api/profile", ProfileSchema)).resolves.toEqual({
      ok: true,
      data: { code: "PROFILE", message: "Ada" },
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/profile",
      expect.objectContaining({ method: "GET", headers: expect.any(Headers), signal: expect.any(AbortSignal) }),
    );
  });

  it("rejects a response that does not match the shared data schema without echoing its contents", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { code: "PROFILE", message: "Ada", token: "server-secret" } }), { status: 200 }),
    );
    const api = createApiClient({ fetcher });

    const result = await api.request("/api/profile", ProfileSchema);

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." },
    });
    expect(JSON.stringify(result)).not.toContain("server-secret");
  });

  it("returns a generic recoverable network error without exposing exception text", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error("authorization=private-token"));
    const api = createApiClient({ fetcher });

    const result = await api.request("/api/profile", ProfileSchema);

    expect(result).toEqual({
      ok: false,
      error: { code: "NETWORK_ERROR", message: "No pudimos conectar con el servicio. Inténtalo de nuevo." },
    });
    expect(JSON.stringify(result)).not.toContain("private-token");
  });

  it("sends JSON requests without adding or storing credentials", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ ok: true, data: { code: "PROFILE", message: "Ada" } }), { status: 200 }),
    );
    const api = createApiClient({ fetcher });

    await api.request("/api/profile", ProfileSchema, {
      method: "POST",
      body: JSON.stringify({ proposal: "Una idea" }),
      headers: { "content-type": "application/json", authorization: "Bearer test-only-secret" },
    });

    const init = fetcher.mock.calls[0]?.[1];
    expect(init?.credentials).toBe("same-origin");
    expect(new Headers(init?.headers).get("authorization")).toBeNull();
    expect(init?.body).toBe(JSON.stringify({ proposal: "Una idea" }));
  });

  it("returns a README as markdown text only when the server declares the expected media type", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("# Mi proyecto", { status: 200, headers: { "content-type": "text/markdown; charset=utf-8" } }),
    );
    const api = createApiClient({ fetcher });

    await expect(api.downloadText("/api/submissions/1/readme")).resolves.toEqual({
      ok: true,
      data: "# Mi proyecto",
    });
    expect(new Headers(fetcher.mock.calls[0]?.[1]?.headers).get("accept")).toBe("text/markdown");
  });

  it("returns a PDF Blob in memory without persisting it", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(new Uint8Array([37, 80, 68, 70]), { status: 200, headers: { "content-type": "application/pdf" } }),
    );
    const api = createApiClient({ fetcher });

    const result = await api.downloadPdf("/api/submissions/1/pdf");

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data).toBeInstanceOf(Blob);
      expect(await result.data.arrayBuffer()).toEqual(new Uint8Array([37, 80, 68, 70]).buffer);
    }
  });

  it("rejects unexpected download media types without returning the body", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response("internal token=private", { status: 200, headers: { "content-type": "text/plain" } }),
    );
    const api = createApiClient({ fetcher });

    const result = await api.downloadText("/api/submissions/1/readme");

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_RESPONSE", message: "La respuesta no tiene el formato esperado." },
    });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("times out without exposing the fetch exception", async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn<typeof fetch>((_input, init) => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new Error("private timeout detail")));
    }));
    const api = createApiClient({ fetcher, timeoutMs: 10 });
    const pending = api.request("/api/profile", ProfileSchema);

    await vi.advanceTimersByTimeAsync(10);
    const result = await pending;
    vi.useRealTimers();

    expect(result).toEqual({
      ok: false,
      error: { code: "REQUEST_TIMEOUT", message: "La solicitud tardó demasiado. Puedes intentarlo de nuevo." },
    });
    expect(JSON.stringify(result)).not.toContain("private");
  });

  it("rejects absolute targets so callers cannot route outside the configured API base", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createApiClient({ fetcher });

    const result = await api.request("https://example.test/private", ProfileSchema);

    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_PATH", message: "No se pudo preparar la solicitud." },
    });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rejects path traversal and backslash targets", async () => {
    const fetcher = vi.fn<typeof fetch>();
    const api = createApiClient({ fetcher });

    await api.request("/api/../private", ProfileSchema);
    await api.request("\\\\example.test\\private", ProfileSchema);

    expect(fetcher).not.toHaveBeenCalled();
  });
});
