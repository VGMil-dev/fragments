import { createHash } from "node:crypto";
import { RepositorySnapshotSchema } from "@fragments/contracts";
import type { ReviewRecord } from "../review/review.service.js";
import { digestSnapshot } from "../review/review.service.js";
import type { ReviewEvidence } from "./service.js";

export type InspectorReviewRecord = Pick<ReviewRecord, "id" | "projectId" | "owner" | "repo" | "commitSha" | "analysis">;

export interface InspectorReviewLookup {
  getById(id: string): Promise<InspectorReviewRecord | null>;
  getLatestCommit(projectId: string): Promise<string | null>;
}

export interface InspectorExactCommitReader {
  getCommitSnapshot(input: { owner: string; repo: string; commitSha: string }): Promise<unknown>;
}

/** Rehydrates review evidence from its exact stored owner/repo/SHA; never resolves a branch or URL. */
export function createInspectorReviewAdapter(dependencies: {
  reviews: InspectorReviewLookup;
  repository: InspectorExactCommitReader;
}) {
  const sourceProjectIds = new Map<string, string>();
  function contractProjectId(value: string): string {
    if (/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(value)) return value;
    const id = `p-${createHash("sha256").update(value).digest("hex").slice(0, 32)}`;
    sourceProjectIds.set(id, value);
    return id;
  }
  return {
    async getById(id: string): Promise<ReviewEvidence | null> {
      const record = await dependencies.reviews.getById(id);
      if (!record) return null;
      const snapshot = RepositorySnapshotSchema.parse(await dependencies.repository.getCommitSnapshot({
        owner: record.owner,
        repo: record.repo,
        commitSha: record.commitSha,
      }));
      if (snapshot.owner.toLowerCase() !== record.owner.toLowerCase()
        || snapshot.repo.toLowerCase() !== record.repo.toLowerCase()
        || snapshot.commitSha.toLowerCase() !== record.commitSha.toLowerCase()) {
        throw new Error("El snapshot recuperado no corresponde al commit revisado.");
      }
      const { digest: _digest, ...content } = snapshot;
      if (await digestSnapshot(content) !== snapshot.digest) {
        throw new Error("La huella del snapshot recuperado no coincide con su contenido.");
      }
      return {
        id: record.id,
        projectId: contractProjectId(record.projectId),
        owner: record.owner,
        repo: record.repo,
        commitSha: record.commitSha,
        snapshot,
        analysis: record.analysis,
      };
    },
    getLatestCommit(projectId: string) {
      return dependencies.reviews.getLatestCommit(sourceProjectIds.get(projectId) ?? projectId);
    },
  };
}
