import type { RepositorySnapshot } from "../../../../../packages/contracts/src/index.js";
import { sha256, type PackedRepository } from "../../features/review/review.service.js";

const excludedPath = /(?:^|\/)(?:\.git|node_modules|dist|build|coverage|\.next|\.ssh)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|[^/]*(?:secret|credential)[^/]*|package-lock\.json|pnpm-lock\.yaml|npm-shrinkwrap\.json|bun\.lockb?|.*\.(?:lock|png|jpe?g|gif|webp|ico|pdf|zip|gz|sqlite|db|pem|key|p12|wasm|woff2?|ttf|mp4|mov))$/i;
const privateMaterial = /-----BEGIN (?:[A-Z ]* )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b/i;

/** Deterministic, in-memory Repomix-compatible packing with hard byte/token ceilings. */
export function createRepositoryPacker() {
  return {
    async pack(snapshot: RepositorySnapshot, budget: { maxBytes: number; maxTokens: number }): Promise<PackedRepository> {
      if (!Number.isSafeInteger(budget.maxBytes) || budget.maxBytes < 1 || !Number.isSafeInteger(budget.maxTokens) || budget.maxTokens < 1) {
        throw new Error("El presupuesto de empaquetado debe ser un entero positivo.");
      }
      const chosen: string[] = [];
      const omittedPaths: string[] = [];
      let bytes = 0;
      let tokens = 0;
      for (const file of [...snapshot.files].sort((left, right) => left.path.localeCompare(right.path))) {
        if (excludedPath.test(file.path) || file.content.includes("\0") || privateMaterial.test(file.content)) {
          omittedPaths.push(file.path);
          continue;
        }
        const section = `\n### ${file.path}\n${file.content}\n`;
        const sectionBytes = new TextEncoder().encode(section).length;
        const sectionTokens = Math.ceil(section.length / 4);
        if (bytes + sectionBytes > budget.maxBytes || tokens + sectionTokens > budget.maxTokens) {
          omittedPaths.push(file.path);
          continue;
        }
        chosen.push(section);
        bytes += sectionBytes;
        tokens += sectionTokens;
      }
      const text = `Commit ${snapshot.commitSha}\n${chosen.join("")}`;
      if (new TextEncoder().encode(text).length > budget.maxBytes || Math.ceil(text.length / 4) > budget.maxTokens) {
        throw new Error("El commit no cabe en el presupuesto de revisión.");
      }
      return { text, inputDigest: await sha256(text), tokenCount: Math.ceil(text.length / 4), omittedPaths };
    },
  };
}
