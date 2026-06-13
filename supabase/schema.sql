create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  unique_key text not null unique,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.teams (
  code text primary key,
  name text not null,
  flag text,
  group_id text not null check (group_id ~ '^[A-L]$')
);

create table if not exists public.matches (
  id text primary key,
  group_id text not null check (group_id ~ '^[A-L]$'),
  round text not null,
  match_no text not null,
  home_team text not null references public.teams(code),
  away_team text not null references public.teams(code)
);

create table if not exists public.forecasts (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null unique references public.participants(id) on delete cascade,
  predictions jsonb not null default '{}'::jsonb,
  confirmed boolean not null default false,
  status text not null default 'draft' check (status in ('draft','confirmed')),
  confirmed_at timestamptz,
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_forecasts_updated on public.forecasts;
create trigger trg_forecasts_updated before update on public.forecasts
for each row execute function public.set_updated_at();

alter table public.participants enable row level security;
alter table public.teams enable row level security;
alter table public.matches enable row level security;
alter table public.forecasts enable row level security;

-- Para MVP con clave única manejada por app. En producción se recomienda Supabase Auth.
create policy if not exists "read base catalog" on public.teams for select using (true);
create policy if not exists "read matches" on public.matches for select using (true);
create policy if not exists "participants app read" on public.participants for select using (true);
create policy if not exists "participants app insert" on public.participants for insert with check (true);
create policy if not exists "forecasts app read" on public.forecasts for select using (true);
create policy if not exists "forecasts app upsert" on public.forecasts for insert with check (true);
create policy if not exists "forecasts app update" on public.forecasts for update using (true) with check (true);

insert into public.participants(name, unique_key, role)
values ('Administrador', 'ADMIN2026!', 'admin')
on conflict (unique_key) do nothing;

-- Score real y puntaje FASE 1
-- Ejecutar en Supabase SQL Editor o aplicar como migración.

create table if not exists public.match_results (
  id uuid primary key default gen_random_uuid(),
  match_id text not null unique,
  home_goals int check (home_goals >= 0 and home_goals <= 99),
  away_goals int check (away_goals >= 0 and away_goals <= 99),
  source text not null default 'manual',
  source_url text,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished','postponed','cancelled')),
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.participant_scores (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  phase text not null default 'phase1',
  winner_points int not null default 0,
  score_points int not null default 0,
  total_points int not null default 0,
  evaluated_matches int not null default 0,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(participant_id, phase)
);

alter table public.match_results enable row level security;
alter table public.participant_scores enable row level security;

drop policy if exists match_results_read_all on public.match_results;
create policy match_results_read_all on public.match_results for select using (true);

drop policy if exists match_results_insert_all on public.match_results;
create policy match_results_insert_all on public.match_results for insert with check (true);

drop policy if exists match_results_update_all on public.match_results;
create policy match_results_update_all on public.match_results for update using (true) with check (true);

drop policy if exists participant_scores_read_all on public.participant_scores;
create policy participant_scores_read_all on public.participant_scores for select using (true);

drop policy if exists participant_scores_insert_all on public.participant_scores;
create policy participant_scores_insert_all on public.participant_scores for insert with check (true);

drop policy if exists participant_scores_update_all on public.participant_scores;
create policy participant_scores_update_all on public.participant_scores for update using (true) with check (true);

create index if not exists match_results_match_id_idx on public.match_results(match_id);
create index if not exists participant_scores_participant_id_idx on public.participant_scores(participant_id);

