-- ============================================================
-- 017 · Create seo_pages and geo_regions tables
-- Consolidates the base schema that 015 depends on.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- ── seo_pages ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.seo_pages (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  page_slug        TEXT        NOT NULL UNIQUE,
  meta_title       TEXT,
  meta_description TEXT,
  og_title         TEXT,
  og_description   TEXT,
  og_image         TEXT,
  keywords         TEXT[],
  canonical_url    TEXT,
  h1_heading       TEXT,
  content_blocks   JSONB       NOT NULL DEFAULT '[]',
  faq_schema       JSONB       NOT NULL DEFAULT '[]',
  auto_updated_at  TIMESTAMPTZ,
  is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotent column additions in case table already existed without these
ALTER TABLE public.seo_pages
  ADD COLUMN IF NOT EXISTS h1_heading      TEXT,
  ADD COLUMN IF NOT EXISTS content_blocks  JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS faq_schema      JSONB NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS auto_updated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_seo_pages_slug
  ON public.seo_pages (page_slug);

CREATE INDEX IF NOT EXISTS idx_seo_pages_active
  ON public.seo_pages (is_active, page_slug);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_seo_pages_updated_at') THEN
    CREATE TRIGGER set_seo_pages_updated_at
      BEFORE UPDATE ON public.seo_pages
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.seo_pages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_seo_pages" ON public.seo_pages;
CREATE POLICY "public_read_active_seo_pages"
  ON public.seo_pages FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "service_role_all_seo_pages" ON public.seo_pages;
CREATE POLICY "service_role_all_seo_pages"
  ON public.seo_pages FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── geo_regions ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.geo_regions (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  slug        TEXT        NOT NULL UNIQUE,
  country     TEXT        NOT NULL DEFAULT 'GB',
  region_type TEXT        NOT NULL DEFAULT 'city'
                CHECK (region_type IN ('city', 'county', 'region', 'country')),
  description TEXT,
  lat         NUMERIC(10,6),
  lng         NUMERIC(10,6),
  is_active   BOOLEAN     NOT NULL DEFAULT TRUE,
  sort_order  INTEGER     NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_geo_regions_slug
  ON public.geo_regions (slug);

CREATE INDEX IF NOT EXISTS idx_geo_regions_active_sort
  ON public.geo_regions (is_active, sort_order);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_geo_regions_updated_at') THEN
    CREATE TRIGGER set_geo_regions_updated_at
      BEFORE UPDATE ON public.geo_regions
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.geo_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_active_geo_regions" ON public.geo_regions;
CREATE POLICY "public_read_active_geo_regions"
  ON public.geo_regions FOR SELECT
  USING (is_active = TRUE);

DROP POLICY IF EXISTS "service_role_all_geo_regions" ON public.geo_regions;
CREATE POLICY "service_role_all_geo_regions"
  ON public.geo_regions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ── Seed: UK regions ─────────────────────────────────────────

INSERT INTO public.geo_regions (name, slug, country, region_type, lat, lng, sort_order)
VALUES
  ('Greater London',    'greater-london',    'GB', 'region',  51.5074,  -0.1278,  1),
  ('Manchester',        'manchester',         'GB', 'city',    53.4808,  -2.2426,  2),
  ('Birmingham',        'birmingham',         'GB', 'city',    52.4862,  -1.8904,  3),
  ('Leeds',             'leeds',              'GB', 'city',    53.8008,  -1.5491,  4),
  ('Edinburgh',         'edinburgh',          'GB', 'city',    55.9533,  -3.1883,  5),
  ('Bristol',           'bristol',            'GB', 'city',    51.4545,  -2.5879,  6),
  ('Cardiff',           'cardiff',            'GB', 'city',    51.4816,  -3.1791,  7),
  ('Glasgow',           'glasgow',            'GB', 'city',    55.8642,  -4.2518,  8),
  ('Liverpool',         'liverpool',          'GB', 'city',    53.4084,  -2.9916,  9),
  ('United Kingdom',    'united-kingdom',     'GB', 'country', 55.3781,  -3.4360, 99)
ON CONFLICT (slug) DO NOTHING;

-- ── 016: staff departments on profiles ───────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS department TEXT
    CHECK (department IN ('management','sales','finance','technical','marketing','support','operations')),
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ── 015: seo_keywords ────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  keyword        TEXT         NOT NULL,
  search_volume  INTEGER      NOT NULL DEFAULT 0,
  trend_score    NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  intent         TEXT         NOT NULL DEFAULT 'informational'
                   CHECK (intent IN ('informational','commercial','transactional','navigational')),
  target_page    TEXT         NOT NULL DEFAULT '/',
  is_active      BOOLEAN      NOT NULL DEFAULT TRUE,
  is_overridden  BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_intent
  ON public.seo_keywords (intent);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_target_page
  ON public.seo_keywords (target_page);

CREATE INDEX IF NOT EXISTS idx_seo_keywords_trend_score
  ON public.seo_keywords (trend_score DESC)
  WHERE is_active = TRUE;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_seo_keywords_updated_at') THEN
    CREATE TRIGGER set_seo_keywords_updated_at
      BEFORE UPDATE ON public.seo_keywords
      FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
  END IF;
END $$;

ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_seo_keywords" ON public.seo_keywords;
CREATE POLICY "service_role_all_seo_keywords"
  ON public.seo_keywords FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

INSERT INTO public.seo_keywords (keyword, search_volume, trend_score, intent, target_page)
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
