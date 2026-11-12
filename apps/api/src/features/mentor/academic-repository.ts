import type { DatabaseSync } from "node:sqlite";
import {
  AcademicGalleryDetailSchema,
  AcademicGalleryEntrySchema,
  AcademicGalleryPageSchema,
  HistoricalProjectsResponseSchema,
  TeacherProjectsResponseSchema,
  TeacherStudentsPageSchema,
  type AcademicGalleryEntry,
} from "@fragments/contracts";

const projectEntrySql = `SELECT p.id, r.proposal_version, pr.proposal_json, r.published_at,
    e.context_version, v.config_json, u.githubLogin, u.image
  FROM mentor_academic_publications r
  JOIN proposal_revisions pr ON pr.proposal_id = r.proposal_id AND pr.version = r.proposal_version
  JOIN proposals p ON p.id = r.proposal_id AND p.owner_user_id IS NOT NULL
  JOIN mentor_evaluations e ON e.id = r.evaluation_id AND e.proposal_id = r.proposal_id
    AND e.proposal_version = r.proposal_version AND e.context_version = r.context_version
  JOIN mentor_control_versions v ON v.version = r.context_version
  JOIN user u ON u.id = p.owner_user_id
  JOIN account a ON a.userId = u.id AND a.providerId = 'github'
  WHERE NOT EXISTS (SELECT 1 FROM mentor_academic_project_moderation m WHERE m.proposal_id = p.id)`;

