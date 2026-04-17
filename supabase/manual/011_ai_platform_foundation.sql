-- ============================================================
-- Migration 011 — AI Platform Foundation
-- Date: 2026-04-14
-- Purpose: Create the database foundation for the AI-powered
--          EV decision, finance, and lead intelligence platform.
--
-- PREREQUISITES
--   • 000_set_updated_at.sql must be applied (set_updated_at()
--     trigger function must already exist).
--
-- CONFLICT NOTES (read before running)
--   • user_events: An existing user_events table is used by the
--     behavioural tracking system (/api/tracking). Its schema is
--     incompatible with this new spec (event_type vs event_name,
--     text session_id vs uuid FK, car_id vs vehicle_id). This
--     migration uses CREATE TABLE IF NOT EXISTS so it will silently
--     no-op if the old table still exists. See implementation notes
--     for the recommended migration path before running this.
--   • vehicles: Separate from existing ev_models. Both can coexist.
--   • lead_pipeline: Separate from existing leads (raw form captures).
--   • finance_requests: Separate from existing finance_enquiries.
--   • profiles: Separate from user_intent_profiles (behavioural
--     scoring). profiles stores PII contact data for registered users.
-- ============================================================


-- ── 1. profiles ──────────────────────────────────────────────
-- Stores PII contact information for registered users.
-- Distinct from auth.users (auth identity) and user_intent_profiles
-- (behavioural scoring). Links to auth.users via email or app logic.

