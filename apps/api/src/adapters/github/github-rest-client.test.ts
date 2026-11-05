import { describe, expect, it, vi } from "vitest";
import { createGitHubRestRepositoryReader } from "./github-rest-client.js";

const commitSha = "a".repeat(40);
const treeSha = "b".repeat(40);
const blobSha = "c".repeat(40);
const source = "export const value = 42;\n";
const response = (body: unknown) => new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" } });

describe("GitHub REST exact commit reader", () => {
  it("uses only fixed GitHub REST endpoints and returns a digest-verified exact commit snapshot", async () => {
    const fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/repos/VGMil-dev/fragments-test-app")) return response({ private: false });
      if (url.endsWith(`/commits/${commitSha}`)) return response({ sha: commitSha, commit: { tree: { sha: treeSha } } });
      if (url.includes(`/git/trees/${treeSha}?recursive=1`)) return response({ truncated: false, tree: [
        { path: "src/index.ts", type: "blob", mode: "100644", sha: blobSha, size: Buffer.byteLength(source) },
        { path: ".env", type: "blob", mode: "100644", sha: "d".repeat(40), size: 20 },
      ] });
      return response({ sha: blobSha, content: Buffer.from(source).toString("base64"), encoding: "base64" });
    });
    const reader = createGitHubRestRepositoryReader({ fetch, token: "test-token" });
    const snapshot = await reader.readCommitSnapshot({ owner: "VGMil-dev", repo: "fragments-test-app", commitSha });

    expect(snapshot).toMatchObject({ owner: "VGMil-dev", repo: "fragments-test-app", commitSha, files: [{ path: "src/index.ts", content: source, sha: blobSha }] });
    expect(fetch).toHaveBeenCalledTimes(4);
    for (const [url, init] of fetch.mock.calls) {
      expect(String(url), String(url)).toContain("https://api.github.com/repos/VGMil-dev/fragments-test-app");
      expect(init?.method).toBe("GET");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-token");
    }
  });

  it("rejects arbitrary URL-like owner values before making a request", async () => {
    const fetch = vi.fn();
    const reader = createGitHubRestRepositoryReader({ fetch });
    await expect(reader.readCommitSnapshot({ owner: "https://example.org", repo: "demo", commitSha })).rejects.toThrow("propietario y repositorio");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects truncated trees so an incomplete repository cannot be analyzed as complete", async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => String(input).endsWith("/repos/student/demo")
      ? response({ private: false })
      : String(input).includes("/commits/")
        ? response({ sha: commitSha, commit: { tree: { sha: treeSha } } })
        : response({ truncated: true, tree: [] }));
    const reader = createGitHubRestRepositoryReader({ fetch });
    await expect(reader.readCommitSnapshot({ owner: "student", repo: "demo", commitSha })).rejects.toThrow("supera el límite de lectura admitido");
  });

  it("refuses private repositories even when an optional server token was supplied", async () => {
    const fetch = vi.fn(async () => response({ private: true }));
    const reader = createGitHubRestRepositoryReader({ fetch, token: "fake-test-token" });
    await expect(reader.readCommitSnapshot({ owner: "student", repo: "private-demo", commitSha })).rejects.toThrow("Solo se pueden revisar repositorios públicos");
    expect(fetch).toHaveBeenCalledOnce();
  });
});
