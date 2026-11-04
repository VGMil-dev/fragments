import type { DatabaseSync } from "node:sqlite";

const migrations = [
  {
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      idempotency_key TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL CHECK (status IN ('pending', 'leased', 'done', 'failed')) DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      lease_owner TEXT,
      lease_until INTEGER,
      heartbeat_at INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS jobs_claimable ON jobs(status, lease_until, created_at);
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      id_hash TEXT PRIMARY KEY,
      teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
      expires_at INTEGER NOT NULL,
      created_at INTEGER NOT NULL
    );`,
  },
  {
    version: 2,
    sql: `CREATE TABLE IF NOT EXISTS proposals (
      id TEXT PRIMARY KEY,
      version INTEGER NOT NULL CHECK (version > 0),
      proposal_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mentor_evaluations (
      id TEXT PRIMARY KEY,
      proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      proposal_version INTEGER NOT NULL,
      evaluation_json TEXT NOT NULL,
      evaluated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mentor_evaluations_proposal ON mentor_evaluations(proposal_id, proposal_version);
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK (kind IN ('mentor', 'review')),
      source_id TEXT NOT NULL,
      score REAL NOT NULL CHECK (score >= 0 AND score <= 100),
      snapshot_json TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      verification_code TEXT NOT NULL UNIQUE,
      rubric_version TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS submissions_source ON submissions(kind, source_id);`,
  },
  {
    version: 3,
    sql: `CREATE TABLE IF NOT EXISTS inspector_challenges (
      id TEXT PRIMARY KEY,
      review_id TEXT NOT NULL,
      project_id TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      challenge_json TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'completed', 'obsolete')),
      created_at TEXT NOT NULL,
      assigned_to TEXT,
      assigned_at TEXT,
      superseded_by_commit_sha TEXT,
      defense_json TEXT
    );
    CREATE INDEX IF NOT EXISTS inspector_challenges_review ON inspector_challenges(review_id, created_at);`,
  },
];

export function migrate(database: DatabaseSync): void {
  database.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at INTEGER NOT NULL)");
  const applied = new Set(database.prepare("SELECT version FROM schema_migrations").all().map((row) => Number(row.version)));
  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    database.exec("BEGIN IMMEDIATE");
    try {
      database.exec(migration.sql);
      database.prepare("INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)").run(migration.version, Date.now());
      database.exec("COMMIT");
    } catch (error) {
      database.exec("ROLLBACK");
      throw error;
    }
  }
}
