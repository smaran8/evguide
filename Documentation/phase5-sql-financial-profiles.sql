-- ============================================================
-- Phase 5: Affordability and Financial Intent Profiling
-- Table: user_financial_profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS user_financial_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  preferred_budget_min numeric(12,2),
  preferred_budget_max numeric(12,2),
  preferred_emi numeric(12,2),
  preferred_down_payment numeric(12,2),
  estimated_affordability_band text NOT NULL CHECK (
    estimated_affordability_band IN ('entry', 'mid', 'premium')
  ),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_financial_profiles_user_or_session_required CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_profiles_unique_user
  ON user_financial_profiles(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_profiles_unique_session
  ON user_financial_profiles(session_id)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_financial_profiles_band
  ON user_financial_profiles(estimated_affordability_band);

CREATE INDEX IF NOT EXISTS idx_financial_profiles_updated_at
  ON user_financial_profiles(updated_at DESC);

ALTER TABLE user_financial_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "insert_financial_profiles" ON user_financial_profiles;
CREATE POLICY "insert_financial_profiles"
  ON user_financial_profiles FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "update_financial_profiles" ON user_financial_profiles;
CREATE POLICY "update_financial_profiles"
  ON user_financial_profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "read_own_financial_profiles" ON user_financial_profiles;
CREATE POLICY "read_own_financial_profiles"
  ON user_financial_profiles FOR SELECT
  USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS set_user_financial_profiles_updated_at ON user_financial_profiles;
CREATE TRIGGER set_user_financial_profiles_updated_at
BEFORE UPDATE ON user_financial_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- Extend user_events types for price filter tracking.
-- Run this block once if Phase 2 constraint exists.
-- ============================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'user_events'
      AND constraint_name = 'user_events_event_type_check'
  ) THEN
    ALTER TABLE public.user_events DROP CONSTRAINT user_events_event_type_check;
  END IF;
END
$$;

ALTER TABLE public.user_events
ADD CONSTRAINT user_events_event_type_check
CHECK (
  event_type IN (
    'car_view',
    'emi_used',
    'compare_clicked',
    'price_filter_used',
    'loan_offer_clicked',
    'repeat_visit',
    'test_drive_clicked',
    'finance_apply_clicked',
    'reserve_clicked'
  )
);

-- ============================================================
-- Seed/Test Examples
-- ============================================================
-- INSERT INTO user_financial_profiles (
--   session_id,
--   preferred_budget_min,
--   preferred_budget_max,
--   preferred_emi,
--   preferred_down_payment,
--   estimated_affordability_band
-- ) VALUES (
--   'sess_demo_123',
--   20000,
--   35000,
--   420,
--   6000,
--   'mid'
-- );

-- SELECT *
-- FROM user_financial_profiles
-- ORDER BY updated_at DESC
-- LIMIT 50;
