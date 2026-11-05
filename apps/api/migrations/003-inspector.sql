CREATE TABLE inspector_challenges (
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
CREATE INDEX inspector_challenges_review ON inspector_challenges(review_id, created_at);
