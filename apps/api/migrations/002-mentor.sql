CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  version INTEGER NOT NULL CHECK (version > 0),
  proposal_json TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE mentor_evaluations (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,
  proposal_version INTEGER NOT NULL,
  evaluation_json TEXT NOT NULL,
  evaluated_at TEXT NOT NULL
);
CREATE INDEX mentor_evaluations_proposal ON mentor_evaluations(proposal_id, proposal_version);
CREATE TABLE submissions (
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
CREATE INDEX submissions_source ON submissions(kind, source_id);
