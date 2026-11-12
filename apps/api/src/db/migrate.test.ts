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
      INSERT INTO schema_migrations(version, applied_at) VALUES (1, 1), (2, 2), (3, 3), (4, 4), (5, 5);
      CREATE TABLE user (id TEXT PRIMARY KEY);
      INSERT INTO user VALUES ('student-old');
      CREATE TABLE session (id TEXT PRIMARY KEY, token TEXT NOT NULL UNIQUE, userId TEXT NOT NULL, expiresAt INTEGER NOT NULL, createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL);
      INSERT INTO session VALUES ('session-old', 'session-token-old', 'student-old', 4102444800, 1704067200, 1704067200);
      CREATE TABLE proposals (id TEXT PRIMARY KEY, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, owner_hash TEXT, updated_at TEXT NOT NULL);
      CREATE TABLE proposal_revisions (proposal_id TEXT NOT NULL, version INTEGER NOT NULL, proposal_json TEXT NOT NULL, updated_at TEXT NOT NULL, PRIMARY KEY (proposal_id, version));
      CREATE TABLE mentor_evaluations (id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL, proposal_version INTEGER NOT NULL, evaluation_json TEXT NOT NULL, evaluated_at TEXT NOT NULL);
      CREATE TABLE jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload_json TEXT NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, lease_owner TEXT, lease_until INTEGER, heartbeat_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      INSERT INTO jobs VALUES ('review-old', 'review', '{"reviewId":"preserved"}', 'legacy-review', 'done', 1, NULL, NULL, NULL, 1, 2);
      CREATE TABLE inspector_challenges (id TEXT PRIMARY KEY, review_id TEXT NOT NULL, project_id TEXT NOT NULL, commit_sha TEXT NOT NULL, challenge_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, assigned_to TEXT, assigned_at TEXT, superseded_by_commit_sha TEXT, defense_json TEXT);
      INSERT INTO inspector_challenges VALUES ('inspector-old', 'review-old', 'project-old', 'abc', '{}', 'completed', '2026-01-03T00:00:00.000Z', NULL, NULL, NULL, '{"outcome":"restored"}');
      INSERT INTO proposals VALUES ('proposal-1', 1, '{"title":"Histórica"}', 'legacy-owner-hash', '2026-01-01T00:00:00.000Z');
      INSERT INTO proposal_revisions VALUES ('proposal-1', 1, '{"title":"Histórica"}', '2026-01-01T00:00:00.000Z');
      INSERT INTO mentor_evaluations VALUES ('eval-legacy', 'proposal-1', 1, '{"score":84,"rubricVersion":"mentor-old"}', '2026-01-02T00:00:00.000Z');
    `);

    migrate(database);

    expect(database.prepare("SELECT id, evaluation_json, evaluated_at, input_digest, context_version FROM mentor_evaluations").get()).toEqual({
      id: "eval-legacy", evaluation_json: '{"score":84,"rubricVersion":"mentor-old"}', evaluated_at: "2026-01-02T00:00:00.000Z", input_digest: null, context_version: null,
    });
    expect(database.prepare("SELECT COUNT(*) AS count FROM mentor_control_versions").get()?.count).toBe(1);
    expect(database.prepare("SELECT payload_json, status FROM jobs WHERE id='review-old'").get()).toEqual({ payload_json: '{"reviewId":"preserved"}', status: "done" });
    expect(database.prepare("SELECT id, status, defense_json FROM inspector_challenges WHERE id='inspector-old'").get()).toEqual({ id: "inspector-old", status: "completed", defense_json: '{"outcome":"restored"}' });
    expect(database.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(database.prepare("SELECT COUNT(*) AS count FROM mentor_academic_publications").get()?.count).toBe(0);
    expect(database.prepare("SELECT id, proposal_json, owner_hash, owner_user_id FROM proposals").get()).toEqual({ id: "proposal-1", proposal_json: '{"title":"Histórica"}', owner_hash: "legacy-owner-hash", owner_user_id: null });
    expect(database.prepare("SELECT proposal_id, version, proposal_json FROM proposal_revisions").get()).toEqual({ proposal_id: "proposal-1", version: 1, proposal_json: '{"title":"Histórica"}' });
    expect(database.prepare("SELECT id, evaluation_json FROM mentor_evaluations").get()).toEqual({ id: "eval-legacy", evaluation_json: '{"score":84,"rubricVersion":"mentor-old"}' });
    expect(database.prepare("SELECT id, token, userId FROM session").get()).toEqual({ id: "session-old", token: "session-token-old", userId: "student-old" });
    migrate(database);
    expect(database.prepare("SELECT COUNT(*) AS count FROM mentor_academic_publications").get()?.count).toBe(0);
    expect(database.prepare("SELECT COUNT(*) AS count FROM proposals").get()?.count).toBe(1);
    expect(database.prepare("SELECT COUNT(*) AS count FROM proposal_revisions").get()?.count).toBe(1);
    expect(database.prepare("SELECT COUNT(*) AS count FROM mentor_evaluations").get()?.count).toBe(1);
    expect(database.prepare("SELECT COUNT(*) AS count FROM session").get()?.count).toBe(1);
  });
});
