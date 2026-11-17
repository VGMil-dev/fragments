import { afterEach, describe, expect, it } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { migrate } from "./migrate.js";

const databases: DatabaseSync[] = [];
afterEach(() => { for (const database of databases.splice(0)) database.close(); });

describe("Mentor control migration", () => {
  it("adds operation identity to a schema v11 ledger without changing a historical uncertain reservation", () => {
    const database = new DatabaseSync(":memory:"); databases.push(database);
    database.exec(`
      CREATE TABLE schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL);
      INSERT INTO schema_migrations(version, applied_at) VALUES (1,1),(2,2),(3,3),(4,4),(5,5),(6,6),(7,7),(8,8),(9,9),(10,10),(11,11);
      CREATE TABLE ai_budget_reservations (
        id TEXT PRIMARY KEY, request_kind TEXT NOT NULL, reserved_microusd INTEGER NOT NULL,
        actual_microusd INTEGER, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL
      );
      INSERT INTO ai_budget_reservations VALUES ('mentor-870', 'mentor', 870, NULL, 'uncertain', 100, 200);
      CREATE TABLE review_attempts (
        job_id TEXT NOT NULL, attempt INTEGER NOT NULL, started_at INTEGER, finished_at INTEGER,
        duration_ms INTEGER, stage TEXT, error_code TEXT, retry_class TEXT, final_status TEXT NOT NULL
      );
      INSERT INTO review_attempts VALUES
        ('legacy-review-1',1,NULL,101,NULL,'ai_dispatch','LEGACY_UNCLASSIFIED','manual','failed'),
        ('legacy-review-2',1,NULL,102,NULL,'ai_dispatch','LEGACY_UNCLASSIFIED','manual','failed'),
        ('legacy-review-3',1,NULL,103,NULL,'ai_dispatch','LEGACY_UNCLASSIFIED','manual','failed'),
        ('legacy-review-4',1,NULL,104,NULL,'ai_dispatch','LEGACY_UNCLASSIFIED','manual','failed'),
        ('legacy-review-5',1,NULL,105,NULL,'ai_dispatch','LEGACY_UNCLASSIFIED','manual','failed'),
        ('legacy-review-6',1,NULL,106,NULL,'ai_dispatch','LEGACY_UNCLASSIFIED','manual','failed');
      CREATE TABLE inspector_challenges (
        id TEXT PRIMARY KEY, review_id TEXT NOT NULL, project_id TEXT NOT NULL, commit_sha TEXT NOT NULL,
        challenge_json TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, assigned_to TEXT,
        assigned_at TEXT, superseded_by_commit_sha TEXT, defense_json TEXT
      );
      INSERT INTO inspector_challenges VALUES ('legacy-challenge','legacy-review-1','project-1','abc','{}','completed','2026-01-01',NULL,NULL,NULL,'{}');
    `);

    migrate(database);

    expect(database.prepare("SELECT id, request_kind, reserved_microusd, actual_microusd, status, created_at, updated_at, operation_key FROM ai_budget_reservations").get())
      .toEqual({ id: "mentor-870", request_kind: "mentor", reserved_microusd: 870, actual_microusd: null, status: "uncertain", created_at: 100, updated_at: 200, operation_key: null });
    expect(database.prepare("SELECT MAX(version) AS version FROM schema_migrations").get()?.version).toBe(13);
    expect(database.prepare("PRAGMA integrity_check").get()?.integrity_check).toBe("ok");
    expect(database.prepare("SELECT id, status, defense_json, ai_operation_key FROM inspector_challenges").get()).toEqual({
      id: "legacy-challenge", status: "completed", defense_json: "{}", ai_operation_key: null,
    });
    expect(database.prepare("SELECT job_id, attempt, error_code, retry_class, final_status FROM review_attempts ORDER BY job_id").all()).toEqual(
      Array.from({ length: 6 }, (_, index) => ({
        job_id: `legacy-review-${index + 1}`, attempt: 1, error_code: "LEGACY_UNCLASSIFIED", retry_class: "manual", final_status: "failed",
      })),
    );
  });

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
      CREATE TABLE ai_budget_reservations (id TEXT PRIMARY KEY, request_kind TEXT NOT NULL, reserved_microusd INTEGER NOT NULL, actual_microusd INTEGER, status TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      INSERT INTO ai_budget_reservations VALUES ('mentor-historic', 'mentor', 870, NULL, 'uncertain', 10, 20);
      CREATE TABLE jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload_json TEXT NOT NULL, idempotency_key TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL, lease_owner TEXT, lease_until INTEGER, heartbeat_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
      INSERT INTO jobs VALUES ('review-old', 'review', '{"reviewId":"preserved"}', 'legacy-review', 'done', 1, NULL, NULL, NULL, 1, 2);
      INSERT INTO jobs VALUES ('review-failed-old', 'review', '{"reviewId":"preserved"}', 'legacy-review-failed', 'failed', 1, NULL, NULL, NULL, 100, 200);
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
    expect(database.prepare("SELECT last_stage, last_error_code, retry_class FROM jobs WHERE id='review-failed-old'").get())
      .toEqual({ last_stage: "unknown", last_error_code: "LEGACY_UNCLASSIFIED", retry_class: "manual" });
    expect(database.prepare("SELECT attempt, started_at, finished_at, duration_ms, stage, error_code, retry_class, final_status FROM review_attempts WHERE job_id='review-failed-old'").get())
      .toEqual({ attempt: 1, started_at: null, finished_at: 200, duration_ms: null, stage: "unknown", error_code: "LEGACY_UNCLASSIFIED", retry_class: "manual", final_status: "failed" });
    expect(database.prepare("SELECT id, status, defense_json, ai_operation_key FROM inspector_challenges WHERE id='inspector-old'").get()).toEqual({ id: "inspector-old", status: "completed", defense_json: '{"outcome":"restored"}', ai_operation_key: null });
    expect(database.prepare("SELECT version FROM schema_migrations ORDER BY version").all().map((row) => row.version)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    expect(database.prepare("SELECT id, reserved_microusd, status, operation_key FROM ai_budget_reservations").get()).toEqual({
      id: "mentor-historic", reserved_microusd: 870, status: "uncertain", operation_key: null,
    });
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
