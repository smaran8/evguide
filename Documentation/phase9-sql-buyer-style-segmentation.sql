-- =============================================================================
-- Phase 9 — Soft Buyer Psychology Segmentation (Inferred, Rule-Based)
-- =============================================================================
-- This migration extends user_intent_profiles with explainable, non-deterministic
-- behavioral style fields. These values are INFERRED from interaction patterns
-- and should be treated as directional signals, not certainty.
-- =============================================================================

ALTER TABLE public.user_intent_profiles
  ADD COLUMN IF NOT EXISTS inferred_buyer_style text,
  ADD COLUMN IF NOT EXISTS inferred_buyer_style_confidence numeric(4,3),
  ADD COLUMN IF NOT EXISTS inferred_buyer_style_reason text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_intent_profiles_inferred_style_check'
      AND conrelid = 'public.user_intent_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_intent_profiles
      ADD CONSTRAINT user_intent_profiles_inferred_style_check
      CHECK (
        inferred_buyer_style IS NULL OR
        inferred_buyer_style IN (
          'analytical_buyer',
          'emotional_buyer',
          'price_sensitive_buyer',
          'urgent_buyer'
        )
      );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'user_intent_profiles_inferred_style_confidence_check'
      AND conrelid = 'public.user_intent_profiles'::regclass
  ) THEN
    ALTER TABLE public.user_intent_profiles
      ADD CONSTRAINT user_intent_profiles_inferred_style_confidence_check
      CHECK (
        inferred_buyer_style_confidence IS NULL OR
        (inferred_buyer_style_confidence >= 0 AND inferred_buyer_style_confidence <= 1)
      );
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_inferred_style
  ON public.user_intent_profiles (inferred_buyer_style)
  WHERE inferred_buyer_style IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_intent_profiles_style_confidence
  ON public.user_intent_profiles (inferred_buyer_style_confidence DESC)
  WHERE inferred_buyer_style_confidence IS NOT NULL;

-- Optional sanity query
-- SELECT
--   inferred_buyer_style,
--   COUNT(*) AS profiles,
--   ROUND(AVG(inferred_buyer_style_confidence), 2) AS avg_confidence
-- FROM user_intent_profiles
-- GROUP BY inferred_buyer_style
-- ORDER BY profiles DESC;
