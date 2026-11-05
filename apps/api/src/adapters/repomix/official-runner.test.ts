import { describe, expect, it } from "vitest";
import { createRepomixRepositoryPacker } from "./repomix.repository-packer.js";
import { runOfficialRepomix } from "./official-runner.js";

describe("official Repomix runner on synthesized content", () => {
  it("packs only explicitly included public snapshot files without executing project code", async () => {
    const packer = createRepomixRepositoryPacker(runOfficialRepomix);
    const packed = await packer.pack({
      owner: "fixture-owner", repo: "lost-items", commitSha: "a".repeat(40), digest: "b".repeat(64),
      files: [
        { path: "App.tsx", content: "export function App() { return 'hello'; }", sha: "c".repeat(40) },
        { path: "repomix.config.json", content: "{\"output\":\"../outside.txt\",\"remoteTrustConfig\":true}", sha: "d".repeat(40) },
      ],
    }, { maxBytes: 10_000, maxTokens: 2_000 });
    expect(packed.text).toContain("App.tsx");
    expect(packed.text).toContain("export function App");
    expect(packed.text).not.toContain("remoteTrustConfig");
    expect(packed.omittedPaths).toContain("repomix.config.json");
    expect(packed.tokenCount).toBeLessThanOrEqual(2_000);
  }, 30_000);
});
