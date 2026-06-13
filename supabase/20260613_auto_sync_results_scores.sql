-- Sincronización automática de resultados y recalculo de puntajes FASE 1

create table if not exists public.result_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'started' check (status in ('started','success','partial','failed')),
  matches_updated int not null default 0,
  message text,
  created_at timestamptz not null default now()
);

alter table public.result_sync_runs enable row level security;

drop policy if exists result_sync_runs_read_all on public.result_sync_runs;
create policy result_sync_runs_read_all on public.result_sync_runs for select using (true);

drop policy if exists result_sync_runs_insert_all on public.result_sync_runs;
create policy result_sync_runs_insert_all on public.result_sync_runs for insert with check (true);

alter table public.match_results add column if not exists external_match_key text;
alter table public.match_results add column if not exists fetched_at timestamptz;

create index if not exists match_results_external_match_key_idx on public.match_results(external_match_key);

create or replace function public.recalculate_phase1_scores()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.participant_scores(participant_id, phase, winner_points, score_points, total_points, evaluated_matches, updated_at)
  select
    f.participant_id,
    'phase1',
    coalesce(sum(case
      when (
        case
          when ((f.predictions -> r.match_id ->> 'homeGoals')::int) > ((f.predictions -> r.match_id ->> 'awayGoals')::int) then 'home'
          when ((f.predictions -> r.match_id ->> 'homeGoals')::int) < ((f.predictions -> r.match_id ->> 'awayGoals')::int) then 'away'
          else 'draw'
        end
      ) = (
        case
          when r.home_goals > r.away_goals then 'home'
          when r.home_goals < r.away_goals then 'away'
          else 'draw'
        end
      ) then 1 else 0 end), 0),
    coalesce(sum(case
      when ((f.predictions -> r.match_id ->> 'homeGoals')::int) = r.home_goals
       and ((f.predictions -> r.match_id ->> 'awayGoals')::int) = r.away_goals
      then 1 else 0 end), 0),
    coalesce(sum(case
      when (
        case
          when ((f.predictions -> r.match_id ->> 'homeGoals')::int) > ((f.predictions -> r.match_id ->> 'awayGoals')::int) then 'home'
          when ((f.predictions -> r.match_id ->> 'homeGoals')::int) < ((f.predictions -> r.match_id ->> 'awayGoals')::int) then 'away'
          else 'draw'
        end
      ) = (
        case
          when r.home_goals > r.away_goals then 'home'
          when r.home_goals < r.away_goals then 'away'
          else 'draw'
        end
      ) then 1 else 0 end), 0)
    + coalesce(sum(case
      when ((f.predictions -> r.match_id ->> 'homeGoals')::int) = r.home_goals
       and ((f.predictions -> r.match_id ->> 'awayGoals')::int) = r.away_goals
      then 1 else 0 end), 0),
    count(r.match_id),
    now()
  from public.forecasts f
  left join public.match_results r
    on f.predictions ? r.match_id
   and r.home_goals is not null
   and r.away_goals is not null
   and r.status = 'finished'
  where f.confirmed = true
  group by f.participant_id
  on conflict (participant_id, phase) do update set
    winner_points = excluded.winner_points,
    score_points = excluded.score_points,
    total_points = excluded.total_points,
    evaluated_matches = excluded.evaluated_matches,
    updated_at = now();
end;
$$;
