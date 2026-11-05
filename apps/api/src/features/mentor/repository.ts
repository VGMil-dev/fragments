import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  ProposalResponseSchema,
  SubmissionSnapshotSchema,
  type ProposalResponse,
  type SubmissionSnapshot,
} from "@fragments/contracts";
import type { MentorEvaluation } from "./service.js";

export function createMentorRepository(database: DatabaseSync) {
  return {
    createProposal(proposal: ProposalResponse["proposal"], now = new Date()): ProposalResponse {
      const response = ProposalResponseSchema.parse({ id: randomUUID(), version: 1, proposal, updatedAt: now.toISOString() });
      database.prepare("INSERT INTO proposals(id, version, proposal_json, updated_at) VALUES (?, ?, ?, ?)")
        .run(response.id, response.version, JSON.stringify(response.proposal), response.updatedAt);
      return response;
    },

    getProposal(id: string): ProposalResponse | null {
      const row = database.prepare("SELECT id, version, proposal_json, updated_at FROM proposals WHERE id = ?").get(id) as
        | { id: string; version: number; proposal_json: string; updated_at: string }
        | undefined;
      if (!row) return null;
      return ProposalResponseSchema.parse({
        id: row.id,
        version: row.version,
        proposal: JSON.parse(row.proposal_json) as unknown,
        updatedAt: row.updated_at,
      });
    },

    saveEvaluation(id: string, proposalId: string, proposalVersion: number, evaluation: MentorEvaluation, evaluatedAt = new Date()): void {
      database.prepare("INSERT INTO mentor_evaluations(id, proposal_id, proposal_version, evaluation_json, evaluated_at) VALUES (?, ?, ?, ?, ?)")
        .run(id, proposalId, proposalVersion, JSON.stringify(evaluation), evaluatedAt.toISOString());
    },

    getEvaluation(id: string, proposalId: string, proposalVersion: number): MentorEvaluation | null {
      const row = database.prepare("SELECT evaluation_json FROM mentor_evaluations WHERE id = ? AND proposal_id = ? AND proposal_version = ?")
        .get(id, proposalId, proposalVersion) as { evaluation_json: string } | undefined;
      return row ? JSON.parse(row.evaluation_json) as MentorEvaluation : null;
    },

    saveSubmission(id: string, value: SubmissionSnapshot): void {
      const snapshot = SubmissionSnapshotSchema.parse(value);
      database.prepare(`INSERT INTO submissions
        (id, kind, source_id, score, snapshot_json, content_hash, verification_code, rubric_version, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(id, snapshot.kind, snapshot.sourceId, snapshot.score, JSON.stringify(snapshot.snapshotJson), snapshot.contentHash,
          snapshot.verificationCode, snapshot.rubricVersion, snapshot.createdAt);
    },

    getSubmission(id: string): { id: string; snapshot: SubmissionSnapshot } | null {
      const row = database.prepare("SELECT id, kind, source_id, score, snapshot_json, content_hash, verification_code, rubric_version, created_at FROM submissions WHERE id = ?")
        .get(id) as SubmissionRow | undefined;
      return row ? { id: row.id, snapshot: parseSubmission(row) } : null;
    },

    getSubmissionByCode(code: string): SubmissionSnapshot | null {
      const row = database.prepare("SELECT id, kind, source_id, score, snapshot_json, content_hash, verification_code, rubric_version, created_at FROM submissions WHERE verification_code = ?")
        .get(code) as SubmissionRow | undefined;
      return row ? parseSubmission(row) : null;
    },
  };
}

type SubmissionRow = {
  id: string;
  kind: "mentor" | "review";
  source_id: string;
  score: number;
  snapshot_json: string;
  content_hash: string;
  verification_code: string;
  rubric_version: string;
  created_at: string;
};

function parseSubmission(row: SubmissionRow): SubmissionSnapshot {
  return SubmissionSnapshotSchema.parse({
    kind: row.kind,
    sourceId: row.source_id,
    score: row.score,
    snapshotJson: JSON.parse(row.snapshot_json) as unknown,
    contentHash: row.content_hash,
    verificationCode: row.verification_code,
    rubricVersion: row.rubric_version,
    createdAt: row.created_at,
  });
}
