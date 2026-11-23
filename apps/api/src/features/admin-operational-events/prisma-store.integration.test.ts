import { randomUUID } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "../../generated/prisma/client.js";
import { openDatabase } from "../../db/open.js";
import { createPrismaMentorOperationalLog } from "./prisma-store.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.CI && !databaseUrl) throw new Error("CI requiere DATABASE_URL para la integración F22.13.");
const describeDatabase = databaseUrl ? describe : describe.skip;
const fixtureId = `f22-13-${randomUUID()}`;
const fixtureEvent = {
  event: "mentor_evaluation_completed", stage: "evaluation", result: "success", error_code: "none", duration_ms: 9,
  occurred_at: "2026-11-23T08:00:00.000Z",
} as const;
let database: PrismaClient | undefined;

describeDatabase("F22.13 Prisma operational event persistence · PostgreSQL", () => {
  it("reads a redacted Mentor event after persisting it in fragments_test", async () => {
    const configured = new URL(databaseUrl!);
    if (configured.pathname !== "/fragments_test" || !["localhost", "127.0.0.1", "::1"].includes(configured.hostname)) {
      throw new Error("La integración F22.13 solo admite una URL local dirigida a fragments_test.");
    }
    database = openDatabase(databaseUrl!);
    await database.$connect();
    const [{ name }] = await database.$queryRaw<Array<{ name: string }>>`SELECT current_database() AS name`;
    if (name !== "fragments_test") {
      await database.$disconnect();
      database = undefined;
      throw new Error("F22.13 solo puede escribir en la base aislada fragments_test.");
    }

    try {
      const log = createPrismaMentorOperationalLog(database, { id: () => fixtureId });
      log.record({ ...fixtureEvent, privatePrompt: "must-not-persist" });
      await vi.waitFor(async () => expect(await createPrismaMentorOperationalLog(database!).list(1)).toEqual([fixtureEvent]));
      const row = await database.operationalEvent.findUnique({ where: { id: fixtureId } });
      expect(row?.source).toBe("mentor");
      expect(row?.eventJson).not.toHaveProperty("privatePrompt");
    } finally {
      await database.operationalEvent.deleteMany({ where: { id: fixtureId } });
      await database.$disconnect();
      database = undefined;
    }
  });
});
