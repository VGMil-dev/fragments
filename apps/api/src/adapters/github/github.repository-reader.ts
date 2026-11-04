import { RepositorySnapshotSchema, type RepositorySnapshot } from "../../../../../packages/contracts/src/index.js";

export type ExactCommitRequest = { owner: string; repo: string; commitSha: string };

/** Narrow seam for an official GitHub client; raw URLs and branch refs are never accepted. */
export interface GitHubCommitClient {
  readCommitSnapshot(input: ExactCommitRequest): Promise<unknown>;
}

export function createGitHubRepositoryReader(client: GitHubCommitClient) {
  return {
    async getCommitSnapshot(input: ExactCommitRequest): Promise<RepositorySnapshot> {
      if (!/^[A-Za-z0-9-]{1,39}$/.test(input.owner) || !/^[A-Za-z0-9_.-]{1,100}$/.test(input.repo)) {
        throw new Error("Indica un propietario y repositorio de GitHub válidos.");
      }
      if (!/^(?:[a-f\d]{40}|[a-f\d]{64})$/i.test(input.commitSha)) {
        throw new Error("Indica el SHA completo del commit que quieres revisar.");
      }
      const snapshot = RepositorySnapshotSchema.parse(await client.readCommitSnapshot({ ...input, commitSha: input.commitSha.toLowerCase() }));
      if (snapshot.owner.toLowerCase() !== input.owner.toLowerCase() || snapshot.repo.toLowerCase() !== input.repo.toLowerCase() || snapshot.commitSha.toLowerCase() !== input.commitSha.toLowerCase()) {
        throw new Error("GitHub respondió con un repositorio o commit distinto al solicitado.");
      }
      return snapshot;
    },
  };
}
