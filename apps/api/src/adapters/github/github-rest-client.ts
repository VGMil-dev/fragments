import { RepositorySnapshotSchema, type RepositorySnapshot } from "@fragments/contracts";
import { digestSnapshot } from "../../features/review/review.service.js";
import { ReviewProcessingError } from "../../features/review/review-errors.js";
import type { ExactCommitRequest } from "./github.repository-reader.js";

const githubApi = "https://api.github.com";
const maxTreeResponseBytes = 8_000_000;
const maxFileBytes = 256_000;
const maxSnapshotBytes = 2_000_000;
const maxFiles = 500;
const excludedFilePath = /(?:^|\/)(?:\.git|node_modules|dist|build|coverage|\.next|\.ssh)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|[^/]*(?:secret|credential)[^/]*|package-lock\.json|pnpm-lock\.yaml|npm-shrinkwrap\.json|bun\.lockb?|.*\.(?:lock|png|jpe?g|gif|webp|ico|pdf|zip|gz|sqlite|db|pem|key|p12|wasm|woff2?|ttf|mp4|mov))$/i;

type JsonObject = Record<string, unknown>;
type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

function object(value: unknown): JsonObject {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("GitHub respondió con datos incompletos.");
  return value as JsonObject;
}

function safePath(value: unknown): string {
  if (typeof value !== "string" || !value || value.startsWith("/") || value.includes("\\") || value.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("El commit contiene una ruta de archivo no válida.");
  }
  return value;
}

function base64Utf8(value: unknown): string {
  if (typeof value !== "string") throw new Error("GitHub respondió con contenido de archivo no válido.");
  const normalized = value.replace(/\s/g, "");
  const bytes = Buffer.from(normalized, "base64");
  if (bytes.toString("base64") !== normalized) throw new Error("GitHub respondió con contenido Base64 no válido.");
  const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  if (decoded.includes("\0")) throw new Error("El commit contiene un archivo binario no compatible.");
  return decoded;
}

