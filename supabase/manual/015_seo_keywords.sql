-- ============================================================
-- 015 · Dynamic SEO keyword tracking
-- Run this in the Supabase SQL editor (or via supabase db push)
-- ============================================================

-- 1. Extend seo_pages with content / FAQ / auto-update fields
ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS h1_heading       TEXT,
  ADD COLUMN IF NOT EXISTS content_blocks   JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS faq_schema       JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS auto_updated_at  TIMESTAMPTZ;

-- 2. Trending keyword registry
CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword        TEXT        NOT NULL,
  search_volume  INTEGER     NOT NULL DEFAULT 0,
  trend_score    NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  intent         TEXT        NOT NULL DEFAULT 'informational'
                   CHECK (intent IN ('informational','commercial','transactional','navigational')),
  target_page    TEXT        NOT NULL DEFAULT '/',
  is_active      BOOLEAN     NOT NULL DEFAULT TRUE,
  is_overridden  BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_intent
  ON public.seo_keywords (intent);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_target_page
  ON public.seo_keywords (target_page);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_trend_score
  ON public.seo_keywords (trend_score DESC)
  WHERE is_active = TRUE;

-- Auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'set_seo_keywords_updated_at'
  ) THEN
    CREATE TRIGGER set_seo_keywords_updated_at
      BEFORE UPDATE ON public.seo_keywords
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

-- RLS: block public access, allow service role
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_seo_keywords" ON public.seo_keywords;
CREATE POLICY "service_role_all_seo_keywords"
  ON public.seo_keywords
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Seed with UK EV keywords (safe to re-run)
INSERT INTO public.seo_keywords
  (keyword, search_volume, trend_score, intent, target_page)
VALUES
  ('buy electric car UK',            12000, 85.0, 'transactional',  '/vehicles'),
  ('best electric car 2026',         18000, 92.0, 'informational',  '/vehicles'),
  ('cheapest electric car UK',       14000, 91.0, 'transactional',  '/vehicles'),
  ('used electric car UK',           11000, 89.0, 'transactional',  '/vehicles'),
  ('Tesla Model 3 review UK',         8000, 82.0, 'informational',  '/vehicles'),
  ('electric car running costs',      6500, 76.0, 'informational',  '/vehicles'),
  ('EV tax incentives UK 2026',       7000, 87.0, 'informational',  '/vehicles'),
  ('electric car range anxiety',      5500, 65.0, 'informational',  '/vehicles'),
  ('EV finance calculator UK',        6000, 78.0, 'commercial',     '/finance'),
  ('EV leasing vs buying',            5000, 72.0, 'commercial',     '/finance'),
  ('compare electric cars',           9000, 88.0, 'commercial',     '/compare'),
  ('Nissan Leaf vs Tesla Model 3',    3200, 70.0, 'commercial',     '/compare'),
  ('EV charging near me',            22000, 95.0, 'transactional',  '/charging'),
  ('EV home charging installation',   4500, 73.0, 'commercial',     '/charging'),
  ('part exchange electric car',      3000, 68.0, 'transactional',  '/exchange')
ON CONFLICT DO NOTHING;