create table if not exists public.profiles (
  id          uuid        primary key default gen_random_uuid(),
  email       text        unique,
  phone       text,
  full_name   text,
  city        text,
  country     text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists profiles_email_idx
  on public.profiles (email)
  where email is not null;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();


-- ── 2. anonymous_visitors ────────────────────────────────────
-- One row per device fingerprint / anonymous_id cookie.
-- Tracks attribution and device context before a user identifies.

create table if not exists public.anonymous_visitors (
  id              uuid        primary key default gen_random_uuid(),
  anonymous_id    text        unique not null,
  first_seen_at   timestamptz default now(),
  last_seen_at    timestamptz default now(),
  source          text,
  medium          text,
  campaign        text,
  referrer        text,
  device_type     text,
  browser         text,
  os              text
);

create index if not exists anonymous_visitors_anonymous_id_idx
  on public.anonymous_visitors (anonymous_id);


-- ── 3. user_sessions ─────────────────────────────────────────
-- One row per browser session. Bridges anonymous_visitors and
-- profiles (session is created anonymous, optionally upgraded
-- when a user identifies).

create table if not exists public.user_sessions (
  id                    uuid        primary key default gen_random_uuid(),
  anonymous_visitor_id  uuid        references public.anonymous_visitors (id) on delete set null,
  profile_id            uuid        references public.profiles (id)           on delete set null,
  session_token         text        unique not null,
  started_at            timestamptz default now(),
  ended_at              timestamptz,
  landing_page          text,
  source                text,
  medium                text,
  campaign              text,
  referrer              text,
  device_type           text,
  browser               text,
  os                    text
);

create index if not exists user_sessions_profile_id_idx
  on public.user_sessions (profile_id)
  where profile_id is not null;

create index if not exists user_sessions_anonymous_visitor_id_idx
  on public.user_sessions (anonymous_visitor_id)
  where anonymous_visitor_id is not null;

create index if not exists user_sessions_session_token_idx
  on public.user_sessions (session_token);


-- ── 4. vehicles ───────────────────────────────────────────────
-- Canonical vehicle catalog for the AI decision engine.
-- Separate from ev_models which serves the legacy UI.
-- Use slug to cross-reference with ev_models.slug where needed.

create table if not exists public.vehicles (
  id                        uuid        primary key default gen_random_uuid(),
  brand                     text        not null,
  model                     text        not null,
  variant                   text,
  slug                      text        unique not null,
  body_type                 text,
  price_gbp                 numeric,
  battery_kwh               numeric,
  wltp_range_miles          numeric,
  efficiency_mi_per_kwh     numeric,
  charging_ac_kw            numeric,
  charging_dc_kw            numeric,
  charge_time_ac_hours      numeric,
  charge_time_dc_10_80_mins numeric,
  seats                     int,
  drivetrain                text,
  image_url                 text,
  status                    text        default 'active',
  created_at                timestamptz default now(),
  updated_at                timestamptz default now()
);

create index if not exists vehicles_brand_model_idx
  on public.vehicles (brand, model);

create index if not exists vehicles_status_idx
  on public.vehicles (status);

drop trigger if exists set_vehicles_updated_at on public.vehicles;
create trigger set_vehicles_updated_at
  before update on public.vehicles
  for each row execute function public.set_updated_at();


-- ── 5. user_events ───────────────────────────────────────────
-- ⚠️  SCHEMA CONFLICT — see migration header before running.
-- If the legacy user_events table still exists this statement
-- will no-op. Rename legacy table first:
--   ALTER TABLE public.user_events RENAME TO tracking_events;
-- Then run this migration.

create table if not exists public.user_events (
  id                    bigserial   primary key,
  session_id            uuid        references public.user_sessions (id)          on delete cascade,
  profile_id            uuid        references public.profiles (id)               on delete set null,
  anonymous_visitor_id  uuid        references public.anonymous_visitors (id)     on delete set null,
  event_name            text        not null,
  page_path             text,
  vehicle_id            uuid        references public.vehicles (id)               on delete set null,
  metadata              jsonb       default '{}'::jsonb,
  event_value           numeric,
  created_at            timestamptz default now()
);

create index if not exists user_events_session_id_idx
  on public.user_events (session_id);

create index if not exists user_events_profile_id_idx
  on public.user_events (profile_id)
  where profile_id is not null;

create index if not exists user_events_event_name_idx
  on public.user_events (event_name);

create index if not exists user_events_created_at_idx
  on public.user_events (created_at desc);


-- ── 6. consultations ─────────────────────────────────────────
-- Stores a structured EV decision-aid session.
-- Granular answers live in consultation_answers.

create table if not exists public.consultations (
  id                          uuid        primary key default gen_random_uuid(),
  session_id                  uuid        references public.user_sessions (id)      on delete set null,
  profile_id                  uuid        references public.profiles (id)           on delete set null,
  anonymous_visitor_id        uuid        references public.anonymous_visitors (id) on delete set null,
  budget_min_gbp              numeric,
  budget_max_gbp              numeric,
  target_monthly_payment_gbp  numeric,
  body_type_preference        text,
  daily_miles                 numeric,
  weekly_miles                numeric,
  yearly_miles                numeric,
  home_charging               boolean,
  public_charging_ok          boolean,
  main_reason_for_ev          text,
  range_priority              text,
  performance_priority        text,
  family_size                 int,
  brand_preference            text[],
  notes                       text,
  created_at                  timestamptz default now()
);

create index if not exists consultations_profile_id_idx
  on public.consultations (profile_id)
  where profile_id is not null;

create index if not exists consultations_session_id_idx
  on public.consultations (session_id)
  where session_id is not null;

create index if not exists consultations_created_at_idx
  on public.consultations (created_at desc);


-- ── 7. consultation_answers ──────────────────────────────────
-- Key/value pairs per wizard step, allowing flexible question sets
-- without schema changes. Use question_key as the stable identifier.

create table if not exists public.consultation_answers (
  id               uuid        primary key default gen_random_uuid(),
  consultation_id  uuid        not null references public.consultations (id) on delete cascade,
  question_key     text        not null,
  answer_text      text,
  answer_number    numeric,
  answer_boolean   boolean,
  answer_json      jsonb,
  step_number      int,
  created_at       timestamptz default now()
);

create index if not exists consultation_answers_consultation_id_idx
  on public.consultation_answers (consultation_id);


-- ── 8. ai_recommendations ────────────────────────────────────
-- Output of the AI recommendation engine for a consultation.
-- recommended_vehicle_ids is the full ranked list;
-- primary_vehicle_id is the top pick (denormalised for fast reads).

create table if not exists public.ai_recommendations (
  id                      uuid        primary key default gen_random_uuid(),
  consultation_id         uuid        not null references public.consultations (id)   on delete cascade,
  session_id              uuid        references public.user_sessions (id)            on delete set null,
  profile_id              uuid        references public.profiles (id)                 on delete set null,
  recommended_vehicle_ids uuid[]      not null,
  primary_vehicle_id      uuid        references public.vehicles (id)                 on delete set null,
  recommendation_payload  jsonb       not null,
  explanation             text,
  confidence_score        numeric,
  created_at              timestamptz default now()
);

create index if not exists ai_recommendations_consultation_id_idx
  on public.ai_recommendations (consultation_id);

create index if not exists ai_recommendations_profile_id_idx
  on public.ai_recommendations (profile_id)
  where profile_id is not null;


-- ── 9. finance_requests ──────────────────────────────────────
-- Structured finance intent capture from the AI wizard.
-- Distinct from finance_enquiries which stores legacy bank-
-- selection calculator submissions.

create table if not exists public.finance_requests (
  id                        uuid        primary key default gen_random_uuid(),
  session_id                uuid        references public.user_sessions (id)   on delete set null,
  profile_id                uuid        references public.profiles (id)        on delete set null,
  consultation_id           uuid        references public.consultations (id)   on delete set null,
  vehicle_id                uuid        references public.vehicles (id)        on delete set null,
  deposit_gbp               numeric,
  desired_term_months       int,
  estimated_income_band     text,
  target_monthly_budget_gbp numeric,
  employment_status         text,
  credit_self_rating        text,
  status                    text        default 'new',
  created_at                timestamptz default now()
);

create index if not exists finance_requests_profile_id_idx
  on public.finance_requests (profile_id)
  where profile_id is not null;

create index if not exists finance_requests_consultation_id_idx
  on public.finance_requests (consultation_id)
  where consultation_id is not null;

create index if not exists finance_requests_status_idx
  on public.finance_requests (status);


-- ── 10. lead_scores ──────────────────────────────────────────
-- AI-computed lead quality scores. One score row per
-- (session or profile + optional consultation) snapshot.
-- category: cold | warm | hot | qualified

create table if not exists public.lead_scores (
  id                  uuid        primary key default gen_random_uuid(),
  session_id          uuid        not null references public.user_sessions (id) on delete cascade,
  profile_id          uuid        references public.profiles (id)               on delete set null,
  consultation_id     uuid        references public.consultations (id)          on delete set null,
  score               int         not null default 0,
  category            text        not null default 'cold',
  scoring_reasons     jsonb       default '[]'::jsonb,
  last_calculated_at  timestamptz default now(),
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

create index if not exists lead_scores_profile_id_idx
  on public.lead_scores (profile_id)
  where profile_id is not null;

create index if not exists lead_scores_session_id_idx
  on public.lead_scores (session_id);

create index if not exists lead_scores_category_idx
  on public.lead_scores (category);

drop trigger if exists set_lead_scores_updated_at on public.lead_scores;
create trigger set_lead_scores_updated_at
  before update on public.lead_scores
  for each row execute function public.set_updated_at();


-- ── 11. lead_pipeline ────────────────────────────────────────
-- CRM stage-tracking for the AI platform.
-- Distinct from the existing leads table (raw form submissions).
-- stage: new | contacted | qualified | proposal | converted | lost

create table if not exists public.lead_pipeline (
  id                  uuid        primary key default gen_random_uuid(),
  profile_id          uuid        references public.profiles (id)          on delete set null,
  consultation_id     uuid        references public.consultations (id)     on delete set null,
  finance_request_id  uuid        references public.finance_requests (id)  on delete set null,
  assigned_to         text,
  stage               text        default 'new',
  priority            text        default 'normal',
  notes               text,
  updated_at          timestamptz default now(),
  created_at          timestamptz default now()
);

create index if not exists lead_pipeline_profile_id_idx
  on public.lead_pipeline (profile_id)
  where profile_id is not null;

create index if not exists lead_pipeline_stage_idx
  on public.lead_pipeline (stage);

create index if not exists lead_pipeline_assigned_to_idx
  on public.lead_pipeline (assigned_to)
  where assigned_to is not null;

drop trigger if exists set_lead_pipeline_updated_at on public.lead_pipeline;
create trigger set_lead_pipeline_updated_at
  before update on public.lead_pipeline
  for each row execute function public.set_updated_at();


-- ── 12. recommendation_feedback ──────────────────────────────
-- User response to an AI recommendation: which vehicle they
-- selected, and optional qualitative feedback.

create table if not exists public.recommendation_feedback (
  id                  uuid        primary key default gen_random_uuid(),
  recommendation_id   uuid        not null references public.ai_recommendations (id) on delete cascade,
  profile_id          uuid        references public.profiles (id)                    on delete set null,
  selected_vehicle_id uuid        references public.vehicles (id)                    on delete set null,
  feedback_type       text,
  feedback_note       text,
  created_at          timestamptz default now()
);

create index if not exists recommendation_feedback_recommendation_id_idx
  on public.recommendation_feedback (recommendation_id);

create index if not exists recommendation_feedback_profile_id_idx
  on public.recommendation_feedback (profile_id)
  where profile_id is not null;
