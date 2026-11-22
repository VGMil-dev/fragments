import { randomUUID } from "node:crypto";
import { Prisma } from "../../generated/prisma/client.js";
import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  ProposalResponseSchema, ProposalDraftResponseSchema, StudentSubmissionsResponseSchema, SubmissionSnapshotSchema,
  type GalleryEntry, type ProposalDraftFields, type ProposalDraftResponse, type UpdateProposalRequest, type ProposalResponse, type SubmissionSnapshot,
} from "@fragments/contracts";
import type { MentorEvaluation } from "./service.js";
import { loadProposalAssignmentContext } from "../assignments/proposal-context.js";

function response(row: { id: string; version: number; proposalJson: unknown; assignmentVersionId?: string | null; updatedAt: Date }): ProposalResponse {
  return ProposalResponseSchema.parse({ id: row.id, version: row.version, proposal: row.proposalJson, assignmentVersionId: row.assignmentVersionId ?? null, updatedAt: row.updatedAt.toISOString() });
}
function withoutExpectedVersion(value: UpdateProposalRequest): ProposalResponse["proposal"] {
  const { expectedVersion: _expectedVersion, ...proposal } = value;
  return proposal;
}
function parseSubmission(row: { kind: string; sourceId: string; score: number; snapshotJson: unknown; contentHash: string; verificationCode: string; rubricVersion: string; createdAt: Date }): SubmissionSnapshot {
  return SubmissionSnapshotSchema.parse({ kind: row.kind, sourceId: row.sourceId, score: row.score, snapshotJson: row.snapshotJson,
    contentHash: row.contentHash, verificationCode: row.verificationCode, rubricVersion: row.rubricVersion, createdAt: row.createdAt.toISOString() });
}
function proposalObject(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export function createPrismaMentorRepository(database: PrismaClient) {
  async function ownedByHash(id: string, ownerHash: string) { return database.proposal.findFirst({ where: { id, ownerHash } }); }
  async function ownedByUser(id: string, ownerUserId: string) { return database.proposal.findFirst({ where: { id, ownerUserId } }); }
  async function draftResponse(row: { id: string; version: number; proposalJson: unknown; assignmentVersionId?: string | null; updatedAt: Date }): Promise<ProposalDraftResponse> {
    return ProposalDraftResponseSchema.parse({ id: row.id, version: row.version, proposal: row.proposalJson, assignmentVersionId: row.assignmentVersionId ?? null,
      assignmentContext: await loadProposalAssignmentContext(database, row.assignmentVersionId), updatedAt: row.updatedAt.toISOString() });
  }
  async function addRevision(tx: Prisma.TransactionClient, id: string, version: number, proposal: unknown, updatedAt: Date) {
    await tx.proposalRevision.create({ data: { proposalId: id, version, proposalJson: proposal as Prisma.InputJsonValue, updatedAt } });
  }

  return {
    async createProposal(proposal: ProposalResponse["proposal"], ownerHash: string | null, ownerUserId?: string, now = new Date()): Promise<ProposalResponse> {
      const parsed = ProposalResponseSchema.parse({ id: randomUUID(), version: 1, proposal, assignmentVersionId: null, updatedAt: now.toISOString() });
      await database.$transaction(async (tx) => {
        await tx.proposal.create({ data: { id: parsed.id, version: 1, proposalJson: parsed.proposal as Prisma.InputJsonValue,
          updatedAt: now, ownerHash, ownerUserId: ownerUserId ?? null } });
        await addRevision(tx, parsed.id, 1, parsed.proposal, now);
      });
      return parsed;
    },
    async getProposal(id: string): Promise<ProposalResponse | null> { const row = await database.proposal.findUnique({ where: { id } }); return row ? response(row) : null; },
    async getOwnedProposal(id: string, ownerHash: string): Promise<ProposalResponse | null> { const row = await ownedByHash(id, ownerHash); return row ? response(row) : null; },
    async getOwnedProposalByUser(id: string, ownerUserId: string): Promise<ProposalResponse | null> { const row = await ownedByUser(id, ownerUserId); return row ? response(row) : null; },
    async createProposalDraftByUser(proposal: ProposalDraftFields, ownerUserId: string, assignmentVersionId: string | null = null, now = new Date()): Promise<ProposalDraftResponse> {
      const parsed = ProposalDraftResponseSchema.parse({ id: randomUUID(), version: 1, proposal, assignmentVersionId, updatedAt: now.toISOString() });
      await database.$transaction(async (tx) => {
        await tx.proposal.create({ data: { id: parsed.id, version: 1, proposalJson: parsed.proposal as Prisma.InputJsonValue, updatedAt: now, ownerUserId, assignmentVersionId } });
        await addRevision(tx, parsed.id, 1, parsed.proposal, now);
      });
      return draftResponse({ id: parsed.id, version: 1, proposalJson: parsed.proposal, assignmentVersionId, updatedAt: now });
    },
    async getOwnedProposalDraftByUser(id: string, ownerUserId: string): Promise<ProposalDraftResponse | null> { const row = await ownedByUser(id, ownerUserId); return row ? draftResponse(row) : null; },
    async listStudentSubmissions(ownerUserId: string) {
      const [proposals, reviews] = await Promise.all([
        database.proposal.findMany({ where: { ownerUserId }, select: { id: true } }),
        database.job.findMany({ where: { type: "review", status: "done" }, orderBy: { updatedAt: "desc" }, take: 200, select: { id: true, payloadJson: true } }),
      ]);
      const reviewLabels = new Map<string, string>();
      for (const job of reviews) {
        const payload = proposalObject(job.payloadJson); const context = proposalObject(payload.context); const request = proposalObject(payload.request);
        if (context.studentId === ownerUserId && typeof request.owner === "string" && typeof request.repo === "string") reviewLabels.set(job.id, `${request.owner}/${request.repo}`);
      }
      const proposalIds = proposals.map((proposal) => proposal.id);
      const [mentorSubmissions, reviewSubmissions] = await Promise.all([
        proposalIds.length ? database.submission.findMany({ where: { kind: "mentor", sourceId: { in: proposalIds } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 200 }) : [],
        reviewLabels.size ? database.submission.findMany({ where: { kind: "review", sourceId: { in: [...reviewLabels.keys()] } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], take: 200 }) : [],
      ]);
      const rows = [
        ...mentorSubmissions.map((row) => { const snapshot = proposalObject(row.snapshotJson); const proposal = proposalObject(snapshot.proposal); return { id: row.id, kind: row.kind, sourceId: row.sourceId, label: typeof proposal.title === "string" ? proposal.title : "Proyecto Mentor", score: row.score, rubricVersion: row.rubricVersion, createdAt: row.createdAt.toISOString() }; }),
        ...reviewSubmissions.map((row) => ({ id: row.id, kind: row.kind, sourceId: row.sourceId, label: reviewLabels.get(row.sourceId) ?? "Review", score: row.score, rubricVersion: row.rubricVersion, createdAt: row.createdAt.toISOString() })),
      ].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)).slice(0, 200);
      return StudentSubmissionsResponseSchema.parse(rows);
    },
    async updateProposalDraftByUser(id: string, ownerUserId: string, expectedVersion: number, proposal: ProposalDraftFields, now = new Date()) {
      const result = await database.$transaction(async (tx) => {
        const current = await tx.proposal.findFirst({ where: { id, ownerUserId } });
        if (!current) return { status: "not_found" } as const;
        if (current.version !== expectedVersion) return { status: "conflict" } as const;
        const next = ProposalDraftResponseSchema.parse({ id, version: expectedVersion + 1, proposal: { ...proposalObject(current.proposalJson), ...proposal }, assignmentVersionId: current.assignmentVersionId, updatedAt: now.toISOString() });
        const changed = await tx.proposal.updateMany({ where: { id, ownerUserId, version: expectedVersion }, data: { version: next.version, proposalJson: next.proposal as Prisma.InputJsonValue, updatedAt: now } });
        if (!changed.count) return { status: "conflict" } as const;
        await addRevision(tx, id, next.version, next.proposal, now);
        return { status: "updated", proposal: next } as const;
      });
      return result.status === "updated" ? { ...result, proposal: await draftResponse({ id, version: result.proposal.version, proposalJson: result.proposal.proposal, assignmentVersionId: result.proposal.assignmentVersionId ?? null, updatedAt: new Date(result.proposal.updatedAt) }) } : result;
    },
    async updateProposal(id: string, ownerHash: string, expectedVersion: number, proposal: UpdateProposalRequest, now = new Date()) {
      return database.$transaction(async (tx) => {
        const next = ProposalResponseSchema.parse({ id, version: expectedVersion + 1, proposal: withoutExpectedVersion(proposal), updatedAt: now.toISOString() });
        const changed = await tx.proposal.updateMany({ where: { id, ownerHash, version: expectedVersion }, data: { version: next.version, proposalJson: next.proposal as Prisma.InputJsonValue, updatedAt: now } });
        if (!changed.count) return await tx.proposal.findFirst({ where: { id, ownerHash } }) ? { status: "conflict" } as const : { status: "not_found" } as const;
        await addRevision(tx, id, next.version, next.proposal, now);
        return { status: "updated", proposal: next } as const;
      });
    },
    async updateProposalByUser(id: string, ownerUserId: string, expectedVersion: number, proposal: UpdateProposalRequest, now = new Date()) {
      return database.$transaction(async (tx) => {
        const next = ProposalResponseSchema.parse({ id, version: expectedVersion + 1, proposal: withoutExpectedVersion(proposal), updatedAt: now.toISOString() });
        const changed = await tx.proposal.updateMany({ where: { id, ownerUserId, version: expectedVersion }, data: { version: next.version, proposalJson: next.proposal as Prisma.InputJsonValue, updatedAt: now } });
        if (!changed.count) return await tx.proposal.findFirst({ where: { id, ownerUserId } }) ? { status: "conflict" } as const : { status: "not_found" } as const;
        await addRevision(tx, id, next.version, next.proposal, now);
        return { status: "updated", proposal: next } as const;
      });
    },
    async getProposalHistory(id: string, ownerHash: string): Promise<ProposalResponse[] | null> {
      if (!await ownedByHash(id, ownerHash)) return null;
      const rows = await database.proposalRevision.findMany({ where: { proposalId: id }, orderBy: { version: "asc" } });
      return rows.map((row) => ProposalResponseSchema.parse({ id: row.proposalId, version: row.version, proposal: row.proposalJson, updatedAt: row.updatedAt.toISOString() }));
    },
    async getProposalHistoryByUser(id: string, ownerUserId: string): Promise<ProposalDraftResponse[] | null> {
      const owned = await ownedByUser(id, ownerUserId); if (!owned) return null;
      const assignmentContext = await loadProposalAssignmentContext(database, owned.assignmentVersionId);
      const rows = await database.proposalRevision.findMany({ where: { proposalId: id }, orderBy: { version: "asc" } });
      return rows.map((row) => ProposalDraftResponseSchema.parse({ id: row.proposalId, version: row.version, proposal: row.proposalJson, assignmentVersionId: owned.assignmentVersionId,
        ...(assignmentContext ? { assignmentContext } : {}), updatedAt: row.updatedAt.toISOString() }));
    },
    async setGalleryOptIn(id: string, ownerHash: string, optedIn: boolean, now = new Date()): Promise<{ status: "updated" | "not_found" }> {
      const proposal = await ownedByHash(id, ownerHash); if (!proposal) return { status: "not_found" };
      await database.mentorGalleryOptIn.upsert({ where: { proposalId: id }, create: { proposalId: id, proposalVersion: proposal.version, optedIn, updatedAt: now },
        update: { proposalVersion: proposal.version, optedIn, updatedAt: now } });
      return { status: "updated" };
    },
    async listGallery(): Promise<GalleryEntry[]> {
      const publications = await database.mentorAcademicPublication.findMany({ where: {
        evaluation: { proposalId: { not: "" } },
      }, include: { revision: { include: { proposal: { include: { owner: { include: { accounts: true } }, moderation: true } } } }, evaluation: true }, orderBy: { publishedAt: "desc" }, take: 1000 });
      const seen = new Set<string>(); const entries: GalleryEntry[] = [];
      for (const publication of publications) {
        const proposal = publication.revision.proposal; const owner = proposal.owner; const evaluation = publication.evaluation;
        if (seen.has(proposal.id) || !proposal.ownerUserId || !owner?.githubLogin || !owner.accounts.some((account) => account.providerId === "github") || proposal.moderation) continue;
        if (evaluation.proposalId !== proposal.id || evaluation.proposalVersion !== publication.proposalVersion || evaluation.contextVersion !== publication.contextVersion) continue;
        const value = proposalObject(publication.revision.proposalJson); const title = typeof value.title === "string" ? value.title : "";
        const solution = typeof value.solution === "string" ? value.solution : ""; const skills = Array.isArray(value.skills) ? value.skills.filter((item): item is string => typeof item === "string") : [];
        const tags = Array.isArray(value.tags) ? value.tags.filter((item): item is string => typeof item === "string") : [];
        entries.push({ id: proposal.id, title, summary: solution.slice(0, 500), skills, tags }); seen.add(proposal.id);
      }
      return entries;
    },
    async saveEvaluation(id: string, proposalId: string, proposalVersion: number, evaluation: MentorEvaluation, inputDigest?: string, contextVersion?: number, evaluatedAt = new Date()): Promise<void> {
      await database.$transaction(async (tx) => {
        if (inputDigest && contextVersion !== undefined) {
          await tx.mentorEvaluation.createMany({ data: [{ id, proposalId, proposalVersion, evaluationJson: evaluation as unknown as Prisma.InputJsonValue,
            evaluatedAt, inputDigest, contextVersion }], skipDuplicates: true });
          const persisted = await tx.mentorEvaluation.findFirst({ where: { proposalId, proposalVersion, inputDigest, contextVersion }, orderBy: [{ evaluatedAt: "asc" }, { id: "asc" }] });
          if (!persisted) return;
          const proposal = await tx.proposal.findFirst({ where: { id: proposalId, ownerUserId: { not: null }, owner: { is: { githubLogin: { not: null }, accounts: { some: { providerId: "github" } } } } }, select: { id: true } });
          const revision = await tx.proposalRevision.findUnique({ where: { proposalId_version: { proposalId, version: proposalVersion } }, select: { proposalId: true } });
          const context = await tx.mentorControlVersion.findUnique({ where: { version: contextVersion }, select: { version: true } });
          if (proposal && revision && context) await tx.mentorAcademicPublication.upsert({ where: { proposalId_proposalVersion: { proposalId, proposalVersion } },
            create: { proposalId, proposalVersion, evaluationId: persisted.id, contextVersion, rubricVersion: `mentor-rubric-v${contextVersion}`, publishedAt: evaluatedAt },
            update: {} });
          return;
        }
        await tx.mentorEvaluation.create({ data: { id, proposalId, proposalVersion, evaluationJson: evaluation as unknown as Prisma.InputJsonValue, evaluatedAt, inputDigest: inputDigest ?? null, contextVersion: contextVersion ?? null } });
      });
    },
    async getCachedEvaluation(proposalId: string, proposalVersion: number, inputDigest: string, contextVersion: number) {
      const row = await database.mentorEvaluation.findFirst({ where: { proposalId, proposalVersion, inputDigest, contextVersion } });
      return row ? { id: row.id, evaluation: row.evaluationJson as MentorEvaluation, evaluatedAt: row.evaluatedAt.toISOString() } : null;
    },
    async getEvaluation(id: string, proposalId: string, proposalVersion: number): Promise<MentorEvaluation | null> {
      const row = await database.mentorEvaluation.findFirst({ where: { id, proposalId, proposalVersion } }); return row ? row.evaluationJson as MentorEvaluation : null;
    },
    async getLatestEvaluation(proposalId: string, proposalVersion: number) {
      const row = await database.mentorEvaluation.findFirst({ where: { proposalId, proposalVersion }, orderBy: [{ evaluatedAt: "desc" }, { id: "desc" }] });
      return row ? { id: row.id, evaluation: row.evaluationJson as MentorEvaluation, evaluatedAt: row.evaluatedAt.toISOString() } : null;
    },
    async saveSubmission(id: string, value: SubmissionSnapshot): Promise<void> {
      const snapshot = SubmissionSnapshotSchema.parse(value);
      await database.submission.create({ data: { id, kind: snapshot.kind, sourceId: snapshot.sourceId, score: snapshot.score, snapshotJson: snapshot.snapshotJson as Prisma.InputJsonValue,
        contentHash: snapshot.contentHash, verificationCode: snapshot.verificationCode, rubricVersion: snapshot.rubricVersion, createdAt: new Date(snapshot.createdAt) } });
    },
    async getSubmission(id: string): Promise<{ id: string; snapshot: SubmissionSnapshot } | null> {
      const row = await database.submission.findUnique({ where: { id } }); return row ? { id: row.id, snapshot: parseSubmission(row) } : null;
    },
    async getSubmissionByCode(code: string): Promise<SubmissionSnapshot | null> {
      const row = await database.submission.findUnique({ where: { verificationCode: code } }); return row ? parseSubmission(row) : null;
    },
  };
}
