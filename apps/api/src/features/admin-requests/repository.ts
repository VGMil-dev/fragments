import type { PrismaClient } from "../../generated/prisma/client.js";

export const adminEnrollmentStatuses = ["pending", "active", "rejected", "removed"] as const;
export type AdminEnrollmentStatus = (typeof adminEnrollmentStatuses)[number];
export type AdminRequestListQuery = { limit: number; offset: number; status?: AdminEnrollmentStatus };
export type AdminEnrollmentRequest = {
  requestId: string;
  classroomTitle: string;
  subject: string;
  period: string | null;
  status: AdminEnrollmentStatus;
  source: "join_code" | "teacher_assignment";
  requestedAt: string;
  decidedAt: string | null;
};
export type AdminEnrollmentRequestPage = { items: AdminEnrollmentRequest[]; total: number };

function isStatus(value: string): value is AdminEnrollmentStatus {
  return (adminEnrollmentStatuses as readonly string[]).includes(value);
}

export function createAdminClassroomRequestsRepository(database: PrismaClient) {
  return {
    async list(query: AdminRequestListQuery): Promise<AdminEnrollmentRequestPage> {
      const where = query.status ? { status: query.status } : {};
      const [rows, total] = await Promise.all([
        database.classEnrollment.findMany({
          where,
          orderBy: [{ requestedAt: "desc" }, { id: "desc" }],
          skip: query.offset,
          take: query.limit,
          select: {
            id: true,
            status: true,
            source: true,
            requestedAt: true,
            decidedAt: true,
            classroom: { select: { title: true, subject: true, period: true } },
          },
        }),
        database.classEnrollment.count({ where }),
      ]);
      return {
        items: rows.map((row) => {
          if (!isStatus(row.status) || (row.source !== "join_code" && row.source !== "teacher_assignment")) {
            throw new Error("Unsupported enrollment state");
          }
          return {
            requestId: row.id,
            classroomTitle: row.classroom.title,
            subject: row.classroom.subject,
            period: row.classroom.period,
            status: row.status,
            source: row.source,
            requestedAt: row.requestedAt.toISOString(),
            decidedAt: row.decidedAt?.toISOString() ?? null,
          };
        }),
        total,
      };
    },
  };
}
