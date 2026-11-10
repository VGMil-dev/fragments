import type { DatabaseSync } from "node:sqlite";
import {
  MentorControlConfigSchema,
  MentorControlEvaluationHistoryItemSchema,
  MentorControlWorkspaceResponseSchema,
  MentorDraftConfigSchema,
  MentorPublishedConfigSchema,
  type MentorControlConfig,
  type MentorControlEvaluationHistoryItem,
  type MentorControlWorkspaceResponse,
  type MentorDraftConfig,
  type MentorPublishedConfig,
} from "@fragments/contracts";
import { proposalEvaluationResponse } from "./evaluation-response.js";
import type { MentorEvaluation } from "./service.js";

export function createMentorControlRepository(database: DatabaseSync) {
  return {
    getActive(): MentorPublishedConfig {
      const row = database.prepare(`SELECT version, config_json, published_at FROM mentor_control_versions
        ORDER BY version DESC LIMIT 1`).get() as { version: number; config_json: string; published_at: string } | undefined;
      if (!row) throw new Error("No hay una configuración Mentor publicada.");
      return MentorPublishedConfigSchema.parse({ version: row.version, config: JSON.parse(row.config_json), publishedAt: row.published_at });
    },

    getDraft(): MentorDraftConfig {
      const row = database.prepare("SELECT config_json, updated_at FROM mentor_control_draft WHERE id = 1").get() as
        { config_json: string; updated_at: string } | undefined;
      if (!row) throw new Error("No se encontró el borrador de Mentor.");
      return MentorDraftConfigSchema.parse({ config: JSON.parse(row.config_json), updatedAt: row.updated_at });
    },

    saveDraft(configValue: MentorControlConfig, now = new Date()): MentorDraftConfig {
      const config = MentorControlConfigSchema.parse(configValue);
      const updatedAt = now.toISOString();
      database.prepare(`UPDATE mentor_control_draft SET config_json = ?, updated_at = ? WHERE id = 1`)
        .run(JSON.stringify(config), updatedAt);
      return MentorDraftConfigSchema.parse({ config, updatedAt });
    },

    publishDraft(publishedBy: string, now = new Date()): { status: "published"; active: MentorPublishedConfig } | { status: "invalid_weights" } {
      const draft = this.getDraft();
      if (draft.config.criteria.reduce((total, criterion) => total + criterion.weight, 0) !== 100) return { status: "invalid_weights" };
      const publishedAt = now.toISOString();
      database.exec("BEGIN IMMEDIATE");
      try {
        const version = Number(database.prepare("SELECT COALESCE(MAX(version), 0) + 1 AS version FROM mentor_control_versions").get()?.version ?? 1);
        database.prepare("INSERT INTO mentor_control_versions(version, config_json, published_at, published_by) VALUES (?, ?, ?, ?)")
          .run(version, JSON.stringify(draft.config), publishedAt, publishedBy);
        database.exec("COMMIT");
        return { status: "published", active: MentorPublishedConfigSchema.parse({ version, config: draft.config, publishedAt }) };
      } catch (error) {
        database.exec("ROLLBACK");
        throw error;
      }
    },

    listEvaluations(limit = 100): MentorControlEvaluationHistoryItem[] {
      const rows = database.prepare(`SELECT e.id, e.proposal_id, e.proposal_version, e.evaluation_json, e.evaluated_at,
          r.proposal_json
        FROM mentor_evaluations e LEFT JOIN proposal_revisions r
          ON r.proposal_id = e.proposal_id AND r.version = e.proposal_version
        ORDER BY e.evaluated_at DESC, e.rowid DESC LIMIT ?`).all(Math.max(1, Math.min(100, Math.trunc(limit)))) as Array<{
          id: string; proposal_id: string; proposal_version: number; evaluation_json: string; evaluated_at: string; proposal_json: string | null;
        }>;
      return rows.map((row) => {
        const proposal = row.proposal_json ? JSON.parse(row.proposal_json) as { title?: unknown } : {};
        const title = typeof proposal.title === "string" && proposal.title.trim() ? proposal.title : "Propuesta anterior";
        const evaluation = proposalEvaluationResponse(row.id, row.proposal_id, row.proposal_version,
          JSON.parse(row.evaluation_json) as MentorEvaluation, row.evaluated_at);
        return MentorControlEvaluationHistoryItemSchema.parse({
          evaluationId: row.id,
          proposalId: row.proposal_id,
          proposalVersion: row.proposal_version,
          proposalTitle: title,
          evaluatedAt: row.evaluated_at,
          evaluation,
        });
      });
    },

    workspace(): MentorControlWorkspaceResponse {
      return MentorControlWorkspaceResponseSchema.parse({ draft: this.getDraft(), active: this.getActive(), evaluations: this.listEvaluations() });
    },

    getConfigForVersion(version: number): MentorControlConfig | null {
      const row = database.prepare("SELECT config_json FROM mentor_control_versions WHERE version = ?").get(version) as { config_json: string } | undefined;
      return row ? MentorControlConfigSchema.parse(JSON.parse(row.config_json)) : null;
    },
  };
}
