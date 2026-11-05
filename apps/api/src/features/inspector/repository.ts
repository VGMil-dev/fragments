import type { DatabaseSync } from "node:sqlite";
import type { InspectorRecord, InspectorStore } from "./service.js";

type Row = {
  id: string;
  review_id: string;
  project_id: string;
  commit_sha: string;
  challenge_json: string;
  status: InspectorRecord["status"];
  created_at: string;
  assigned_to: string | null;
  assigned_at: string | null;
  superseded_by_commit_sha: string | null;
  defense_json: string | null;
};

function fromRow(row: Row): InspectorRecord {
  return {
    id: row.id,
    reviewId: row.review_id,
    projectId: row.project_id,
    commitSha: row.commit_sha,
    challenge: JSON.parse(row.challenge_json) as InspectorRecord["challenge"],
    status: row.status,
    createdAt: row.created_at,
    ...(row.assigned_to ? { assignedTo: row.assigned_to } : {}),
    ...(row.assigned_at ? { assignedAt: row.assigned_at } : {}),
    ...(row.superseded_by_commit_sha ? { supersededByCommitSha: row.superseded_by_commit_sha } : {}),
    ...(row.defense_json ? { defense: JSON.parse(row.defense_json) as NonNullable<InspectorRecord["defense"]> } : {}),
  };
}

export function createInspectorRepository(database: DatabaseSync): InspectorStore {
  const select = database.prepare("SELECT * FROM inspector_challenges WHERE id = ?");
  function persist(record: InspectorRecord): void {
    database.prepare(`INSERT INTO inspector_challenges
      (id, review_id, project_id, commit_sha, challenge_json, status, created_at, assigned_to, assigned_at, superseded_by_commit_sha, defense_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET review_id=excluded.review_id, project_id=excluded.project_id,
        commit_sha=excluded.commit_sha, challenge_json=excluded.challenge_json, status=excluded.status,
        created_at=excluded.created_at, assigned_to=excluded.assigned_to, assigned_at=excluded.assigned_at,
        superseded_by_commit_sha=excluded.superseded_by_commit_sha, defense_json=excluded.defense_json`)
      .run(record.id, record.reviewId, record.projectId, record.commitSha, JSON.stringify(record.challenge), record.status,
        record.createdAt, record.assignedTo ?? null, record.assignedAt ?? null, record.supersededByCommitSha ?? null,
        record.defense ? JSON.stringify(record.defense) : null);
  }

  return {
    async create(record) { persist(record); return record; },
    async get(id) {
      const row = select.get(id) as Row | undefined;
      return row ? fromRow(row) : null;
    },
    async listByReview(reviewId) {
      return (database.prepare("SELECT * FROM inspector_challenges WHERE review_id = ? ORDER BY created_at").all(reviewId) as Row[]).map(fromRow);
    },
    async update(record) { persist(record); return record; },
  };
}
