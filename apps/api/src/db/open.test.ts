import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { openDatabase } from "./open.js";
import { QueueRepository } from "../queue/repository.js";

let directory = "";
afterEach(() => { if (directory) rmSync(directory, { recursive: true, force: true }); directory = ""; });

describe("SQLite platform", () => {
  it("opens a WAL database, applies migrations idempotently and serializes leases across connections", () => {
    directory = mkdtempSync(join(tmpdir(), "fragments-api-"));
    const path = join(directory, "data.sqlite");
    const firstDb = openDatabase(path);
    const secondDb = openDatabase(path);
    try {
      expect(firstDb.prepare("PRAGMA journal_mode").get()?.journal_mode).toBe("wal");
      expect(firstDb.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get()?.count).toBe(5);
      expect(secondDb.prepare("SELECT COUNT(*) AS count FROM schema_migrations").get()?.count).toBe(5);
      expect(firstDb.prepare("PRAGMA table_info(proposals)").all().some((column) => column.name === "owner_hash")).toBe(true);
      expect(firstDb.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='ai_budget_reservations'").get()?.name).toBe("ai_budget_reservations");
      const first = new QueueRepository(firstDb); const second = new QueueRepository(secondDb);
      const job = first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: "cross-connection" });
      expect(first.claim("worker-a", 1000, 10)?.id).toBe(job.id);
      expect(second.claim("worker-b", 1000, 10)).toBeNull();
      expect(second.claim("worker-b", 1011, 10)?.id).toBe(job.id);
    } finally { firstDb.close(); secondDb.close(); }
  });
});
