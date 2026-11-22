import {
  AcademicGalleryDetailSchema, AcademicGalleryEntrySchema, AcademicGalleryPageSchema,
  CreateProposalRequestSchema, HistoricalProjectsResponseSchema, TeacherProjectsResponseSchema,
  TeacherStudentsPageSchema,
} from "@fragments/contracts";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { loadProposalAssignmentContext } from "../assignments/proposal-context.js";

const studentWhere = { isTeacher: false, OR: [{ role: null }, { role: { not: { contains: "admin" } } }], accounts: { some: { providerId: "github" } } };
function avatar(value: string | null): string | null {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && url.hostname === "avatars.githubusercontent.com" ? url.toString() : null; } catch { return null; }
}
function parseJson(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }

export function createPrismaAcademicRepository(database: PrismaClient) {
  const entry = async (publication: any) => {
    const proposal = parseJson(publication.revision.proposalJson);
    const context = parseJson(publication.context.configJson);
    const login = publication.revision.proposal.owner?.githubLogin;
    if (typeof login !== "string" || !/^[A-Za-z0-9-]{1,39}$/.test(login)) return null;
    return AcademicGalleryEntrySchema.parse({
      id: publication.proposalId, title: proposal.title,
      summary: typeof proposal.solution === "string" ? proposal.solution.slice(0, 500) : "",
      problem: proposal.problem, solution: proposal.solution, goals: proposal.goals, skills: proposal.skills,
      tags: Array.isArray(proposal.tags) ? proposal.tags.slice(0, 20) : [], scope: proposal.scope, constraints: proposal.constraints,
      author: { login, profileUrl: `https://github.com/${login}`, avatarUrl: avatar(publication.revision.proposal.owner.image) },
      subject: context.subject, theme: context.theme, assignment: context.assignment,
      proposalVersion: publication.proposalVersion, rubricVersion: publication.contextVersion,
      rubricTitle: context.rubricTitle, publishedAt: publication.publishedAt.toISOString(), academicStatus: "Evaluada",
    });
  };
  const publications = (proposalId?: string) => database.mentorAcademicPublication.findMany({
    where: {
      ...(proposalId ? { proposalId } : {}),
      revision: { proposal: { ownerUserId: { not: null }, moderation: null, owner: { is: { accounts: { some: { providerId: "github" } } } } } },
      evaluation: { proposalId: { not: "" } },
    },
    include: {
      revision: { include: { proposal: { include: { owner: true } } } },
      context: true,
      evaluation: true,
    },
    orderBy: [{ proposalId: "asc" }, { proposalVersion: "desc" }], take: 1000,
  }).then(rows => rows.filter(row => row.evaluation.proposalId === row.proposalId
    && row.evaluation.proposalVersion === row.proposalVersion
    && row.evaluation.contextVersion === row.contextVersion));
  return {
    async isGitHubStudent(userId: string) { return Boolean(await database.user.findFirst({ where: { id: userId, ...studentWhere }, select: { id: true } })); },
    async listGallery(offset = 0, limit = 20) {
      const safeOffset = Math.max(0, Math.trunc(offset)), safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
      const rows = await publications();
      const latest = new Map<string, typeof rows[number]>();
      for (const row of rows) if (!latest.has(row.proposalId)) latest.set(row.proposalId, row);
      const eligible = await Promise.all([...latest.values()].map(entry));
      const items = eligible.filter((item): item is NonNullable<typeof item> => item !== null).sort((a,b) => b.publishedAt.localeCompare(a.publishedAt) || a.id.localeCompare(b.id));
      const page = items.slice(safeOffset, safeOffset + safeLimit + 1);
      return AcademicGalleryPageSchema.parse({ items: page.slice(0, safeLimit), nextOffset: page.length > safeLimit ? safeOffset + safeLimit : null });
    },
    async getGalleryDetail(projectId: string) {
      const rows = await publications(projectId); const history = (await Promise.all(rows.map(entry))).filter((item): item is NonNullable<typeof item> => item !== null);
      if (!history.length) return null;
      return AcademicGalleryDetailSchema.parse({ project: history[0], history });
    },
    async listOwnedProposals(ownerUserId: string) {
      const rows = await database.proposal.findMany({ where: { ownerUserId }, orderBy: { updatedAt: "desc" }, take: 200 });
      return Promise.all(rows.map(async row => ({ id: row.id, version: row.version, proposal: row.proposalJson, assignmentVersionId: row.assignmentVersionId,
        assignmentContext: await loadProposalAssignmentContext(database, row.assignmentVersionId), updatedAt: row.updatedAt.toISOString() })));
    },
    async listStudents(offset = 0, limit = 20) {
      const safeOffset = Math.max(0, Math.trunc(offset)), safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
      const rows = await database.user.findMany({ where: studentWhere, include: { accounts: { where: { providerId: "github" }, take: 1 } }, orderBy: [{ createdAt: "desc" }, { id: "asc" }], skip: safeOffset, take: safeLimit + 1 });
      const items = await Promise.all(rows.slice(0, safeLimit).map(async row => {
        const login = row.githubLogin; if (!login || !/^[A-Za-z0-9-]{1,39}$/.test(login)) return null;
        return { id: row.id, githubLogin: login, avatarUrl: avatar(row.image), profileUrl: `https://github.com/${login}`, registeredAt: row.createdAt.toISOString(), projectCount: await database.proposal.count({ where: { ownerUserId: row.id } }) };
      }));
      return TeacherStudentsPageSchema.parse({ items: items.filter(Boolean), nextOffset: rows.length > safeLimit ? safeOffset + safeLimit : null });
    },
    async listStudentProjects(userId: string) {
      const rows = await database.proposal.findMany({ where: { ownerUserId: userId }, include: { owner: true, moderation: true, revisions: { include: { publication: { include: { context: true } } }, orderBy: { version: "desc" } } }, orderBy: { updatedAt: "desc" }, take: 200 });
      const result = rows.map(row => {
        const history = row.revisions.flatMap(revision => {
          const parsed = CreateProposalRequestSchema.safeParse(revision.proposalJson); if (!parsed.success) return [];
          const { mentorSkills: _privateClassroomSelection, ...teacherProposal } = parsed.data;
          const context = parseJson(revision.publication?.context.configJson);
          return [{ version: revision.version, updatedAt: revision.updatedAt.toISOString(), proposal: teacherProposal, published: Boolean(revision.publication), contextVersion: revision.publication?.contextVersion ?? null, subject: context.subject ?? null, theme: context.theme ?? null, rubricTitle: context.rubricTitle ?? null }];
        });
        return history.length ? { id: row.id, title: history[0]!.proposal.title, ownerGithubLogin: row.owner?.githubLogin ?? null, currentVersion: row.version, withdrawn: Boolean(row.moderation), withdrawalReason: row.moderation?.reason ?? null, withdrawnAt: row.moderation?.withdrawnAt.toISOString() ?? null, history } : null;
      }).filter(Boolean);
      return TeacherProjectsResponseSchema.parse(result);
    },
    async listHistoricalProjects() {
      const rows = await database.proposal.findMany({ where: { ownerUserId: null }, orderBy: { updatedAt: "desc" }, take: 200 });
      return HistoricalProjectsResponseSchema.parse(rows.map(row => ({ id: row.id, title: String(parseJson(row.proposalJson).title ?? ""), currentVersion: row.version, updatedAt: row.updatedAt.toISOString() })));
    },
    async withdrawProject(projectId: string, teacherId: string, reason: string, now = new Date()) {
      return database.$transaction(async tx => {
        if (!await tx.mentorAcademicPublication.findFirst({ where: { proposalId: projectId }, select: { proposalId: true } })) return false;
        try { await tx.mentorAcademicProjectModeration.create({ data: { proposalId: projectId, withdrawnBy: teacherId, reason, withdrawnAt: now } }); return true; }
        catch (error) { if ((error as { code?: string }).code === "P2002") return false; throw error; }
      });
    },
    async claimHistoricalProject(projectId: string, ownerHash: string, ownerUserId: string): Promise<"claimed" | "not_found" | "conflict"> {
      return database.$transaction(async tx => {
        const changed = await tx.proposal.updateMany({ where: { id: projectId, ownerHash, ownerUserId: null }, data: { ownerUserId } });
        if (changed.count === 1) return "claimed";
        return await tx.proposal.findFirst({ where: { id: projectId, ownerHash }, select: { id: true } }) ? "conflict" : "not_found";
      });
    },
  };
}
