-- Mirror of runtime migration v5. Existing drafts stay private (owner_hash IS NULL).
ALTER TABLE proposals ADD COLUMN owner_hash TEXT;
CREATE TABLE proposal_revisions (
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  proposal_json TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (proposal_id, version)
);
INSERT OR IGNORE INTO proposal_revisions(proposal_id, version, proposal_json, updated_at)
  SELECT id, version, proposal_json, updated_at FROM proposals;
CREATE TABLE mentor_gallery_optins (
  proposal_id TEXT PRIMARY KEY REFERENCES proposals(id) ON DELETE CASCADE,
  proposal_version INTEGER NOT NULL CHECK (proposal_version > 0),
  opted_in INTEGER NOT NULL CHECK (opted_in IN (0, 1)),
  updated_at TEXT NOT NULL
);
CREATE INDEX mentor_gallery_public ON mentor_gallery_optins(opted_in, proposal_version, updated_at);
