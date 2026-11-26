import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReviewHttp } from "./http.js";

const repository = { owner: "student", repo: "demo", visibility: "public" as const, defaultBranch: "main" };
const commit = { sha: "a".repeat(40), message: "Initial commit", author: "Student", committedAt: "2026-11-25T10:00:00.000Z" };
const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))));
});

async function serve(handler: (request: IncomingMessage, response: ServerResponse) => Promise<unknown>, action: (url: string) => Promise<void>) {
  const server = createServer((request, response) => { void handler(request, response); });
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("No se obtuvo el puerto HTTP de prueba.");
  await action(`http://127.0.0.1:${address.port}`);
}

function handlerFor(resolveStudentId: () => Promise<string | null>, catalog: { getPublicRepository: ReturnType<typeof vi.fn>; listRecentCommits: ReturnType<typeof vi.fn>; resolveCommit: ReturnType<typeof vi.fn> }) {
  return createReviewHttp({
    store: {} as never,
    service: {} as never,
    resolveContext: async () => null,
    resolveStudentId,
    repositoryCatalog: catalog,
  });
}

describe("Review GitHub repository catalog routes", () => {
  it("requires an authenticated student and returns only validated public repository data", async () => {
    const catalog = {
      getPublicRepository: vi.fn(async () => repository),
      listRecentCommits: vi.fn(async () => [commit]),
      resolveCommit: vi.fn(async () => commit),
    };
    const handler = handlerFor(async () => "student-session", catalog);

    await serve(handler, async (url) => {
      const repoResponse = await fetch(`${url}/api/github/repositories/student/demo`);
      expect(repoResponse.status).toBe(200);
      expect(await repoResponse.json()).toEqual({ ok: true, data: repository });

      const commitsResponse = await fetch(`${url}/api/github/repositories/student/demo/commits?branch=main`);
      expect(commitsResponse.status).toBe(200);
      expect(await commitsResponse.json()).toEqual({ ok: true, data: [commit] });

      const commitResponse = await fetch(`${url}/api/github/repositories/student/demo/commits/${commit.sha}`);
      expect(commitResponse.status).toBe(200);
      expect(await commitResponse.json()).toEqual({ ok: true, data: commit });
    });
    expect(catalog.getPublicRepository).toHaveBeenCalledWith("student", "demo");
    expect(catalog.listRecentCommits).toHaveBeenCalledWith("student", "demo", "main");
    expect(catalog.resolveCommit).toHaveBeenCalledWith("student", "demo", commit.sha);
  });

  it("does not contact GitHub before student authentication succeeds", async () => {
    const catalog = {
      getPublicRepository: vi.fn(),
      listRecentCommits: vi.fn(),
      resolveCommit: vi.fn(),
    };
    const handler = handlerFor(async () => null, catalog);

    await serve(handler, async (url) => {
      const response = await fetch(`${url}/api/github/repositories/student/demo`);
      expect(response.status).toBe(401);
      expect(await response.json()).toMatchObject({ ok: false, error: { code: "AUTH_REQUIRED" } });
    });
    expect(catalog.getPublicRepository).not.toHaveBeenCalled();
  });
});