export function createGitHubRestRepositoryReader(options: { token?: string; fetch?: FetchLike; timeoutMs?: number } = {}) {
  const fetchImpl = options.fetch ?? globalThis.fetch;
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new Error("El tiempo máximo de lectura de GitHub debe ser positivo.");

  async function getJson(url: URL, maxBytes: number, signal?: AbortSignal): Promise<unknown> {
    const headers = new Headers({ accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "Fragments-Review" });
    if (options.token) headers.set("authorization", `Bearer ${options.token}`);
    const timeoutSignal = AbortSignal.timeout(timeoutMs);
    const requestSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
    let response: Response;
    try {
      response = await fetchImpl(url, { method: "GET", headers, redirect: "error", signal: requestSignal });
    } catch (error) {
      if (signal?.aborted) throw new ReviewProcessingError("repository", "GITHUB_UNAVAILABLE", "manual");
      if (timeoutSignal.aborted || error instanceof TypeError) throw new ReviewProcessingError("repository", "GITHUB_UNAVAILABLE", "transient");
      throw new ReviewProcessingError("repository", "GITHUB_UNAVAILABLE", "manual");
    }
    if (!response.ok) {
      if (response.status === 409) throw new ReviewProcessingError("repository", "GITHUB_EMPTY_REPOSITORY", "permanent");
      if (response.status === 429 || (response.status === 403 && response.headers.get("x-ratelimit-remaining") === "0")) {
        throw new ReviewProcessingError("repository", "GITHUB_RATE_LIMITED", "transient");
      }
      if (response.status >= 500) throw new ReviewProcessingError("repository", "GITHUB_SERVER_ERROR", "transient");
      if (response.status === 404) throw new ReviewProcessingError("repository", "GITHUB_NOT_FOUND", "permanent");
      if (response.status === 401 || response.status === 403) throw new ReviewProcessingError("repository", "GITHUB_ACCESS_DENIED", "permanent");
      throw new ReviewProcessingError("repository", "GITHUB_RESPONSE_INVALID", "permanent");
    }
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > maxBytes) throw new ReviewProcessingError("repository", "GITHUB_RESPONSE_INVALID", "permanent");
    if (!response.body) throw new ReviewProcessingError("repository", "GITHUB_RESPONSE_INVALID", "manual");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let totalBytes = 0;
    try {
      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        totalBytes += chunk.value.byteLength;
        if (totalBytes > maxBytes) {
          await reader.cancel();
          throw new ReviewProcessingError("repository", "GITHUB_RESPONSE_INVALID", "permanent");
        }
        chunks.push(chunk.value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(totalBytes);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown; }
    catch { throw new ReviewProcessingError("repository", "GITHUB_RESPONSE_INVALID", "manual"); }
  }

  return {
    async getPublicRepository(owner: string, repo: string, signal?: AbortSignal) {
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || repo === "." || repo === "..") throw new Error("Indica un repositorio de GitHub válido.");
      const metadata = object(await getJson(new URL(`/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, githubApi), 256_000, signal));
      if (metadata.private !== false || typeof metadata.default_branch !== "string" || !metadata.default_branch.trim()) throw new Error("Solo se pueden usar repositorios públicos con una rama predeterminada.");
      const canonicalOwner = object(metadata.owner);
      if (typeof canonicalOwner.login !== "string" || typeof metadata.name !== "string") throw new Error("GitHub respondió con datos incompletos.");
      return { owner: canonicalOwner.login, repo: metadata.name, visibility: "public" as const, defaultBranch: metadata.default_branch };
    },
    async listRecentCommits(owner: string, repo: string, branch: string, signal?: AbortSignal) {
      if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(repo) || !branch.trim() || branch.length > 255) throw new Error("Indica un repositorio y una rama válidos.");
      const repository = await this.getPublicRepository(owner, repo, signal);
      if (repository.defaultBranch !== branch) throw Object.assign(new Error("La rama solicitada no es la rama predeterminada del repositorio."), { errorCode: "GITHUB_INVALID_BRANCH" });
      const url = new URL(`/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/commits`, githubApi);
      url.searchParams.set("per_page", "10");
      url.searchParams.set("sha", branch);
      const raw = await getJson(url, 512_000, signal);
      if (!Array.isArray(raw)) throw new Error("GitHub respondió con una lista de commits no válida.");
      return raw.slice(0, 10).map((value) => {
        const commit = object(value);
        const metadata = object(commit.commit);
        const author = object(metadata.author ?? {});
        const committer = object(metadata.committer ?? {});
        const user = commit.author && typeof commit.author === "object" ? object(commit.author) : {};
        const sha = commit.sha;
        if (typeof sha !== "string" || !/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(sha)) throw new Error("GitHub devolvió un SHA de commit no válido.");
        const message = typeof metadata.message === "string" ? metadata.message.split("\n", 1)[0]!.slice(0, 500) : "Sin mensaje";
        const authorName = typeof author.name === "string" ? author.name : typeof user.login === "string" ? user.login : "Autor no disponible";
        const committedAt = typeof committer.date === "string" ? committer.date : typeof author.date === "string" ? author.date : null;
        return { sha, message, author: authorName.slice(0, 160), committedAt };
      });
    },
    async resolveCommit(owner: string, repo: string, commitSha: string, signal?: AbortSignal) {
      if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(commitSha)) throw new Error("Indica el SHA completo del commit que quieres revisar.");
      const repository = await this.getPublicRepository(owner, repo, signal);
      const raw = object(await getJson(new URL(`/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repo)}/commits/${encodeURIComponent(commitSha.toLowerCase())}`, githubApi), 1_000_000, signal));
      if (typeof raw.sha !== "string" || raw.sha.toLowerCase() !== commitSha.toLowerCase()) throw new Error("GitHub no devolvió el SHA exacto solicitado.");
      const metadata = object(raw.commit);
      const author = object(metadata.author ?? {});
      const committer = object(metadata.committer ?? {});
      const user = raw.author && typeof raw.author === "object" ? object(raw.author) : {};
      return { sha: raw.sha, message: typeof metadata.message === "string" ? metadata.message.split("\n", 1)[0]!.slice(0, 500) : "Sin mensaje",
        author: (typeof author.name === "string" ? author.name : typeof user.login === "string" ? user.login : "Autor no disponible").slice(0, 160),
        committedAt: typeof committer.date === "string" ? committer.date : typeof author.date === "string" ? author.date : null };
    },
    async readCommitSnapshot(input: ExactCommitRequest, processing: { signal?: AbortSignal } = {}): Promise<RepositorySnapshot> {
      if (!/^[A-Za-z0-9-]{1,39}$/.test(input.owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(input.repo)) throw new Error("Indica un propietario y repositorio de GitHub válidos.");
      if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(input.commitSha)) throw new Error("Indica el SHA completo del commit que quieres revisar.");
      const commitSha = input.commitSha.toLowerCase();
      const repoPath = `/repos/${encodeURIComponent(input.owner)}/${encodeURIComponent(input.repo)}`;
      const metadata = object(await getJson(new URL(repoPath, githubApi), 256_000, processing.signal));
      if (metadata.private !== false) throw new Error("Solo se pueden revisar repositorios públicos de GitHub.");
      const commit = object(await getJson(new URL(`${repoPath}/commits/${encodeURIComponent(commitSha)}`, githubApi), 1_000_000, processing.signal));
      const returnedSha = commit.sha;
      if (typeof returnedSha !== "string" || returnedSha.toLowerCase() !== commitSha) throw new Error("GitHub no devolvió el SHA exacto solicitado.");
      const treeSha = object(commit.commit).tree;
      if (!treeSha || typeof treeSha !== "object" || typeof (treeSha as JsonObject).sha !== "string") throw new Error("GitHub no devolvió el árbol del commit solicitado.");
      const treeHash = String((treeSha as JsonObject).sha);
      if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(treeHash)) throw new Error("GitHub devolvió un árbol no válido.");
      const tree = object(await getJson(new URL(`${repoPath}/git/trees/${encodeURIComponent(treeHash)}?recursive=1`, githubApi), maxTreeResponseBytes, processing.signal));
      if (tree.truncated === true || !Array.isArray(tree.tree)) throw new Error("El árbol del commit supera el límite de lectura admitido.");
      const entries = tree.tree.map((raw) => object(raw)).filter((entry) => entry.type === "blob" && (entry.mode === "100644" || entry.mode === "100755"))
        .map((entry) => ({ path: safePath(entry.path), sha: String(entry.sha ?? ""), size: Number(entry.size) }))
        .filter((entry) => !excludedFilePath.test(entry.path))
        .sort((left, right) => left.path.localeCompare(right.path));
      if (entries.length > maxFiles) throw new Error("El commit supera el límite de cantidad de archivos revisables.");
      let totalBytes = 0;
      const files = [];
      for (const entry of entries) {
        if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(entry.sha) || !Number.isSafeInteger(entry.size) || entry.size < 0) throw new Error("GitHub devolvió un archivo con metadatos no válidos.");
        if (entry.size > maxFileBytes || totalBytes + entry.size > maxSnapshotBytes) throw new Error("El commit supera el límite de 2 MB de contenido revisable.");
        const blob = object(await getJson(new URL(`${repoPath}/git/blobs/${encodeURIComponent(entry.sha)}`, githubApi), maxFileBytes * 2, processing.signal));
        const content = base64Utf8(blob.content);
        const actualBytes = new TextEncoder().encode(content).byteLength;
        if (actualBytes !== entry.size || blob.sha !== entry.sha) throw new Error("El contenido del commit no coincide con el blob solicitado.");
        totalBytes += actualBytes;
        files.push({ path: entry.path, content, sha: entry.sha });
      }
      const withoutDigest = { owner: input.owner, repo: input.repo, commitSha, files };
      const digest = await digestSnapshot(withoutDigest);
      let snapshot: RepositorySnapshot;
      try {
        snapshot = RepositorySnapshotSchema.parse({ ...withoutDigest, digest });
      } catch {
        throw new ReviewProcessingError("snapshot_validation", "SNAPSHOT_INVALID", "permanent");
      }
      return snapshot;
    },
  };
}
