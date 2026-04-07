-- ============================================================
-- Phase 4: Repeat Visit and Return-Interest Detection
-- Table: user_car_interest
-- ============================================================

CREATE TABLE IF NOT EXISTS user_car_interest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  car_id text NOT NULL,
  first_seen_at timestamptz NOT NULL,
  last_seen_at timestamptz NOT NULL,
  total_views_per_car integer NOT NULL DEFAULT 1 CHECK (total_views_per_car >= 1),
  high_interest boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_car_interest_user_or_session_required CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

-- Prevent duplicates for the same identity + car pair.
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_car_interest_unique_user_car
  ON user_car_interest(user_id, car_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_car_interest_unique_session_car
  ON user_car_interest(session_id, car_id)
  WHERE session_id IS NOT NULL;

-- Query helpers for strongest-interest lookup and dashboards.
CREATE INDEX IF NOT EXISTS idx_user_car_interest_last_seen_desc
  ON user_car_interest(last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_car_interest_views_desc
  ON user_car_interest(total_views_per_car DESC);

CREATE INDEX IF NOT EXISTS idx_user_car_interest_high_interest
  ON user_car_interest(high_interest)
  WHERE high_interest = true;

CREATE INDEX IF NOT EXISTS idx_user_car_interest_car_id
  ON user_car_interest(car_id);

ALTER TABLE user_car_interest ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_user_car_interest" ON user_car_interest;
CREATE POLICY "insert_user_car_interest"
  ON user_car_interest FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_user_car_interest" ON user_car_interest;
CREATE POLICY "update_user_car_interest"
  ON user_car_interest FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "read_own_user_car_interest" ON user_car_interest;
CREATE POLICY "read_own_user_car_interest"
  ON user_car_interest FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_car_interest_updated_at ON user_car_interest;
CREATE TRIGGER set_user_car_interest_updated_at
BEFORE UPDATE ON user_car_interest
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Seed/Test Examples
-- ============================================================
-- Example A: first anonymous car view summary row
-- INSERT INTO user_car_interest (
--   session_id, car_id, first_seen_at, last_seen_at, total_views_per_car, high_interest
-- ) VALUES (
--   'sess_demo_123', 'tesla-model-3', now(), now(), 1, false
-- );

-- Example B: mark as high-interest after repeated views
-- UPDATE user_car_interest
-- SET total_views_per_car = 3,
--     last_seen_at = now(),
--     high_interest = true
-- WHERE session_id = 'sess_demo_123' AND car_id = 'tesla-model-3';

-- Quick verification query
-- SELECT id, user_id, session_id, car_id, first_seen_at, last_seen_at,
--        total_views_per_car, high_interest, updated_at
-- FROM user_car_interest
-- ORDER BY last_seen_at DESC
-- LIMIT 50;
