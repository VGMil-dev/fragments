-- Role and teacher ownership
ALTER TABLE "user" ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'student';
ALTER TABLE challenge ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE challenge ADD COLUMN IF NOT EXISTS teacher_id TEXT REFERENCES "user"(id);

-- Materials
CREATE TABLE IF NOT EXISTS course_material (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id  TEXT NOT NULL REFERENCES "user"(id),
  title       TEXT NOT NULL,
  content_md  TEXT NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS material_component (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID REFERENCES course_material(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  config      JSONB NOT NULL,
  position    INTEGER NOT NULL
);

-- Analytics
CREATE TABLE IF NOT EXISTS teacher_analytics (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      TEXT NOT NULL REFERENCES "user"(id),
  challenge_id UUID REFERENCES challenge(id),
  event_type   TEXT NOT NULL,
  phase_id     UUID,
  metadata     JSONB,
  created_at   TIMESTAMPTZ DEFAULT now()
);
