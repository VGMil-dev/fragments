-- Phase 1 schema: challenges, submissions, hints, ACH economy, progress

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS challenge (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       VARCHAR(200) NOT NULL,
  description TEXT         NOT NULL,
  difficulty  INT          NOT NULL CHECK (difficulty BETWEEN 1 AND 5),
  topic       VARCHAR(100) NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_phase (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID         NOT NULL REFERENCES challenge(id) ON DELETE CASCADE,
  order_index  INT          NOT NULL,
  kind         VARCHAR(20)  NOT NULL CHECK (kind IN ('conceptual', 'code')),
  content      JSONB        NOT NULL,
  UNIQUE (challenge_id, order_index)
);

-- Pre-defined hints ordered by level (1=conceptual hint, 5=technical hint)
CREATE TABLE IF NOT EXISTS challenge_hint (
  id       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phase_id UUID        NOT NULL REFERENCES challenge_phase(id) ON DELETE CASCADE,
  level    INT         NOT NULL CHECK (level BETWEEN 1 AND 5),
  content  TEXT        NOT NULL
);

CREATE TABLE IF NOT EXISTS submission (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  phase_id     UUID        NOT NULL REFERENCES challenge_phase(id),
  content      TEXT        NOT NULL,
  passed       BOOLEAN     NOT NULL,
  feedback     TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hint_event (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT        NOT NULL,
  phase_id     UUID        NOT NULL REFERENCES challenge_phase(id),
  hint_level   INT         NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ach_transaction (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    TEXT        NOT NULL,
  amount     INT         NOT NULL,
  reason     VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, reason)
);

CREATE TABLE IF NOT EXISTS lumen_progress (
  user_id     TEXT        PRIMARY KEY,
  level       INT         NOT NULL DEFAULT 1,
  ach_balance INT         NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Student API keys (encrypted at application level with AES-256-GCM)
CREATE TABLE IF NOT EXISTS user_api_keys (
  user_id             TEXT        PRIMARY KEY,
  google_ai_key_enc   TEXT,
  openrouter_key_enc  TEXT,
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
