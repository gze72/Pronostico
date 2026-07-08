-- Fix 31 - Fase 4 / Cuartos de final - Pronóstico 4°
begin;

create table if not exists public.phase4_forecasts (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  predictions jsonb not null default '{}'::jsonb,
  confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft','confirmed','empty')),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.phase4_results (
  match_id text primary key,
  home_goals integer,
  away_goals integer,
  went_penalties boolean not null default false,
  penalty_winner text,
  status text not null default 'scheduled',
  source text not null default 'manual-admin',
  source_url text,
  external_match_key text,
  fetched_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint phase4_match_id_valid check (match_id in ('QF-01','QF-02','QF-03','QF-04')),
  constraint phase4_goals_non_negative check (
    (home_goals is null or home_goals >= 0)
    and (away_goals is null or away_goals >= 0)
  ),
  constraint phase4_penalty_requires_tie check (
    penalty_winner is null
    or (home_goals is not null and away_goals is not null and home_goals = away_goals)
  )
);

create index if not exists idx_phase4_forecasts_status on public.phase4_forecasts(status);
create index if not exists idx_phase4_results_status on public.phase4_results(status);

alter table public.phase4_forecasts enable row level security;
alter table public.phase4_results enable row level security;

drop policy if exists phase4_forecasts_public_read on public.phase4_forecasts;
drop policy if exists phase4_forecasts_public_write on public.phase4_forecasts;
drop policy if exists phase4_results_public_read on public.phase4_results;

create policy phase4_forecasts_public_read on public.phase4_forecasts for select to public using (true);
create policy phase4_forecasts_public_write on public.phase4_forecasts for all to public using (true) with check (true);
create policy phase4_results_public_read on public.phase4_results for select to public using (true);

insert into public.app_settings(key,value,updated_at)
values
  ('phase4_predictions_unlocked', 'true'::jsonb, now()),
  ('phase4_daily_lock_hour_ec', '11'::jsonb, now()),
  ('phase4_daily_lock_minute_ec', '0'::jsonb, now()),
  ('phase4_late_penalty_enabled', 'true'::jsonb, now()),
  ('phase4_strict_match_lock_enabled', 'true'::jsonb, now()),
  ('phase4_ranking_enabled', 'true'::jsonb, now()),
  ('phase4_fixture_version', '"fix31_cuartos_definitivos_20260708"'::jsonb, now()),
  ('phase8_predictions_unlocked', 'false'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

commit;
