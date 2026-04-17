-- Add consultation_type to consultation_requests
-- Distinguishes quote vs compare vs general vehicle enquiries
-- Nullable so existing rows are unaffected

ALTER TABLE consultation_requests
  ADD COLUMN IF NOT EXISTS consultation_type TEXT DEFAULT NULL;

-- Optional: index for admin filtering by type
CREATE INDEX IF NOT EXISTS idx_consultation_requests_type
  ON consultation_requests (consultation_type)
  WHERE consultation_type IS NOT NULL;
