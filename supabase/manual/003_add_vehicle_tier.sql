alter table public.ev_models
add column if not exists tier text;

update public.ev_models
set tier = case
  when price <= 32000 then 'affordable'
  when price <= 46000 then 'mid'
  else 'premium'
end
where tier is null
   or tier not in ('affordable', 'mid', 'premium');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'ev_models_tier_check'
  ) then
    alter table public.ev_models
    add constraint ev_models_tier_check
    check (tier in ('affordable', 'mid', 'premium'));
  end if;
end $$;
