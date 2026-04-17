-- ─────────────────────────────────────────────────────────────────────────────
-- Migration 012: Super admin role + safe signup defaults
--
-- Changes:
--   1. Extend profiles.role to accept 'super_admin'
--   2. Add trigger: auto-insert profile with role='user' on every new signup
--   3. Promote smaranbasnet5@gmail.com to super_admin
--   4. Any existing profile with no row yet → gets created as 'user'
-- ─────────────────────────────────────────────────────────────────────────────


-- 1. Widen the role check constraint to include super_admin
--    (drop and re-add so it's idempotent)

alter table public.profiles
  drop constraint if exists profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));


-- 2. Ensure profiles has a role column with a safe default
--    (no-op if the column already exists with a default)

alter table public.profiles
  alter column role set default 'user';


-- 3. Trigger function: create a profile row for every new auth.users sign-up
--    with role = 'user'. Uses ON CONFLICT DO NOTHING so re-runs are safe.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', null),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Attach (or re-attach) trigger to auth.users
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();


-- 4. Backfill: create a 'user' profile row for any auth user who has none yet
--    (covers accounts created before this trigger existed)

insert into public.profiles (id, email, role)
select
  u.id,
  u.email,
  'user'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;


-- 5. Promote smaranbasnet5@gmail.com to super_admin

update public.profiles
set role = 'super_admin'
where id = (
  select id from auth.users
  where email = 'smaranbasnet5@gmail.com'
  limit 1
);
