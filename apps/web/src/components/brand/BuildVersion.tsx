import { releaseMetadata } from "../../build/metadata";

export function BuildVersion() {
  const commitLabel = releaseMetadata.commit ? `; commit ${releaseMetadata.commit}` : "";
  return (
    <span
      className="build-version"
      title={releaseMetadata.commit ? `Commit exacto: ${releaseMetadata.commit}` : undefined}
      aria-label={`Versión ${releaseMetadata.version}${commitLabel}`}
    >
      {releaseMetadata.version}
    </span>
  );
}
