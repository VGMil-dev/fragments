-- Canonical migration is versioned in src/db/migrate.ts for execution without runtime file-path assumptions.
-- This mirror documents the initial persistent queue and teacher-session schema.
CREATE TABLE jobs (id TEXT PRIMARY KEY, type TEXT NOT NULL, payload_json TEXT NOT NULL, idempotency_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK (status IN ('pending','leased','done','failed')) DEFAULT 'pending', attempts INTEGER NOT NULL DEFAULT 0, lease_owner TEXT, lease_until INTEGER, heartbeat_at INTEGER, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL);
CREATE INDEX jobs_claimable ON jobs(status, lease_until, created_at);
CREATE TABLE teachers (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE sessions (id_hash TEXT PRIMARY KEY, teacher_id TEXT NOT NULL REFERENCES teachers(id) ON DELETE CASCADE, expires_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
