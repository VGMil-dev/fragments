import { describe, expect, it } from "vitest";
import { resolveReleaseMetadata } from "./release-metadata";

const releaseSha = "50e2ace697afc125bb3bfdd9a705f0e383796a83";

function gitFor({
  head = releaseSha,
  tagType = "tag",
  tagSha = releaseSha,
  inMain = true,
  clean = true,
}: {
  head?: string;
  tagType?: string;
  tagSha?: string;
  inMain?: boolean;
  clean?: boolean;
} = {}) {
  return (args: string[]) => {
    if (args[0] === "rev-parse" && args[1] === "HEAD") return head;
    if (args[0] === "rev-parse" && args[1] === "--verify") return "704fe08c1932cdabed1303884eadf612625e94e7";
    if (args[0] === "cat-file" && args[1] === "-t") return tagType;
    if (args[0] === "rev-parse" && args[1]?.endsWith("^{commit}")) return tagSha;
    if (args[0] === "merge-base") return inMain ? "" : (() => { throw new Error("not in main"); })();
    if (args[0] === "diff-index" || args[0] === "diff-files") return clean ? "" : (() => { throw new Error("dirty tree"); })();
    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };
}

describe("resolveReleaseMetadata", () => {
  it("uses dev and no commit when release inputs are absent", () => {
    expect(resolveReleaseMetadata({}, gitFor())).toEqual({ version: "dev", commit: null });
  });

  it("accepts an annotated release tag only when it identifies the built commit in main", () => {
    expect(resolveReleaseMetadata({ FRAGMENTS_RELEASE_TAG: "v0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor()))
      .toEqual({ version: "v0.3.1", commit: releaseSha });
  });

  it.each([
    ["invalid tag format", { FRAGMENTS_RELEASE_TAG: "0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor()],
    ["missing SHA", { FRAGMENTS_RELEASE_TAG: "v0.3.1" }, gitFor()],
    ["SHA differs from checked out source", { FRAGMENTS_RELEASE_TAG: "v0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor({ head: "704fe08c1932cdabed1303884eadf612625e94e7" })],
    ["lightweight tag", { FRAGMENTS_RELEASE_TAG: "v0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor({ tagType: "commit" })],
    ["tag points to a different commit", { FRAGMENTS_RELEASE_TAG: "v0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor({ tagSha: "704fe08c1932cdabed1303884eadf612625e94e7" })],
    ["commit is not contained in main", { FRAGMENTS_RELEASE_TAG: "v0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor({ inMain: false })],
    ["source tree has local changes", { FRAGMENTS_RELEASE_TAG: "v0.3.1", FRAGMENTS_RELEASE_SHA: releaseSha }, gitFor({ clean: false })],
  ])("rejects %s", (_description, environment, git) => {
    expect(() => resolveReleaseMetadata(environment, git)).toThrow();
  });
});
