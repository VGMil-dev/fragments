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
    createProposal(proposal: ProposalResponse["proposal"], ownerHash: string | null, ownerUserId?: string, now = new Date()): ProposalResponse {
      const response = ProposalResponseSchema.parse({ id: randomUUID(), version: 1, proposal, updatedAt: now.toISOString() });
      database.exec("BEGIN IMMEDIATE");
      try {
        database.prepare("INSERT INTO proposals(id, version, proposal_json, updated_at, owner_hash, owner_user_id) VALUES (?, ?, ?, ?, ?, ?)")
          .run(response.id, response.version, JSON.stringify(response.proposal), response.updatedAt, ownerHash, ownerUserId ?? null);
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

    getOwnedProposalByUser(id: string, ownerUserId: string): ProposalResponse | null {
      const row = database.prepare("SELECT id, version, proposal_json, updated_at FROM proposals WHERE id = ? AND owner_user_id = ?")
        .get(id, ownerUserId) as { id: string; version: number; proposal_json: string; updated_at: string } | undefined;
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

    updateProposalByUser(id: string, ownerUserId: string, expectedVersion: number, proposal: UpdateProposalRequest, now = new Date()):
      { status: "updated"; proposal: ProposalResponse } | { status: "conflict" | "not_found" } {
      const nextVersion = expectedVersion + 1;
      const updatedAt = now.toISOString();
      const next = ProposalResponseSchema.parse({ id, version: nextVersion, proposal: withoutExpectedVersion(proposal), updatedAt });
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = database.prepare(`UPDATE proposals SET version = ?, proposal_json = ?, updated_at = ?
          WHERE id = ? AND owner_user_id = ? AND version = ?`).run(nextVersion, JSON.stringify(next.proposal), updatedAt, id, ownerUserId, expectedVersion);
        if (Number(result.changes) !== 1) {
          const owned = database.prepare("SELECT version FROM proposals WHERE id = ? AND owner_user_id = ?").get(id, ownerUserId);
          database.exec("ROLLBACK");
          return owned ? { status: "conflict" } : { status: "not_found" };
        }
        database.prepare("INSERT INTO proposal_revisions(proposal_id, version, proposal_json, updated_at) VALUES (?, ?, ?, ?)")
          .run(id, nextVersion, JSON.stringify(next.proposal), updatedAt);
        database.exec("COMMIT");
        return { status: "updated", proposal: next };
      } catch (error) { database.exec("ROLLBACK"); throw error; }
    },

    getProposalHistory(id: string, ownerHash: string): ProposalResponse[] | null {
      if (!this.getOwnedProposal(id, ownerHash)) return null;
      const rows = database.prepare(`SELECT proposal_id, version, proposal_json, updated_at FROM proposal_revisions
        WHERE proposal_id = ? ORDER BY version ASC`).all(id) as Array<{ proposal_id: string; version: number; proposal_json: string; updated_at: string }>;
      return rows.map((row) => ProposalResponseSchema.parse({ id: row.proposal_id, version: row.version, proposal: JSON.parse(row.proposal_json) as unknown, updatedAt: row.updated_at }));
    },

    getProposalHistoryByUser(id: string, ownerUserId: string): ProposalResponse[] | null {
      if (!this.getOwnedProposalByUser(id, ownerUserId)) return null;
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
      const rows = database.prepare(`SELECT id, proposal_json FROM (
          SELECT p.id, r.proposal_json, ap.published_at,
            ROW_NUMBER() OVER (PARTITION BY p.id ORDER BY r.version DESC) AS position
          FROM mentor_academic_publications ap
          JOIN proposals p ON p.id = ap.proposal_id AND p.owner_user_id IS NOT NULL
          JOIN proposal_revisions r ON r.proposal_id = ap.proposal_id AND r.version = ap.proposal_version
          JOIN mentor_evaluations e ON e.id = ap.evaluation_id AND e.proposal_id = ap.proposal_id
            AND e.proposal_version = ap.proposal_version AND e.context_version = ap.context_version
          JOIN mentor_control_versions v ON v.version = ap.context_version
          JOIN user u ON u.id = p.owner_user_id
          JOIN account a ON a.userId = u.id AND a.providerId = 'github'
          WHERE NOT EXISTS (SELECT 1 FROM mentor_academic_project_moderation m WHERE m.proposal_id = p.id)
        ) WHERE position = 1 ORDER BY published_at DESC, id ASC LIMIT 500`).all() as Array<{ id: string; proposal_json: string }>;
      return rows.map((row) => {
        const proposal = JSON.parse(row.proposal_json) as { title: string; solution: string; skills: string[]; tags?: string[] };
        return { id: row.id, title: proposal.title, summary: proposal.solution.slice(0, 500), skills: proposal.skills, tags: proposal.tags ?? [] };
      });
    },

    saveEvaluation(id: string, proposalId: string, proposalVersion: number, evaluation: MentorEvaluation, inputDigest?: string, contextVersion?: number, evaluatedAt = new Date()): void {
      database.exec("BEGIN IMMEDIATE");
      try {
        database.prepare("INSERT OR IGNORE INTO mentor_evaluations(id, proposal_id, proposal_version, evaluation_json, evaluated_at, input_digest, context_version) VALUES (?, ?, ?, ?, ?, ?, ?)")
          .run(id, proposalId, proposalVersion, JSON.stringify(evaluation), evaluatedAt.toISOString(), inputDigest ?? null, contextVersion ?? null);
        if (inputDigest && contextVersion) {
          const persisted = database.prepare(`SELECT e.id FROM mentor_evaluations e
            JOIN proposal_revisions r ON r.proposal_id = e.proposal_id AND r.version = e.proposal_version
            JOIN mentor_control_versions v ON v.version = e.context_version
            JOIN proposals p ON p.id = e.proposal_id AND p.owner_user_id IS NOT NULL
            JOIN user u ON u.id = p.owner_user_id AND u.githubLogin IS NOT NULL
            JOIN account a ON a.userId = u.id AND a.providerId = 'github'
            WHERE e.proposal_id = ? AND e.proposal_version = ? AND e.input_digest = ? AND e.context_version = ?
            ORDER BY e.evaluated_at, e.rowid LIMIT 1`).get(proposalId, proposalVersion, inputDigest, contextVersion) as { id: string } | undefined;
          if (persisted) database.prepare(`INSERT OR IGNORE INTO mentor_academic_publications
            (proposal_id, proposal_version, evaluation_id, context_version, rubric_version, published_at)
            VALUES (?, ?, ?, ?, ?, ?)`)
            .run(proposalId, proposalVersion, persisted.id, contextVersion, `mentor-rubric-v${contextVersion}`, evaluatedAt.toISOString());
        }
        database.exec("COMMIT");
      } catch (error) { database.exec("ROLLBACK"); throw error; }
    },

    getCachedEvaluation(proposalId: string, proposalVersion: number, inputDigest: string, contextVersion: number): { id: string; evaluation: MentorEvaluation; evaluatedAt: string } | null {
      const row = database.prepare(`SELECT id, evaluation_json, evaluated_at FROM mentor_evaluations
        WHERE proposal_id = ? AND proposal_version = ? AND input_digest = ? AND context_version = ? LIMIT 1`)
        .get(proposalId, proposalVersion, inputDigest, contextVersion) as { id: string; evaluation_json: string; evaluated_at: string } | undefined;
      return row ? { id: row.id, evaluation: JSON.parse(row.evaluation_json) as MentorEvaluation, evaluatedAt: row.evaluated_at } : null;
    },

    getEvaluation(id: string, proposalId: string, proposalVersion: number): MentorEvaluation | null {
      const row = database.prepare("SELECT evaluation_json FROM mentor_evaluations WHERE id = ? AND proposal_id = ? AND proposal_version = ?")
        .get(id, proposalId, proposalVersion) as { evaluation_json: string } | undefined;
      return row ? JSON.parse(row.evaluation_json) as MentorEvaluation : null;
    },

    getLatestEvaluation(proposalId: string, proposalVersion: number): { id: string; evaluation: MentorEvaluation; evaluatedAt: string } | null {
      const row = database.prepare(`SELECT id, evaluation_json, evaluated_at FROM mentor_evaluations
        WHERE proposal_id = ? AND proposal_version = ? ORDER BY evaluated_at DESC, rowid DESC LIMIT 1`)
        .get(proposalId, proposalVersion) as { id: string; evaluation_json: string; evaluated_at: string } | undefined;
      return row ? { id: row.id, evaluation: JSON.parse(row.evaluation_json) as MentorEvaluation, evaluatedAt: row.evaluated_at } : null;
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
