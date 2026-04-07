-- ============================================================
-- Phase 3: Buyer Intent Scoring Engine
-- Table: lead_scores
-- ============================================================

CREATE TABLE IF NOT EXISTS lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  score integer NOT NULL DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  user_type text NOT NULL CHECK (user_type IN ('casual', 'research', 'buyer')),
  predicted_buy_window text NOT NULL,
  interested_car_id text,
  last_activity_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Require at least one identity so each score belongs to a person/session.
  CONSTRAINT lead_scores_user_or_session_required CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

-- One active score row per authenticated user.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_scores_unique_user
  ON lead_scores(user_id)
  WHERE user_id IS NOT NULL;

-- One active score row per anonymous browser session.
CREATE UNIQUE INDEX IF NOT EXISTS idx_lead_scores_unique_session
  ON lead_scores(session_id)
  WHERE session_id IS NOT NULL;

-- Query helpers for dashboard/segmentation use cases.
CREATE INDEX IF NOT EXISTS idx_lead_scores_user_type
  ON lead_scores(user_type);

CREATE INDEX IF NOT EXISTS idx_lead_scores_score_desc
  ON lead_scores(score DESC);

CREATE INDEX IF NOT EXISTS idx_lead_scores_last_activity_desc
  ON lead_scores(last_activity_at DESC);

CREATE INDEX IF NOT EXISTS idx_lead_scores_interested_car
  ON lead_scores(interested_car_id)
  WHERE interested_car_id IS NOT NULL;

ALTER TABLE lead_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_lead_scores" ON lead_scores;
CREATE POLICY "insert_lead_scores"
  ON lead_scores FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_lead_scores" ON lead_scores;
CREATE POLICY "update_lead_scores"
  ON lead_scores FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "read_own_lead_scores" ON lead_scores;
CREATE POLICY "read_own_lead_scores"
  ON lead_scores FOR SELECT
  USING (auth.uid() = user_id);

-- Keep updated_at fresh on score refreshes.
DROP TRIGGER IF EXISTS set_lead_scores_updated_at ON lead_scores;
CREATE TRIGGER set_lead_scores_updated_at
BEFORE UPDATE ON lead_scores
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed/Test Examples
-- ============================================================
-- Example A: anonymous session row
-- INSERT INTO lead_scores (
--   session_id, score, user_type, predicted_buy_window, interested_car_id, last_activity_at
-- ) VALUES (
--   'sess_demo_123', 23, 'casual', '30+ days', 'tesla-model-3', now()
-- );

-- Example B: authenticated user row
-- INSERT INTO lead_scores (
--   user_id, score, user_type, predicted_buy_window, interested_car_id, last_activity_at
-- ) VALUES (
--   '<auth_user_uuid_here>', 84, 'buyer', '1 to 7 days', 'byd-atto-3', now()
-- );

-- Quick verification query
-- SELECT id, user_id, session_id, score, user_type, predicted_buy_window, interested_car_id,
--        last_activity_at, updated_at
-- FROM lead_scores
-- ORDER BY updated_at DESC
-- LIMIT 50;
