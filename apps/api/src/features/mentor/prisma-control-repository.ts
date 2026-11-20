import { Prisma } from "../../generated/prisma/client.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  MentorControlConfigSchema, MentorControlEvaluationHistoryItemSchema, MentorControlWorkspaceResponseSchema,
  MentorDraftConfigSchema, MentorPublishedConfigSchema, type MentorControlConfig, type MentorControlEvaluationHistoryItem,
  type MentorControlWorkspaceResponse, type MentorDraftConfig, type MentorPublishedConfig,
} from "@fragments/contracts";
import { proposalEvaluationResponse } from "./evaluation-response.js";
import type { MentorEvaluation } from "./service.js";

export function createPrismaMentorControlRepository(database: PrismaClient) {
  async function getActive(): Promise<MentorPublishedConfig> {
    const row = await database.mentorControlVersion.findFirst({ orderBy: { version: "desc" } });
    if (!row) throw new Error("No hay una configuración Mentor publicada.");
    return MentorPublishedConfigSchema.parse({ version: row.version, config: row.configJson, publishedAt: row.publishedAt.toISOString() });
  }
  async function getDraft(): Promise<MentorDraftConfig> {
    const row = await database.mentorControlDraft.findUnique({ where: { id: 1 } });
    if (!row) throw new Error("No se encontró el borrador de Mentor.");
    return MentorDraftConfigSchema.parse({ config: row.configJson, updatedAt: row.updatedAt.toISOString() });
  }
  async function listEvaluations(limit = 100): Promise<MentorControlEvaluationHistoryItem[]> {
    const rows = await database.mentorEvaluation.findMany({ orderBy: [{ evaluatedAt: "desc" }, { id: "desc" }], take: Math.max(1, Math.min(100, Math.trunc(limit))) });
    const values = await Promise.all(rows.map(async (row) => {
      const revision = await database.proposalRevision.findUnique({ where: { proposalId_version: { proposalId: row.proposalId, version: row.proposalVersion } }, select: { proposalJson: true } });
      const proposal = revision?.proposalJson && typeof revision.proposalJson === "object" ? revision.proposalJson as { title?: unknown } : {};
      const title = typeof proposal.title === "string" && proposal.title.trim() ? proposal.title : "Propuesta anterior";
      const evaluation = proposalEvaluationResponse(row.id, row.proposalId, row.proposalVersion, row.evaluationJson as MentorEvaluation, row.evaluatedAt.toISOString());
      return MentorControlEvaluationHistoryItemSchema.parse({ evaluationId: row.id, proposalId: row.proposalId, proposalVersion: row.proposalVersion,
        proposalTitle: title, evaluatedAt: row.evaluatedAt.toISOString(), evaluation });
    }));
    return values;
  }
  return {
    getActive,
    getDraft,
    async saveDraft(configValue: MentorControlConfig, now = new Date()): Promise<MentorDraftConfig> {
      const config = MentorControlConfigSchema.parse(configValue);
      await database.mentorControlDraft.upsert({ where: { id: 1 }, create: { id: 1, configJson: config as Prisma.InputJsonValue, updatedAt: now }, update: { configJson: config as Prisma.InputJsonValue, updatedAt: now } });
      return MentorDraftConfigSchema.parse({ config, updatedAt: now.toISOString() });
    },
    async publishDraft(publishedBy: string, now = new Date()): Promise<{ status: "published"; active: MentorPublishedConfig } | { status: "invalid_weights" }> {
      return database.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(21021)`);
        const draftRow = await tx.mentorControlDraft.findUnique({ where: { id: 1 } });
        if (!draftRow) throw new Error("No se encontró el borrador de Mentor.");
        const draft = MentorDraftConfigSchema.parse({ config: draftRow.configJson, updatedAt: draftRow.updatedAt.toISOString() });
        if (draft.config.criteria.reduce((total, criterion) => total + criterion.weight, 0) !== 100) return { status: "invalid_weights" };
        const current = await tx.mentorControlVersion.aggregate({ _max: { version: true } });
        const version = (current._max.version ?? 0) + 1;
        await tx.mentorControlVersion.create({ data: { version, configJson: draft.config as Prisma.InputJsonValue, publishedAt: now, publishedBy } });
        return { status: "published", active: MentorPublishedConfigSchema.parse({ version, config: draft.config, publishedAt: now.toISOString() }) };
      });
    },
    async listEvaluations(limit = 100) { return listEvaluations(limit); },
    async workspace(): Promise<MentorControlWorkspaceResponse> {
      const [draft, active, evaluations] = await Promise.all([getDraft(), getActive(), listEvaluations()]);
      return MentorControlWorkspaceResponseSchema.parse({ draft, active, evaluations });
    },
    async getConfigForVersion(version: number): Promise<MentorControlConfig | null> {
      const row = await database.mentorControlVersion.findUnique({ where: { version }, select: { configJson: true } });
      return row ? MentorControlConfigSchema.parse(row.configJson) : null;
    },
  };
}
