-- Run this in Supabase SQL Editor.
-- It creates a profiles table used by admin checks and keeps it in sync with auth.users.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles enable row level security;

-- Users can read and update their own profile only.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

-- Service role can manage all profiles.
drop policy if exists "profiles_all_service_role" on public.profiles;
create policy "profiles_all_service_role"
  on public.profiles
  for all
  to service_role
  using (true)
  with check (true);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- Backfill profiles for existing auth users.
insert into public.profiles (id, full_name)
select u.id, u.raw_user_meta_data ->> 'full_name'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Helper to promote a user to admin.
-- Example:
-- select public.promote_user_to_admin('admin@example.com');
create or replace function public.promote_user_to_admin(user_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user_id uuid;
begin
  select id into target_user_id
  from auth.users
  where lower(email) = lower(user_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No auth user found for email %', user_email;
  end if;

  update public.profiles
  set role = 'admin'
  where id = target_user_id;

  if not found then
    insert into public.profiles (id, role)
    values (target_user_id, 'admin');
  end if;
end;
$$;

-- Follow-up table for admin outreach (name, email, phone, login activity).
create table if not exists public.user_followups (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  email text not null,
  phone_number text,
  first_seen_at timestamptz not null default timezone('utc', now()),
  last_login_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.user_followups enable row level security;

drop policy if exists "user_followups_select_own" on public.user_followups;
create policy "user_followups_select_own"
  on public.user_followups
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "user_followups_insert_own" on public.user_followups;
create policy "user_followups_insert_own"
  on public.user_followups
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "user_followups_update_own" on public.user_followups;
create policy "user_followups_update_own"
  on public.user_followups
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "user_followups_all_service_role" on public.user_followups;
create policy "user_followups_all_service_role"
  on public.user_followups
  for all
  to service_role
  using (true)
  with check (true);

drop trigger if exists set_user_followups_updated_at on public.user_followups;
create trigger set_user_followups_updated_at
before update on public.user_followups
for each row
execute function public.set_updated_at();

-- Backfill existing users for immediate visibility.
insert into public.user_followups (user_id, full_name, email, phone_number)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'full_name', p.full_name),
  coalesce(u.email, ''),
  u.raw_user_meta_data ->> 'phone_number'
from auth.users u
left join public.profiles p on p.id = u.id
left join public.user_followups f on f.user_id = u.id
where f.user_id is null;