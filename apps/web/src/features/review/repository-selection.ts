import type { ApiResult, GitHubCommitSummary, GitHubPublicRepository } from "@fragments/contracts";

export type ReviewRepository = GitHubPublicRepository;
export type ReviewCommitOption = GitHubCommitSummary;

export interface ReviewRepositoryLookup {
  detectRepository(input: { owner: string; repo: string }, signal?: AbortSignal): Promise<ApiResult<ReviewRepository>>;
  listCommits(input: { owner: string; repo: string; branch: string; limit: 10 }, signal?: AbortSignal): Promise<ApiResult<ReviewCommitOption[]>>;
  resolveCommit(input: { owner: string; repo: string; commitSha: string }, signal?: AbortSignal): Promise<ApiResult<ReviewCommitOption>>;
}

export interface ParsedRepositoryUrl {
  owner: string;
  repo: string;
}

export function parsePublicGitHubRepository(value: string): ParsedRepositoryUrl | null {
  const raw = value.trim();
  let path = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password || url.port || url.search || url.hash) return null;
      path = url.pathname.replace(/^\/+|\/+$/g, "");
    } catch {
      return null;
    }
  }
  path = path.replace(/\.git$/i, "");
  const match = path.match(/^([A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?)\/([A-Za-z0-9_.-]{1,100})$/);
  if (!match || match[2] === "." || match[2] === "..") return null;
  return { owner: match[1]!, repo: match[2]! };
}

export function parseCommitReference(value: string, repository: Pick<ReviewRepository, "owner" | "repo">): string | null {
  const raw = value.trim();
  let sha = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      const url = new URL(raw);
      if (url.protocol !== "https:" || url.hostname.toLowerCase() !== "github.com" || url.username || url.password || url.port || url.search || url.hash) return null;
      const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/commit\/([a-f0-9]{40})\/?$/i);
      if (!match || `${match[1]}/${match[2]}`.toLowerCase() !== `${repository.owner}/${repository.repo}`.toLowerCase()) return null;
      sha = match[3]!;
    } catch {
      return null;
    }
  }
  return /^[a-f0-9]{40}$/i.test(sha) ? sha.toLowerCase() : null;
}

export function repositoryLookupError(code: string): string {
  if (code === "NOT_FOUND" || code === "REPOSITORY_NOT_FOUND") return "No encontramos ese repositorio público en GitHub.";
  if (code === "EMPTY_REPOSITORY") return "Este repositorio todavía no tiene commits.";
  if (code === "RATE_LIMITED" || code === "RATE_LIMIT") return "GitHub ha limitado las solicitudes. Inténtalo más tarde.";
  if (code === "NETWORK_ERROR" || code === "UPSTREAM_UNAVAILABLE") return "No pudimos conectar con GitHub. Puedes volver a intentarlo.";
  return "No pudimos verificar la información en GitHub. Inténtalo de nuevo.";
}