export function createAcademicRepository(database: DatabaseSync) {
  function readEntry(row: AcademicRow): AcademicGalleryEntry | null {
    if (typeof row.githubLogin !== "string" || !/^[A-Za-z0-9-]{1,39}$/.test(row.githubLogin)) return null;
    const proposal = JSON.parse(row.proposal_json) as Record<string, unknown>;
    const context = JSON.parse(row.config_json) as Record<string, unknown>;
    const publishedAt = row.published_at;
    return AcademicGalleryEntrySchema.parse({
      id: row.id,
      title: proposal.title,
      summary: typeof proposal.solution === "string" ? proposal.solution.slice(0, 500) : "",
      problem: proposal.problem,
      solution: proposal.solution,
      goals: proposal.goals,
      skills: proposal.skills,
      tags: Array.isArray(proposal.tags) ? (proposal.tags as string[]).slice(0, 20) : [],
      scope: proposal.scope,
      constraints: proposal.constraints,
      author: { login: row.githubLogin, profileUrl: `https://github.com/${row.githubLogin}`, avatarUrl: safeGitHubAvatar(row.image) },
      subject: context.subject,
      theme: context.theme,
      assignment: context.assignment,
      proposalVersion: row.proposal_version,
      rubricVersion: row.context_version,
      rubricTitle: context.rubricTitle,
      publishedAt,
      academicStatus: "Evaluada",
    });
  }

  function rowsForProject(projectId: string): AcademicGalleryEntry[] {
    const rows = database.prepare(`${projectEntrySql} AND p.id = ? ORDER BY r.proposal_version DESC LIMIT 200`)
      .all(projectId) as AcademicRow[];
    return rows.map(readEntry).filter((entry): entry is AcademicGalleryEntry => entry !== null);
  }

  return {
    isGitHubStudent(userId: string): boolean {
      return Boolean(database.prepare(`SELECT 1 FROM user u JOIN account a ON a.userId = u.id AND a.providerId = 'github'
        WHERE u.id = ? AND COALESCE(u.isTeacher, 0) = 0 AND COALESCE(u.role, 'user') NOT LIKE '%admin%'`).get(userId));
    },

    listGallery(offset = 0, limit = 20) {
      const safeOffset = Math.max(0, Math.trunc(offset));
      const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
      const rows = database.prepare(`SELECT * FROM (
          SELECT eligible.*, ROW_NUMBER() OVER (PARTITION BY eligible.id ORDER BY eligible.proposal_version DESC) AS position
          FROM (${projectEntrySql} AND p.id IN (
            SELECT proposal_id FROM mentor_academic_publications GROUP BY proposal_id
          )) eligible
        ) WHERE position = 1 ORDER BY published_at DESC, id ASC LIMIT ? OFFSET ?`)
        .all(safeLimit + 1, safeOffset) as AcademicRow[];
      const items = rows.slice(0, safeLimit).map(readEntry).filter((entry): entry is AcademicGalleryEntry => entry !== null);
      return AcademicGalleryPageSchema.parse({ items, nextOffset: rows.length > safeLimit ? safeOffset + safeLimit : null });
    },

    getGalleryDetail(projectId: string) {
      const history = rowsForProject(projectId);
      if (history.length === 0) return null;
      return AcademicGalleryDetailSchema.parse({ project: history[0], history });
    },

    listOwnedProposals(ownerUserId: string) {
      const rows = database.prepare(`SELECT id, version, proposal_json, updated_at FROM proposals WHERE owner_user_id = ? ORDER BY updated_at DESC LIMIT 200`)
        .all(ownerUserId) as Array<{ id: string; version: number; proposal_json: string; updated_at: string }>;
      return rows.map((row) => ({ id: row.id, version: row.version, proposal: JSON.parse(row.proposal_json), updatedAt: row.updated_at }));
    },

    listStudents(offset = 0, limit = 20) {
      const safeOffset = Math.max(0, Math.trunc(offset));
      const safeLimit = Math.max(1, Math.min(50, Math.trunc(limit)));
      const rows = database.prepare(`SELECT u.id, u.githubLogin, u.image, u.createdAt,
          (SELECT COUNT(*) FROM proposals p WHERE p.owner_user_id = u.id) AS projectCount
        FROM user u JOIN account a ON a.userId = u.id AND a.providerId = 'github'
        WHERE COALESCE(u.isTeacher, 0) = 0 AND COALESCE(u.role, 'user') NOT LIKE '%admin%'
        ORDER BY u.createdAt DESC, u.id LIMIT ? OFFSET ?`).all(safeLimit + 1, safeOffset) as Array<{
        id: string; githubLogin: string | null; image: string | null; createdAt: string | Date; projectCount: number;
      }>;
      const items = rows.slice(0, safeLimit).flatMap((row) => {
        if (!row.githubLogin || !/^[A-Za-z0-9-]{1,39}$/.test(row.githubLogin)) return [];
        const registeredAt = row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt;
        return [{ id: row.id, githubLogin: row.githubLogin, avatarUrl: safeGitHubAvatar(row.image), profileUrl: `https://github.com/${row.githubLogin}`, registeredAt, projectCount: Number(row.projectCount) }];
      });
      return TeacherStudentsPageSchema.parse({ items, nextOffset: rows.length > safeLimit ? safeOffset + safeLimit : null });
    },

    listStudentProjects(userId: string) {
      const rows = database.prepare(`SELECT p.id, p.version, p.proposal_json, u.githubLogin, m.reason, m.withdrawn_at
        FROM proposals p LEFT JOIN user u ON u.id = p.owner_user_id
        LEFT JOIN mentor_academic_project_moderation m ON m.proposal_id = p.id
        WHERE p.owner_user_id = ? ORDER BY p.updated_at DESC LIMIT 200`)
        .all(userId) as Array<{ id: string; version: number; proposal_json: string; githubLogin: string | null; reason: string | null; withdrawn_at: string | null }>;
      const history = database.prepare(`SELECT r.version, r.updated_at, r.proposal_json,
          ap.proposal_id IS NOT NULL AS published, ap.context_version, v.config_json
        FROM proposal_revisions r
        LEFT JOIN mentor_academic_publications ap ON ap.proposal_id = r.proposal_id AND ap.proposal_version = r.version
        LEFT JOIN mentor_control_versions v ON v.version = ap.context_version
        WHERE r.proposal_id = ? ORDER BY r.version DESC`);
      return TeacherProjectsResponseSchema.parse(rows.map((row) => ({
        id: row.id,
        title: (JSON.parse(row.proposal_json) as { title: string }).title,
        ownerGithubLogin: row.githubLogin,
        currentVersion: row.version,
        withdrawn: row.withdrawn_at !== null,
        withdrawalReason: row.reason,
        withdrawnAt: row.withdrawn_at,
        history: (history.all(row.id) as Array<{ version: number; updated_at: string; proposal_json: string; published: number; context_version: number | null; config_json: string | null }>)
          .map((revision) => {
            const context = revision.config_json ? JSON.parse(revision.config_json) as { subject?: string; theme?: string; rubricTitle?: string } : null;
            return { version: revision.version, updatedAt: revision.updated_at, proposal: JSON.parse(revision.proposal_json), published: Boolean(revision.published),
              contextVersion: revision.context_version, subject: context?.subject ?? null, theme: context?.theme ?? null, rubricTitle: context?.rubricTitle ?? null };
          }),
      })));
    },

    listHistoricalProjects() {
      const rows = database.prepare(`SELECT id, version, proposal_json, updated_at FROM proposals WHERE owner_user_id IS NULL ORDER BY updated_at DESC LIMIT 200`).all() as
        Array<{ id: string; version: number; proposal_json: string; updated_at: string }>;
      return HistoricalProjectsResponseSchema.parse(rows.map((row) => ({ id: row.id, title: (JSON.parse(row.proposal_json) as { title: string }).title, currentVersion: row.version, updatedAt: row.updated_at })));
    },

    withdrawProject(projectId: string, teacherId: string, reason: string, now = new Date()): boolean {
      database.exec("BEGIN IMMEDIATE");
      try {
        const exists = database.prepare("SELECT 1 FROM mentor_academic_publications WHERE proposal_id = ? LIMIT 1").get(projectId);
        if (!exists) { database.exec("ROLLBACK"); return false; }
        const result = database.prepare(`INSERT OR IGNORE INTO mentor_academic_project_moderation(proposal_id, withdrawn_by, reason, withdrawn_at)
          VALUES (?, ?, ?, ?)`)
          .run(projectId, teacherId, reason, now.toISOString());
        database.exec("COMMIT");
        return Number(result.changes) === 1;
      } catch (error) { database.exec("ROLLBACK"); throw error; }
    },

    claimHistoricalProject(projectId: string, ownerHash: string, ownerUserId: string): "claimed" | "not_found" | "conflict" {
      database.exec("BEGIN IMMEDIATE");
      try {
        const result = database.prepare(`UPDATE proposals SET owner_user_id = ? WHERE id = ? AND owner_hash = ? AND owner_user_id IS NULL`)
          .run(ownerUserId, projectId, ownerHash);
        if (Number(result.changes) === 1) { database.exec("COMMIT"); return "claimed"; }
        const exists = database.prepare("SELECT 1 FROM proposals WHERE id = ? AND owner_hash = ?").get(projectId, ownerHash);
        database.exec("ROLLBACK");
        return exists ? "conflict" : "not_found";
      } catch (error) { database.exec("ROLLBACK"); throw error; }
    },
  };
}

function safeGitHubAvatar(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === "avatars.githubusercontent.com" ? url.toString() : null;
  } catch { return null; }
}

type AcademicRow = {
  id: string; proposal_version: number; proposal_json: string; published_at: string; context_version: number;
  config_json: string; githubLogin: string | null; image: string | null;
};
