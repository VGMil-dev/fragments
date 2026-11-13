import { releaseMetadata } from "../../build/metadata";

export function BuildVersion() {
  const commit = releaseMetadata.commit;
  const commitLabel = commit ? `; commit ${commit}` : "";
  return (
    <span
      className="build-version"
      title={commit ? `Commit exacto: ${commit}` : undefined}
      aria-label={`Versión ${releaseMetadata.version}${commitLabel}`}
    >
      {releaseMetadata.version}
      {commit ? <span className="build-version__commit"> · {commit.slice(0, 7)}</span> : null}
    </span>
  );
}
