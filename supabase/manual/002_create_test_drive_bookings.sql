create table if not exists public.test_drive_bookings (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.user_intent_profiles(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text not null,
  ev_model_id uuid references public.ev_models(id) on delete set null,
  ev_model_label text,
  preferred_date date not null,
  preferred_time_slot text not null,
  preferred_location text not null,
  current_vehicle text,
  notes text,
  status text not null default 'requested' check (status in ('requested', 'reviewing', 'scheduled', 'completed', 'cancelled')),
  admin_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists test_drive_bookings_profile_id_idx
  on public.test_drive_bookings(profile_id, created_at desc);

create index if not exists test_drive_bookings_user_id_idx
  on public.test_drive_bookings(user_id, created_at desc);

create index if not exists test_drive_bookings_status_idx
  on public.test_drive_bookings(status, created_at desc);

drop trigger if exists set_test_drive_bookings_updated_at on public.test_drive_bookings;
create trigger set_test_drive_bookings_updated_at
before update on public.test_drive_bookings
for each row
execute function public.set_updated_at();
