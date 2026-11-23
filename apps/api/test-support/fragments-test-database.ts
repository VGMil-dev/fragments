import type { PrismaClient } from "../src/generated/prisma/client.js";

type TestDatabaseClient = Pick<PrismaClient, "$connect" | "$disconnect" | "$queryRaw">;

/** Reject remote databases before opening a socket, then verify the connected DB name. */
export async function assertIsFragmentsTest(database: TestDatabaseClient, databaseUrl: string): Promise<void> {
  let configured: URL;
  try { configured = new URL(databaseUrl); }
  catch { throw new Error("La prueba PostgreSQL solo admite una URL local dirigida a fragments_test."); }

  const hostname = configured.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!["postgres:", "postgresql:"].includes(configured.protocol)
    || configured.pathname !== "/fragments_test"
    || !["localhost", "127.0.0.1", "::1"].includes(hostname)) {
    throw new Error("La prueba PostgreSQL solo admite una URL local dirigida a fragments_test.");
  }

  let connected = false;
  try {
    await database.$connect();
    connected = true;
    const [current] = await database.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (current?.name !== "fragments_test") throw new Error("La prueba PostgreSQL solo puede ejecutarse en fragments_test.");
  } catch (error) {
    if (connected) await database.$disconnect().catch(() => undefined);
    if (error instanceof Error && error.message === "La prueba PostgreSQL solo puede ejecutarse en fragments_test.") throw error;
    throw new Error("No se pudo verificar fragments_test; no se ejecutaron escrituras.");
  }
}

/** Delete only Review fixture rows whose job IDs were recorded by this test run. */
export async function cleanupReviewFixtureRows(database: PrismaClient, databaseUrl: string, jobIds: readonly string[]): Promise<void> {
  await assertIsFragmentsTest(database, databaseUrl);
  const ids = [...new Set(jobIds)];
  if (ids.length === 0) return;

  await database.submission.deleteMany({ where: { kind: "review", sourceId: { in: ids } } });
  await database.job.deleteMany({ where: { type: "review", id: { in: ids } } });
}
