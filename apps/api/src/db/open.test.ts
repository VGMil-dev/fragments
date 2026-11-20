import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { openDatabase } from "./open.js";
import type { PrismaClient } from "../generated/prisma/client.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para verificar PostgreSQL y Prisma.");
const describePostgres = databaseUrl ? describe : describe.skip;
let database: PrismaClient;

describePostgres("PostgreSQL platform", () => {
  beforeAll(async () => {
    database = openDatabase(databaseUrl!);
    await database.$connect();
  });
  afterAll(async () => { await database?.$disconnect(); });

  it("connects through Prisma and confirms the versioned schema is applied", async () => {
    const rows = await database.$queryRaw<Array<{ value: number }>>`SELECT 1 AS value`;
    expect(Number(rows[0]?.value)).toBe(1);

    const migration = await database.$queryRaw<Array<{ migration_name: string }>>`
      SELECT migration_name FROM _prisma_migrations
      WHERE migration_name = '20261120190000_init' AND finished_at IS NOT NULL
    `;
    expect(migration).toHaveLength(1);

    const tables = await database.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = current_schema() AND table_name IN ('jobs', 'trainer_banks', 'mentor_control_versions')
    `;
    expect(new Set(tables.map((table) => table.table_name))).toEqual(new Set(["jobs", "mentor_control_versions", "trainer_banks"]));
  });
});
