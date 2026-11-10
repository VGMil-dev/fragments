import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrate.js";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

describe("Mentor control migration", () => {
  it("preserves legacy evaluation IDs, JSON and scores without assigning a new rubric version", () => {
    const database = new DatabaseSync(":memory:"); databases.push(database);
    database.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      INSERT INTO schema_migrations(version, applied_at) VALUES (1, 1), (2, 2), (3, 3), (4, 4), (5, 5), (6, 6);
      CREATE TABLE proposals (id TEXT PRIMARY KEY, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, updated_at TEXT NOT NULL);
      CREATE TABLE mentor_evaluations (id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL, proposal_version INTEGER NOT NULL, evaluation_json TEXT NOT NULL, evaluated_at TEXT NOT NULL);
      INSERT INTO proposals VALUES ('proposal-1', 1, '{}', '2026-01-01T00:00:00.000Z');
      INSERT INTO mentor_evaluations VALUES ('eval-legacy', 'proposal-1', 1, '{"score":84,"rubricVersion":"mentor-old"}', '2026-01-02T00:00:00.000Z');
    `);

    migrate(database);

    expect(database.prepare("SELECT id, evaluation_json, evaluated_at, input_digest, context_version FROM mentor_evaluations").get()).toEqual({
      id: "eval-legacy", evaluation_json: '{"score":84,"rubricVersion":"mentor-old"}', evaluated_at: "2026-01-02T00:00:00.000Z", input_digest: null, context_version: null,
    });
    expect(database.prepare("SELECT COUNT(*) AS count FROM mentor_control_versions").get()?.count).toBe(1);
  });
});
