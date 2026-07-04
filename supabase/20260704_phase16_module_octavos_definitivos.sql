-- Fix 21B - Módulo Fase 3 / Octavos definitivos
-- Reemplaza al SQL del Fix 21 anterior.
-- Crea almacenamiento para pronósticos y resultados reales de 8vos.
-- No modifica datos existentes de Fase 1 ni Pronóstico 16°.

begin;

create table if not exists public.phase16_forecasts (
  participant_id uuid primary key references public.participants(id) on delete cascade,
  predictions jsonb not null default '{}'::jsonb,
  confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft','confirmed','empty')),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.phase16_results (
  match_id text primary key,
  home_goals integer,
  away_goals integer,
  went_penalties boolean not null default false,
  penalty_winner text,
  status text not null default 'scheduled',
  source text not null default 'manual-admin',
  updated_at timestamptz not null default now(),
  constraint phase16_match_id_valid check (match_id in (
    'R16-01','R16-02','R16-03','R16-04',
    'R16-05','R16-06','R16-07','R16-08'
  )),
  constraint phase16_goals_non_negative check (
    (home_goals is null or home_goals >= 0)
    and (away_goals is null or away_goals >= 0)
  ),
  constraint phase16_penalty_requires_tie check (
    penalty_winner is null
    or (home_goals is not null and away_goals is not null and home_goals = away_goals)
  )
);

create index if not exists idx_phase16_forecasts_status on public.phase16_forecasts(status);
create index if not exists idx_phase16_results_status on public.phase16_results(status);

insert into public.app_settings(key,value,updated_at)
values
  ('phase16_predictions_unlocked', 'false'::jsonb, now()),
  ('phase16_daily_lock_hour_ec', '11'::jsonb, now()),
  ('phase16_daily_lock_minute_ec', '0'::jsonb, now()),
  ('phase16_late_penalty_enabled', 'true'::jsonb, now()),
  ('phase16_strict_match_lock_enabled', 'true'::jsonb, now()),
  ('phase16_ranking_enabled', 'true'::jsonb, now()),
  ('phase16_fixture_version', '"fix21b_octavos_definitivos_20260704"'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

commit;

-- Validación:
-- select table_name from information_schema.tables
-- where table_schema='public'
-- and table_name in ('phase16_forecasts','phase16_results');
--
-- select key,value from public.app_settings
-- where key like 'phase16_%'
-- order by key;
