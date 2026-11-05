-- Mirror of runtime migration v4. Unknown in-flight provider costs stay reserved.
CREATE TABLE ai_budget_reservations (
  id TEXT PRIMARY KEY,
  request_kind TEXT NOT NULL,
  reserved_microusd INTEGER NOT NULL CHECK (reserved_microusd > 0),
  actual_microusd INTEGER CHECK (actual_microusd IS NULL OR actual_microusd >= 0),
  status TEXT NOT NULL CHECK (status IN ('reserved', 'settled', 'uncertain', 'released')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX ai_budget_reservations_status ON ai_budget_reservations(status, created_at);
