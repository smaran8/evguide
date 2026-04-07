create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.user_intent_profiles(id) on delete cascade,
  status text not null default 'new' check (status in ('new', 'qualified', 'nurture', 'hot', 'contacted', 'follow_up', 'converted', 'closed_lost')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  owner_name text,
  tags text[] not null default '{}',
  last_contacted_at timestamptz,
  next_follow_up_at timestamptz,
  qualification_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_leads_status_idx on public.crm_leads(status);
create index if not exists crm_leads_priority_idx on public.crm_leads(priority);
create index if not exists crm_leads_next_follow_up_at_idx on public.crm_leads(next_follow_up_at);

drop trigger if exists set_crm_leads_updated_at on public.crm_leads;
create trigger set_crm_leads_updated_at
before update on public.crm_leads
for each row
execute function public.set_updated_at();

create table if not exists public.crm_lead_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.user_intent_profiles(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists crm_lead_notes_profile_id_idx on public.crm_lead_notes(profile_id, created_at desc);
