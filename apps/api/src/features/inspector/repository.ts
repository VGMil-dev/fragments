import type { PrismaClient } from "../../generated/prisma/client.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { InspectorRecord, InspectorStore } from "./service.js";

function fromRow(row: {
  id: string; aiOperationKey: string | null; reviewId: string; projectId: string; commitSha: string;
  challengeJson: unknown; status: string; createdAt: Date; assignedTo: string | null;
  assignedAt: Date | null; supersededByCommitSha: string | null; defenseJson: unknown;
}): InspectorRecord {
  return {
    id: row.id,
    ...(row.aiOperationKey ? { aiOperationKey: row.aiOperationKey } : {}),
    reviewId: row.reviewId,
    projectId: row.projectId,
    commitSha: row.commitSha,
    challenge: row.challengeJson as InspectorRecord["challenge"],
    status: row.status as InspectorRecord["status"],
    createdAt: row.createdAt.toISOString(),
    ...(row.assignedTo ? { assignedTo: row.assignedTo } : {}),
    ...(row.assignedAt ? { assignedAt: row.assignedAt.toISOString() } : {}),
    ...(row.supersededByCommitSha ? { supersededByCommitSha: row.supersededByCommitSha } : {}),
    ...(row.defenseJson ? { defense: row.defenseJson as NonNullable<InspectorRecord["defense"]> } : {}),
  };
}

export function createInspectorRepository(database: PrismaClient): InspectorStore {
  const data = (record: InspectorRecord) => ({
    id: record.id,
    aiOperationKey: record.aiOperationKey ?? null,
    reviewId: record.reviewId,
    projectId: record.projectId,
    commitSha: record.commitSha,
    challengeJson: record.challenge as Prisma.InputJsonValue,
    status: record.status,
    createdAt: new Date(record.createdAt),
    assignedTo: record.assignedTo ?? null,
    assignedAt: record.assignedAt ? new Date(record.assignedAt) : null,
    supersededByCommitSha: record.supersededByCommitSha ?? null,
    defenseJson: record.defense ? record.defense as Prisma.InputJsonValue : Prisma.DbNull,
  });

  return {
    async create(record) {
      await database.inspectorChallenge.create({ data: data(record) });
      return record;
    },
    async get(id) {
      const row = await database.inspectorChallenge.findUnique({ where: { id } });
      return row ? fromRow(row) : null;
    },
    async listByReview(reviewId) {
      const rows = await database.inspectorChallenge.findMany({ where: { reviewId }, orderBy: { createdAt: "asc" } });
      return rows.map(fromRow);
    },
    async update(record) {
      const { id, ...update } = data(record);
      await database.inspectorChallenge.update({ where: { id }, data: update });
      return record;
    },
  };
}
