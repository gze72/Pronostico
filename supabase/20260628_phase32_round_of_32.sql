-- Segunda fase / Pronóstico 16°

create table if not exists public.phase32_forecasts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  predictions jsonb not null default '{}'::jsonb,
  confirmed boolean not null default false,
  status text not null default 'draft',
  confirmed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(participant_id)
);

create table if not exists public.phase32_results (
  id uuid primary key default gen_random_uuid(),
  match_id text not null unique,
  home_goals integer,
  away_goals integer,
  went_penalties boolean not null default false,
  penalty_winner text,
  status text not null default 'scheduled',
  source text not null default 'manual-admin',
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

insert into public.app_settings(key,value)
values ('phase32_predictions_unlocked','false'::jsonb)
on conflict (key) do nothing;

alter table public.phase32_forecasts enable row level security;
alter table public.phase32_results enable row level security;

drop policy if exists "phase32_forecasts_public_read" on public.phase32_forecasts;
create policy "phase32_forecasts_public_read" on public.phase32_forecasts
for select using (true);

drop policy if exists "phase32_forecasts_public_write" on public.phase32_forecasts;
create policy "phase32_forecasts_public_write" on public.phase32_forecasts
for all using (true) with check (true);

drop policy if exists "phase32_results_public_read" on public.phase32_results;
create policy "phase32_results_public_read" on public.phase32_results
for select using (true);

drop policy if exists "phase32_results_public_write" on public.phase32_results;
create policy "phase32_results_public_write" on public.phase32_results
for all using (true) with check (true);


-- Ajuste 2026-06-28: fixtures reales de 16avos definidos por el administrador.
-- Se limpian únicamente los resultados de la fase 16° con IDs anteriores calculados erróneamente.
delete from public.phase32_results
where match_id like 'M%' or match_id like '16°-%';

-- Como los cruces anteriores eran incorrectos, se reinicia el pronóstico 16° para evitar
-- que un participante quede confirmado/bloqueado con partidos que ya no corresponden.
update public.phase32_forecasts
set predictions = '{}'::jsonb,
    confirmed = false,
    status = 'draft',
    confirmed_at = null,
    updated_at = now();

-- Registro informativo de la configuración vigente.
insert into public.app_settings(key,value)
values ('phase32_fixture_version','"real_round_of_32_20260628"'::jsonb)
on conflict (key) do update set value = excluded.value;
