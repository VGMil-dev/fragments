import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";

export type AdminTeacherCursor = { accountId: string; createdAt: string };
export type AdminTeacherRow = { id: string; name: string; email: string; createdAt: Date };
export type AdminTeacherRepositoryQuery = { limit: number; after?: AdminTeacherCursor };
export type AdminTeacherRepositoryPage = { items: AdminTeacherRow[]; hasMore: boolean };
export type AdminTeacherRepository = { listPage(query: AdminTeacherRepositoryQuery): Promise<AdminTeacherRepositoryPage> };

/** Reads only teacher account fields. Admin accounts are excluded even if a malformed row is also marked as a teacher. */
export function createAdminTeachersRepository(database: Pick<PrismaClient, "user">): AdminTeacherRepository {
  return {
    async listPage(query): Promise<AdminTeacherRepositoryPage> {
      const conditions: Prisma.UserWhereInput[] = [
        { isTeacher: true },
        { OR: [
          { role: null },
          { NOT: [
            { role: "admin" },
            { role: { startsWith: "admin," } },
            { role: { contains: ",admin," } },
            { role: { endsWith: ",admin" } },
          ] },
        ] },
      ];
      if (query.after) {
        const createdAt = new Date(query.after.createdAt);
        conditions.push({
          OR: [
            { createdAt: { lt: createdAt } },
            { createdAt, id: { lt: query.after.accountId } },
          ],
        });
      }

      const rows = await database.user.findMany({
        where: { AND: conditions },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: query.limit + 1,
        select: { id: true, name: true, email: true, createdAt: true },
      });
      return { items: rows.slice(0, query.limit), hasMore: rows.length > query.limit };
    },
  };
}
