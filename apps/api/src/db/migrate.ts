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
  {
    version: 4,
    sql: `CREATE TABLE IF NOT EXISTS ai_budget_reservations (
      id TEXT PRIMARY KEY,
      request_kind TEXT NOT NULL,
      reserved_microusd INTEGER NOT NULL CHECK (reserved_microusd > 0),
      actual_microusd INTEGER CHECK (actual_microusd IS NULL OR actual_microusd >= 0),
      status TEXT NOT NULL CHECK (status IN ('reserved', 'settled', 'uncertain', 'released')),
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS ai_budget_reservations_status ON ai_budget_reservations(status, created_at);`,
  },
  {
    version: 5,
    sql: `ALTER TABLE proposals ADD COLUMN owner_hash TEXT;
    CREATE TABLE IF NOT EXISTS proposal_revisions (
      proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
      version INTEGER NOT NULL CHECK (version > 0),
      proposal_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (proposal_id, version)
    );
    INSERT OR IGNORE INTO proposal_revisions(proposal_id, version, proposal_json, updated_at)
      SELECT id, version, proposal_json, updated_at FROM proposals;
    CREATE TABLE IF NOT EXISTS mentor_gallery_optins (
      proposal_id TEXT PRIMARY KEY REFERENCES proposals(id) ON DELETE CASCADE,
      proposal_version INTEGER NOT NULL CHECK (proposal_version > 0),
      opted_in INTEGER NOT NULL CHECK (opted_in IN (0, 1)),
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS mentor_gallery_public ON mentor_gallery_optins(opted_in, proposal_version, updated_at);`,
  },
  {
    version: 6,
    sql: `CREATE TABLE IF NOT EXISTS trainer_sessions (
      session_hash TEXT PRIMARY KEY,
      created_at TEXT NOT NULL,
      expires_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS trainer_banks (
      review_id TEXT NOT NULL,
      commit_sha TEXT NOT NULL,
      challenges_json TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (review_id, commit_sha)
    );
    CREATE TABLE IF NOT EXISTS trainer_attempts (
      id TEXT PRIMARY KEY,
      session_hash TEXT NOT NULL REFERENCES trainer_sessions(session_hash) ON DELETE CASCADE,
      review_id TEXT NOT NULL,
      challenge_id TEXT NOT NULL,
      feature TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'need_more')),
      hints_used INTEGER NOT NULL CHECK (hints_used BETWEEN 0 AND 3),
      attempted_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS trainer_attempt_history ON trainer_attempts(session_hash, review_id, attempted_at);
    CREATE INDEX IF NOT EXISTS trainer_attempt_challenge ON trainer_attempts(session_hash, challenge_id, attempted_at);`,
  },
  {
    version: 7,
    sql: `ALTER TABLE trainer_banks ADD COLUMN bank_ready INTEGER NOT NULL DEFAULT 0 CHECK (bank_ready IN (0, 1));`,
  },
  {
    version: 8,
    sql: `ALTER TABLE trainer_banks ADD COLUMN generation_owner TEXT;
    ALTER TABLE trainer_banks ADD COLUMN generation_lease_until INTEGER;`,
  },
  {
    version: 9,
    sql: `CREATE TABLE IF NOT EXISTS mentor_control_draft (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS mentor_control_versions (
      version INTEGER PRIMARY KEY CHECK (version > 0),
      config_json TEXT NOT NULL,
      published_at TEXT NOT NULL,
      published_by TEXT NOT NULL
    );
    INSERT OR IGNORE INTO mentor_control_versions(version, config_json, published_at, published_by) VALUES
      (1, '{"subject":"Proyectos estudiantiles","theme":"Idea de proyecto","assignment":"Describe un problema, una solución inicial y un alcance que puedas demostrar.","requirements":["Propón una primera versión pequeña y comprobable."],"expectedLevel":"Estudiante que inicia su proyecto","rubricTitle":"Propuesta inicial","criteria":[{"id":"problem","title":"Problema claro","description":"Explica a quién le ocurre y qué necesita resolver.","weight":25},{"id":"solution","title":"Solución relacionada","description":"La idea responde al problema descrito.","weight":20},{"id":"scope","title":"Alcance de MVP","description":"La primera versión cabe en el tiempo y nivel indicados.","weight":25},{"id":"goals","title":"Objetivos comprobables","description":"Se puede observar o comprobar si cada objetivo se logró.","weight":15},{"id":"feasibility","title":"Viabilidad inicial","description":"Las herramientas y condiciones descritas permiten empezar.","weight":15}]}', strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), 'system-seed');
    INSERT OR IGNORE INTO mentor_control_draft(id, config_json, updated_at)
      SELECT 1, config_json, published_at FROM mentor_control_versions WHERE version = 1;
    ALTER TABLE mentor_evaluations ADD COLUMN input_digest TEXT;
    ALTER TABLE mentor_evaluations ADD COLUMN context_version INTEGER;
    CREATE UNIQUE INDEX IF NOT EXISTS mentor_evaluations_idempotency
      ON mentor_evaluations(proposal_id, proposal_version, input_digest, context_version)
      WHERE input_digest IS NOT NULL AND context_version IS NOT NULL;
    CREATE INDEX IF NOT EXISTS mentor_evaluations_history ON mentor_evaluations(evaluated_at DESC);`,
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
