-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 013: Quote form → consultation_requests
--
-- Changes:
--   1. Add 'quote' to leads.interest_type check (idempotent with 010b)
--   2. Make consultation_requests.user_id nullable so anonymous quote
--      requests can be stored there alongside authenticated ones
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Widen leads interest_type constraint
alter table public.leads
  drop constraint if exists leads_interest_type_check;

alter table public.leads
  add constraint leads_interest_type_check
  check (interest_type in ('test_drive', 'finance', 'compare', 'sell', 'quote'));


-- 2. Make consultation_requests.user_id nullable
--    (allows anonymous quote submissions from the vehicle detail page)
alter table public.consultation_requests
  alter column user_id drop not null;
