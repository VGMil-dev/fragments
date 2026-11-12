-- Runtime migration v10; applied transactionally by the migration runner.
ALTER TABLE proposals ADD COLUMN owner_user_id TEXT REFERENCES user(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS proposals_owner_user ON proposals(owner_user_id, updated_at DESC);
CREATE TABLE IF NOT EXISTS mentor_academic_publications (
  proposal_id TEXT NOT NULL,
  proposal_version INTEGER NOT NULL,
  evaluation_id TEXT NOT NULL REFERENCES mentor_evaluations(id) ON DELETE RESTRICT,
  context_version INTEGER NOT NULL REFERENCES mentor_control_versions(version) ON DELETE RESTRICT,
  rubric_version TEXT NOT NULL,
  published_at TEXT NOT NULL,
  PRIMARY KEY (proposal_id, proposal_version),
  FOREIGN KEY (proposal_id, proposal_version) REFERENCES proposal_revisions(proposal_id, version) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS mentor_academic_publications_recent ON mentor_academic_publications(published_at DESC);
CREATE TABLE IF NOT EXISTS mentor_academic_project_moderation (
  proposal_id TEXT PRIMARY KEY REFERENCES proposals(id) ON DELETE RESTRICT,
  withdrawn_by TEXT NOT NULL REFERENCES user(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  withdrawn_at TEXT NOT NULL
);
