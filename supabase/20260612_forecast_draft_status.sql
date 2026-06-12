-- Permite guardar borradores parciales de pronósticos en Supabase.
alter table public.forecasts alter column predicted_home_goals drop not null;
alter table public.forecasts alter column predicted_away_goals drop not null;

alter table public.forecasts add column if not exists status text not null default 'draft';
alter table public.forecasts drop constraint if exists forecasts_status_check;
alter table public.forecasts add constraint forecasts_status_check check (status in ('draft','confirmed'));

update public.forecasts
set status = case
  when confirmed = true or confirmed_at is not null then 'confirmed'
  else 'draft'
end;

create index if not exists forecasts_status_idx on public.forecasts(status);
