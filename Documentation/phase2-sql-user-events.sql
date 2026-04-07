-- ============================================================
-- Phase 2: User Behavior Tracking Foundation
-- Table: user_events
-- ============================================================

CREATE TABLE IF NOT EXISTS user_events (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id text,
  car_id     text,
  event_type text NOT NULL CHECK (
    event_type IN (
      'car_view',
      'emi_used',
      'compare_clicked',
      'loan_offer_clicked',
      'repeat_visit',
      'test_drive_clicked',
      'finance_apply_clicked',
      'reserve_clicked'
    )
  ),
  event_value jsonb,
  page_path   text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Ensure we can attribute event to either authenticated user or anon session
  CONSTRAINT user_or_session_required CHECK (
    user_id IS NOT NULL OR session_id IS NOT NULL
  )
);

-- Performance indexes for common analytics queries
CREATE INDEX IF NOT EXISTS idx_user_events_created_at
  ON user_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_event_type_created
  ON user_events(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_events_user_created
  ON user_events(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_events_session_created
  ON user_events(session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_events_car_created
  ON user_events(car_id, created_at DESC)
  WHERE car_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_events_page_path_created
  ON user_events(page_path, created_at DESC);

ALTER TABLE user_events ENABLE ROW LEVEL SECURITY;

-- Allow anonymous and authenticated inserts.
DROP POLICY IF EXISTS "insert_user_events" ON user_events;
CREATE POLICY "insert_user_events"
  ON user_events FOR INSERT
  WITH CHECK (true);

-- Auth users can read only their own rows.
DROP POLICY IF EXISTS "read_own_user_events" ON user_events;
CREATE POLICY "read_own_user_events"
  ON user_events FOR SELECT
  USING (auth.uid() = user_id);
