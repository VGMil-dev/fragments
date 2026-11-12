export interface ReleaseMetadata {
  version: string;
  commit: string | null;
}

export type GitCommand = (args: string[]) => string;

const RELEASE_TAG_PATTERN = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const FULL_SHA_PATTERN = /^[0-9a-f]{40}$/i;

export function resolveReleaseMetadata(
  environment: Record<string, string | undefined>,
  git: GitCommand,
): ReleaseMetadata {
  const tag = environment.FRAGMENTS_RELEASE_TAG;
  const expectedSha = environment.FRAGMENTS_RELEASE_SHA;

  if (tag === undefined && expectedSha === undefined) return { version: "dev", commit: null };
  if (!tag || !expectedSha) throw new Error("Release metadata requires both FRAGMENTS_RELEASE_TAG and FRAGMENTS_RELEASE_SHA.");
  if (!RELEASE_TAG_PATTERN.test(tag)) throw new Error(`Invalid release tag: ${tag}`);
  if (!FULL_SHA_PATTERN.test(expectedSha)) throw new Error("Release SHA must be a full 40-character commit SHA.");

  const headSha = git(["rev-parse", "HEAD"]).toLowerCase();
  if (headSha !== expectedSha.toLowerCase()) throw new Error("Release SHA does not match the checked out build commit.");

  const tagRef = `refs/tags/${tag}`;
  if (git(["cat-file", "-t", tagRef]) !== "tag") throw new Error(`Release tag ${tag} must be annotated.`);
  const tagSha = git(["rev-parse", `${tagRef}^{commit}`]).toLowerCase();
  if (tagSha !== headSha) throw new Error(`Release tag ${tag} does not point to the checked out build commit.`);

  git(["rev-parse", "--verify", "refs/remotes/origin/main"]);
  git(["merge-base", "--is-ancestor", headSha, "origin/main"]);
  git(["diff-index", "--quiet", "--cached", "HEAD", "--"]);
  git(["diff-files", "--quiet", "--"]);

  return { version: tag, commit: headSha };
}
