-- ============================================================
-- Phase 1 Addendum: Vehicle Queries table
-- Run this in your Supabase SQL Editor after phase1-sql-schema.sql
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- TABLE: vehicle_queries
-- Created when a user clicks "Select This EV" on their
-- recommendations and submits their contact details.
-- This is the core lead-capture record that flows into
-- the admin panel.
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vehicle_queries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Link back to the recommendation session (optional — may be null
  -- if the query is submitted outside the recommendation flow)
  preference_id  uuid REFERENCES user_preferences(id) ON DELETE SET NULL,

  -- Supabase auth user — null for logged-out users
  user_id        uuid REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Which EV the user selected
  ev_id          text NOT NULL,
  ev_brand       text NOT NULL,
  ev_model_name  text NOT NULL,

  -- Score context from the recommendation engine
  score          numeric(5, 2),
  rank           integer,

  -- Contact info captured at the point of selection
  full_name      text NOT NULL CHECK (length(trim(full_name)) >= 2),
  email          text NOT NULL CHECK (email ~* '^[^@]+@[^@]+\.[^@]+$'),
  phone          text,
  notes          text,

  -- Admin workflow status
  status         text NOT NULL DEFAULT 'new'
                   CHECK (status IN ('new', 'contacted', 'resolved')),

  created_at     timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vq_user       ON vehicle_queries(user_id);
CREATE INDEX IF NOT EXISTS idx_vq_ev         ON vehicle_queries(ev_id);
CREATE INDEX IF NOT EXISTS idx_vq_status     ON vehicle_queries(status);
CREATE INDEX IF NOT EXISTS idx_vq_created    ON vehicle_queries(created_at DESC);

-- ────────────────────────────────────────────────────────────
-- RLS: anyone can insert (logged in or not).
-- Only admins (service role) can read — enforced via the
-- admin client (service role key bypasses RLS).
-- ────────────────────────────────────────────────────────────
ALTER TABLE vehicle_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "insert_vehicle_queries"
  ON vehicle_queries FOR INSERT
  WITH CHECK (true);

-- Logged-in users can read their own submissions
CREATE POLICY "read_own_vehicle_queries"
  ON vehicle_queries FOR SELECT
  USING (auth.uid() = user_id);
