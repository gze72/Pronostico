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
