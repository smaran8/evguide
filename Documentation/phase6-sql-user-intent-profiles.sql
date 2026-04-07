-- =============================================================================
-- Phase 6 — Unified User Intent Profile
-- =============================================================================
-- Run this in the Supabase SQL editor AFTER phases 3, 4, and 5 have been applied.
-- Requires: public.set_updated_at() trigger function (created in Phase 1).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Create table
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.user_intent_profiles (
  id                          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity (one of user_id or session_id must be non-null)
  user_id                     uuid        REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id                  text,

  -- Intent signals (sourced from lead_scores)
  intent_score                integer     NOT NULL DEFAULT 0,
  user_type                   text        NOT NULL DEFAULT 'casual',
  predicted_buy_window        text        NOT NULL DEFAULT '30+ days',

  -- Financial signals (sourced from user_financial_profiles)
  estimated_affordability_band text       NOT NULL DEFAULT 'entry',

  -- Car / brand preference (derived from user_car_interest + local evModels lookup)
  strongest_interest_car_id   text,
  favorite_brand              text,

  -- Body type preference (sourced from user_preferences for logged-in users)
  favorite_body_type          text,

  -- Activity counters (aggregated from user_events)
  visit_count                 integer     NOT NULL DEFAULT 0,
  emi_usage_count             integer     NOT NULL DEFAULT 0,
  compare_count               integer     NOT NULL DEFAULT 0,

  -- Timestamps
  last_activity_at            timestamptz,
  updated_at                  timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT user_intent_profiles_either_user_or_session
    CHECK (user_id IS NOT NULL OR session_id IS NOT NULL),

  CONSTRAINT user_intent_profiles_user_type_check
    CHECK (user_type IN ('casual', 'research', 'buyer')),

  CONSTRAINT user_intent_profiles_affordability_band_check
    CHECK (estimated_affordability_band IN ('entry', 'mid', 'premium')),

  CONSTRAINT user_intent_profiles_score_range
    CHECK (intent_score BETWEEN 0 AND 100)
);

-- -----------------------------------------------------------------------------
-- 2. Unique indexes
-- -----------------------------------------------------------------------------

-- One profile per authenticated user
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_intent_profiles_user_id
  ON public.user_intent_profiles (user_id)
  WHERE user_id IS NOT NULL;

-- One profile per anonymous session (only when there is no user_id)
CREATE UNIQUE INDEX IF NOT EXISTS uq_user_intent_profiles_session_id
  ON public.user_intent_profiles (session_id)
  WHERE session_id IS NOT NULL AND user_id IS NULL;

-- -----------------------------------------------------------------------------
-- 3. Query-performance indexes (useful for admin panels and segmentation)
-- -----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_user_type
  ON public.user_intent_profiles (user_type);

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_score
  ON public.user_intent_profiles (intent_score DESC);

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_band
  ON public.user_intent_profiles (estimated_affordability_band);

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_updated
  ON public.user_intent_profiles (updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_last_activity
  ON public.user_intent_profiles (last_activity_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_brand
  ON public.user_intent_profiles (favorite_brand)
  WHERE favorite_brand IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 4. Row-Level Security
-- Only the service_role (used by the admin client) may read or write.
-- Regular authenticated users cannot read other users' profiles.
-- -----------------------------------------------------------------------------
ALTER TABLE public.user_intent_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_user_intent_profiles"
  ON public.user_intent_profiles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- -----------------------------------------------------------------------------
-- 5. Auto-update updated_at on every row change
-- -----------------------------------------------------------------------------
CREATE TRIGGER trg_user_intent_profiles_updated_at
  BEFORE UPDATE ON public.user_intent_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- =============================================================================
-- Useful inspection queries — run after collecting some behavioral data
-- =============================================================================

-- Overview: all profiles, newest first
-- SELECT
--   user_id,
--   session_id,
--   intent_score,
--   user_type,
--   predicted_buy_window,
--   estimated_affordability_band,
--   favorite_brand,
--   favorite_body_type,
--   visit_count,
--   emi_usage_count,
--   compare_count,
--   last_activity_at,
--   updated_at
-- FROM user_intent_profiles
-- ORDER BY updated_at DESC
-- LIMIT 50;

-- Segment distribution
-- SELECT
--   user_type,
--   estimated_affordability_band,
--   COUNT(*) AS profiles,
--   ROUND(AVG(intent_score), 1) AS avg_score,
--   ROUND(AVG(visit_count), 1) AS avg_visits
-- FROM user_intent_profiles
-- GROUP BY user_type, estimated_affordability_band
-- ORDER BY user_type, estimated_affordability_band;

-- High-intent buyers segmented by brand interest
-- SELECT
--   favorite_brand,
--   estimated_affordability_band,
--   COUNT(*) AS count,
--   ROUND(AVG(intent_score), 1) AS avg_score
-- FROM user_intent_profiles
-- WHERE user_type = 'buyer' AND favorite_brand IS NOT NULL
-- GROUP BY favorite_brand, estimated_affordability_band
-- ORDER BY count DESC;
