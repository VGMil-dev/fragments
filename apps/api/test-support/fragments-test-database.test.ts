import { describe, expect, it, vi } from "vitest";
import { assertIsFragmentsTest } from "./fragments-test-database.js";
import type { PrismaClient } from "../src/generated/prisma/client.js";

describe("assertIsFragmentsTest", () => {
  it("rejects a remote fragments_test URL before connecting or querying", async () => {
    const database = {
      $connect: vi.fn(async () => undefined),
      $disconnect: vi.fn(async () => undefined),
      $queryRaw: vi.fn(async () => [{ name: "fragments_test" }]),
    } as unknown as Pick<PrismaClient, "$connect" | "$disconnect" | "$queryRaw">;

    await expect(assertIsFragmentsTest(database, "postgresql://user:password@db.example.test:5432/fragments_test"))
      .rejects.toThrow("solo admite una URL local dirigida a fragments_test");
    expect(database.$connect).not.toHaveBeenCalled();
    expect(database.$queryRaw).not.toHaveBeenCalled();
  });

  it("checks the live database name after connecting to a local test URL", async () => {
    const database = {
      $connect: vi.fn(async () => undefined),
      $disconnect: vi.fn(async () => undefined),
      $queryRaw: vi.fn(async () => [{ name: "other_db" }]),
    } as unknown as Pick<PrismaClient, "$connect" | "$disconnect" | "$queryRaw">;

    await expect(assertIsFragmentsTest(database, "postgresql://user:password@127.0.0.1:5432/fragments_test"))
      .rejects.toThrow("solo puede ejecutarse en fragments_test");
    expect(database.$connect).toHaveBeenCalledOnce();
    expect(database.$queryRaw).toHaveBeenCalledOnce();
    expect(database.$disconnect).toHaveBeenCalledOnce();
  });
});
