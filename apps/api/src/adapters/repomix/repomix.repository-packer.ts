import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve, sep } from "node:path";
import type { RepositorySnapshot } from "@fragments/contracts";
import { sha256, type PackedRepository } from "../../features/review/review.service.js";

const excludedFilePath = /(?:^|\/)(?:\.git|node_modules|dist|build|coverage|\.next|\.ssh)(?:\/|$)|(?:^|\/)(?:\.env(?:\..*)?|\.npmrc|\.pypirc|\.netrc|id_rsa|id_ed25519|[^/]*(?:secret|credential)[^/]*|package-lock\.json|pnpm-lock\.yaml|npm-shrinkwrap\.json|bun\.lockb?|.*\.(?:lock|png|jpe?g|gif|webp|ico|pdf|zip|gz|sqlite|db|pem|key|p12|wasm|woff2?|ttf|mp4|mov))$/i;
const privateMaterial = /-----BEGIN (?:[A-Z ]* )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|\bgh[pousr]_[A-Za-z0-9]{20,}|\bAKIA[0-9A-Z]{16}\b/i;

/** Adapter surface for the official Repomix runCli/API, supplied by platform composition. */
export type RepomixRunCli = (options: {
  cwd: string;
  outputFilePath: string;
  outputFormat: "plain";
  include: string[];
  maxOutputBytes: number;
  maxOutputTokens: number;
  disableConfigFile: true;
  signal?: AbortSignal;
}) => Promise<unknown>;

function safeRelativePath(path: string): string {
  if (!path || path.startsWith("/") || path.includes("\\") || path.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("El snapshot contiene una ruta no válida para empaquetar.");
  }
  return path;
}

function asPackedResult(text: string, omittedPaths: string[], maxBytes: number, maxTokens: number): Promise<PackedRepository> {
  const byteCount = new TextEncoder().encode(text).byteLength;
  const tokenCount = Math.ceil(text.length / 4);
  if (byteCount > maxBytes || tokenCount > maxTokens) throw new Error("El contenido Repomix supera el presupuesto de revisión.");
  return sha256(text).then((inputDigest) => ({ text, inputDigest, tokenCount, omittedPaths }));
}

export function createRepomixRepositoryPacker(runCli: RepomixRunCli) {
  return {
    async pack(snapshot: RepositorySnapshot, budget: { maxBytes: number; maxTokens: number; signal?: AbortSignal }): Promise<PackedRepository> {
      if (!Number.isSafeInteger(budget.maxBytes) || budget.maxBytes < 1 || !Number.isSafeInteger(budget.maxTokens) || budget.maxTokens < 1) {
        throw new Error("El presupuesto de empaquetado debe ser un entero positivo.");
      }
      const eligibleFiles = snapshot.files.filter((file) => !excludedFilePath.test(file.path) && !file.content.includes("\0") && !privateMaterial.test(file.content));
      const includedPaths = new Set(eligibleFiles.map((file) => file.path));
      const omittedPaths = snapshot.files.filter((file) => !includedPaths.has(file.path)).map((file) => file.path);
      const files = [];
      let sourceBytes = 0;
      let sourceTokens = 0;
      for (const file of [...eligibleFiles].sort((left, right) => left.path.localeCompare(right.path))) {
        const section = `\n### ${file.path}\n${file.content}\n`;
        const sectionBytes = new TextEncoder().encode(section).byteLength;
        const sectionTokens = Math.ceil(section.length / 4);
        if (sourceBytes + sectionBytes > budget.maxBytes || sourceTokens + sectionTokens > budget.maxTokens) {
          omittedPaths.push(file.path);
          continue;
        }
        sourceBytes += sectionBytes;
        sourceTokens += sectionTokens;
        files.push(file);
      }
      if (files.length === 0) throw new Error("El commit no contiene archivos seguros dentro del presupuesto de revisión.");
      const root = await mkdtemp(resolve(tmpdir(), "fragments-review-"));
      const outputFilePath = resolve(root, "repomix-output.txt");
      try {
        budget.signal?.throwIfAborted();
        for (const file of files) {
          const relative = safeRelativePath(file.path);
          const destination = resolve(root, relative);
          if (destination === root || !destination.startsWith(`${root}${sep}`)) throw new Error("La ruta del archivo sale del árbol temporal.");
          await mkdir(dirname(destination), { recursive: true });
          await writeFile(destination, file.content, { flag: "wx", mode: 0o600 });
        }
        await runCli({
          cwd: root,
          outputFilePath,
          outputFormat: "plain",
          include: files.map((file) => safeRelativePath(file.path)),
          maxOutputBytes: budget.maxBytes,
          maxOutputTokens: budget.maxTokens,
          disableConfigFile: true,
          ...(budget.signal ? { signal: budget.signal } : {}),
        });
        budget.signal?.throwIfAborted();
        const outputInfo = await stat(outputFilePath);
        if (!outputInfo.isFile() || outputInfo.size > budget.maxBytes) throw new Error("La salida Repomix supera el presupuesto de bytes.");
        const text = await readFile(outputFilePath, "utf8");
        return await asPackedResult(text, omittedPaths, budget.maxBytes, budget.maxTokens);
      } finally {
        await rm(root, { recursive: true, force: true });
      }
    },
  };
}
