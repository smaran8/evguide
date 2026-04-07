-- ============================================================
-- Phase 1: AI Recommendation Engine — Supabase SQL Schema
-- Run these statements in your Supabase SQL Editor in order.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- TABLE: user_preferences
-- Stores the inputs the user submits on the recommendation form.
-- user_id is nullable so anonymous (not logged-in) users can
-- still get recommendations — their session just won't be saved
-- to a named account.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_preferences (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Financial inputs
  monthly_income        numeric(12, 2) NOT NULL CHECK (monthly_income > 0),
  total_budget          numeric(12, 2) NOT NULL CHECK (total_budget > 0),
  down_payment          numeric(12, 2) NOT NULL CHECK (down_payment >= 0),
  preferred_monthly_emi numeric(12, 2) NOT NULL CHECK (preferred_monthly_emi > 0),

  -- Lifestyle inputs
  usage_type            text NOT NULL CHECK (usage_type IN ('city', 'highway', 'mixed')),
  family_size           integer NOT NULL CHECK (family_size BETWEEN 1 AND 10),
  charging_access       text NOT NULL CHECK (charging_access IN ('home', 'public', 'none')),

  -- Preference input
  preferred_body_type   text NOT NULL DEFAULT 'any'
                          CHECK (preferred_body_type IN ('suv', 'hatchback', 'sedan', 'any')),

  created_at            timestamptz DEFAULT now()
);

-- Fast lookup by user when showing recommendation history
CREATE INDEX IF NOT EXISTS idx_user_prefs_user  ON user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_prefs_date  ON user_preferences(created_at DESC);


-- ────────────────────────────────────────────────────────────
-- TABLE: recommendations
-- Stores the top-3 scored results for each preference session.
-- Linked to user_preferences via preference_id.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recommendations (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  preference_id  uuid NOT NULL REFERENCES user_preferences(id) ON DELETE CASCADE,
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- EV identity (ev_id maps to ev_models.id or local data id)
  ev_id          text NOT NULL,
  ev_brand       text NOT NULL,
  ev_model_name  text NOT NULL,   -- column named ev_model_name to avoid SQL keyword collision

  -- Scoring output
  score          numeric(5, 2) NOT NULL CHECK (score BETWEEN 0 AND 100),
  rank           integer NOT NULL CHECK (rank IN (1, 2, 3)),
  estimated_emi  numeric(12, 2) NOT NULL,

  -- Array of human-readable reasons e.g. {'Fits your budget', 'Great city range'}
  reasons        text[] NOT NULL DEFAULT '{}',

  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recs_user        ON recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_recs_pref        ON recommendations(preference_id);
CREATE INDEX IF NOT EXISTS idx_recs_rank        ON recommendations(rank);


-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- Authenticated users own their rows.
-- Anonymous submissions (user_id IS NULL) are allowed for insert
-- but not queryable by any specific user — only visible to admins
-- via service-role key.
-- ────────────────────────────────────────────────────────────
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations  ENABLE ROW LEVEL SECURITY;

-- Allow any client (authenticated or anon) to insert
CREATE POLICY "insert_own_preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Only allow reading your own rows
CREATE POLICY "read_own_preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insert_own_recommendations"
  ON recommendations FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "read_own_recommendations"
  ON recommendations FOR SELECT
  USING (auth.uid() = user_id);
