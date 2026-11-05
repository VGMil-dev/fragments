import { randomUUID } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import {
  ProposalResponseSchema,
  type GalleryEntry,
  type UpdateProposalRequest,
  SubmissionSnapshotSchema,
  type ProposalResponse,
  type SubmissionSnapshot,
} from "@fragments/contracts";
import type { MentorEvaluation } from "./service.js";

export function createMentorRepository(database: DatabaseSync) {
  return {
    createProposal(proposal: ProposalResponse["proposal"], ownerHash: string, now = new Date()): ProposalResponse {
      const response = ProposalResponseSchema.parse({ id: randomUUID(), version: 1, proposal, updatedAt: now.toISOString() });
      database.exec("BEGIN IMMEDIATE");
      try {
        database.prepare("INSERT INTO proposals(id, version, proposal_json, updated_at, owner_hash) VALUES (?, ?, ?, ?, ?)")
          .run(response.id, response.version, JSON.stringify(response.proposal), response.updatedAt, ownerHash);
        database.prepare("INSERT INTO proposal_revisions(proposal_id, version, proposal_json, updated_at) VALUES (?, ?, ?, ?)")
          .run(response.id, response.version, JSON.stringify(response.proposal), response.updatedAt);
        database.exec("COMMIT");
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
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

    getOwnedProposal(id: string, ownerHash: string): ProposalResponse | null {
      const row = database.prepare("SELECT id, version, proposal_json, updated_at FROM proposals WHERE id = ? AND owner_hash = ?")
        .get(id, ownerHash) as { id: string; version: number; proposal_json: string; updated_at: string } | undefined;
      return row ? ProposalResponseSchema.parse({ id: row.id, version: row.version, proposal: JSON.parse(row.proposal_json) as unknown, updatedAt: row.updated_at }) : null;
    },

    updateProposal(id: string, ownerHash: string, expectedVersion: number, proposal: UpdateProposalRequest, now = new Date()):
      { status: "updated"; proposal: ProposalResponse } | { status: "conflict" | "not_found" } {
      const nextVersion = expectedVersion + 1;
      const updatedAt = now.toISOString();
      const next = ProposalResponseSchema.parse({ id, version: nextVersion, proposal: withoutExpectedVersion(proposal), updatedAt });
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = database.prepare(`UPDATE proposals SET version = ?, proposal_json = ?, updated_at = ?
          WHERE id = ? AND owner_hash = ? AND version = ?`)
          .run(nextVersion, JSON.stringify(next.proposal), updatedAt, id, ownerHash, expectedVersion);
        if (Number(result.changes) !== 1) {
          const owned = database.prepare("SELECT version FROM proposals WHERE id = ? AND owner_hash = ?").get(id, ownerHash) as { version: number } | undefined;
          database.exec("ROLLBACK");
          return owned ? { status: "conflict" } : { status: "not_found" };
        }
        database.prepare("INSERT INTO proposal_revisions(proposal_id, version, proposal_json, updated_at) VALUES (?, ?, ?, ?)")
          .run(id, nextVersion, JSON.stringify(next.proposal), updatedAt);
        database.exec("COMMIT");
        return { status: "updated", proposal: next };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    getProposalHistory(id: string, ownerHash: string): ProposalResponse[] | null {
      if (!this.getOwnedProposal(id, ownerHash)) return null;
      const rows = database.prepare(`SELECT proposal_id, version, proposal_json, updated_at FROM proposal_revisions
        WHERE proposal_id = ? ORDER BY version ASC`).all(id) as Array<{ proposal_id: string; version: number; proposal_json: string; updated_at: string }>;
      return rows.map((row) => ProposalResponseSchema.parse({ id: row.proposal_id, version: row.version, proposal: JSON.parse(row.proposal_json) as unknown, updatedAt: row.updated_at }));
    },

    setGalleryOptIn(id: string, ownerHash: string, optedIn: boolean, now = new Date()):
      { status: "updated" | "not_found" } {
      database.exec("BEGIN IMMEDIATE");
      try {
        const proposal = this.getOwnedProposal(id, ownerHash);
        if (!proposal) { database.exec("ROLLBACK"); return { status: "not_found" }; }
        database.prepare(`INSERT INTO mentor_gallery_optins(proposal_id, proposal_version, opted_in, updated_at)
          VALUES (?, ?, ?, ?) ON CONFLICT(proposal_id) DO UPDATE SET proposal_version = excluded.proposal_version,
          opted_in = excluded.opted_in, updated_at = excluded.updated_at`)
          .run(id, proposal.version, optedIn ? 1 : 0, now.toISOString());
        database.exec("COMMIT");
        return { status: "updated" };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    listGallery(): GalleryEntry[] {
      const rows = database.prepare(`SELECT p.id, p.version, p.proposal_json, p.updated_at
        FROM proposals p JOIN mentor_gallery_optins g ON g.proposal_id = p.id AND g.proposal_version = p.version
        WHERE g.opted_in = 1 ORDER BY g.updated_at DESC`).all() as Array<{ id: string; version: number; proposal_json: string; updated_at: string }>;
      return rows.map((row) => {
        const saved = ProposalResponseSchema.parse({ id: row.id, version: row.version, proposal: JSON.parse(row.proposal_json) as unknown, updatedAt: row.updated_at });
        return { id: saved.id, title: saved.proposal.title, summary: saved.proposal.solution.slice(0, 500), skills: saved.proposal.skills, tags: saved.proposal.goals.slice(0, 20).map((goal) => goal.slice(0, 50)) };
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

function withoutExpectedVersion(value: UpdateProposalRequest): ProposalResponse["proposal"] {
  const { expectedVersion: _expectedVersion, ...proposal } = value;
  return proposal;
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
