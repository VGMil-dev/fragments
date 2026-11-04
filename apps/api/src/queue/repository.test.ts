import { DatabaseSync } from "node:sqlite";
import { afterEach, describe, expect, it } from "vitest";
import { migrate } from "../db/migrate.js";
import { QueueRepository } from "./repository.js";

const databases: DatabaseSync[] = [];
function queue(db = new DatabaseSync(":memory:")) {
  databases.push(db);
  migrate(db);
  return new QueueRepository(db);
}
afterEach(() => { for (const db of databases.splice(0)) db.close(); });

describe("QueueRepository", () => {
  it("returns one idempotent job and grants only one active lease", () => {
    const first = queue();
    const second = new QueueRepository(databases[0]!);
    const job = first.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: "same-key" });
    expect(second.enqueue({ type: "fixture.echo", payload: {}, idempotencyKey: "same-key" }).id).toBe(job.id);

    const lease = first.claim("worker-a", 1000, 10);
    expect(lease?.id).toBe(job.id);
    expect(second.claim("worker-b", 1000, 10)).toBeNull();
  });

  it("reclaims an expired lease with the same job identity", () => {
    const repo = queue();
    const job = repo.enqueue({ type: "fixture.echo", payload: { label: "fake-provider" }, idempotencyKey: "retry-key" });
    expect(repo.claim("worker-a", 1000, 10)?.id).toBe(job.id);
    expect(repo.claim("worker-b", 1011, 10)?.id).toBe(job.id);
  });
});
