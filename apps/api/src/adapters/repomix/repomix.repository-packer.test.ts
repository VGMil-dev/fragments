import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { RepositorySnapshot } from "@fragments/contracts";
import { createRepomixRepositoryPacker } from "./repomix.repository-packer.js";

const snapshot: RepositorySnapshot = {
  owner: "student", repo: "demo", commitSha: "a".repeat(40), digest: "b".repeat(64),
  files: [
    { path: "src/index.ts", content: "export const safe = true;", sha: "c".repeat(40) },
    { path: ".env", content: "NEVER_INCLUDE_THIS", sha: "d".repeat(40) },
    { path: "config/token.ts", content: "const token = 'ghp_abcdefghijklmnopqrstuvwxyz0123456789';", sha: "e".repeat(40) },
  ],
};

describe("Repomix temporary-tree adapter", () => {
  it("invokes the supplied official runCli seam only on a server-built tree and deletes it afterward", async () => {
    let cwd = "";
    let packedFiles: string[] = [];
    const runCli = vi.fn(async (options: Parameters<Parameters<typeof createRepomixRepositoryPacker>[0]>[0]) => {
      cwd = options.cwd;
      packedFiles = await readdir(resolve(options.cwd, "src"));
      expect(await readFile(resolve(options.cwd, "src/index.ts"), "utf8")).toBe("export const safe = true;");
      expect(options.include).toEqual(["src/index.ts"]);
      expect(options.disableConfigFile).toBe(true);
      await writeFile(options.outputFilePath, `packed from ${packedFiles.join(",")}`);
      return { ok: true };
    });
    const packer = createRepomixRepositoryPacker(runCli);
    const result = await packer.pack(snapshot, { maxBytes: 1000, maxTokens: 1000 });

    expect(runCli).toHaveBeenCalledOnce();
    expect(result.text).toContain("packed from index.ts");
    expect(result.omittedPaths).toEqual([".env", "config/token.ts"]);
    await expect(readdir(cwd)).rejects.toThrow();
  });

  it("rejects unsafe snapshot paths without invoking Repomix", async () => {
    const runCli = vi.fn();
    const packer = createRepomixRepositoryPacker(runCli);
    await expect(packer.pack({ ...snapshot, files: [{ path: "../escape.ts", content: "bad", sha: "f".repeat(40) }] }, { maxBytes: 1000, maxTokens: 1000 })).rejects.toThrow("ruta no válida");
    expect(runCli).not.toHaveBeenCalled();
  });

  it("rejects output beyond either hard budget and always cleans the temporary directory", async () => {
    const roots: string[] = [];
    const runCli = vi.fn(async (options: Parameters<Parameters<typeof createRepomixRepositoryPacker>[0]>[0]) => {
      roots.push(options.cwd);
      await writeFile(options.outputFilePath, "x".repeat(100));
    });
    const packer = createRepomixRepositoryPacker(runCli);
    await expect(packer.pack(snapshot, { maxBytes: 50, maxTokens: 100 })).rejects.toThrow("presupuesto de bytes");
    await expect(readdir(roots[0]!)).rejects.toThrow();
  });
});
