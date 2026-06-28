-- FASE 2 / Pronóstico 16°
-- Bloqueo estricto 14:00 Ecuador + penalizaciones por partido

create table if not exists public.phase32_match_penalties (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  match_id text not null,
  penalty_type text not null default 'late_or_missing_prediction',
  reason text not null,
  deadline_at timestamptz not null,
  applied_by text not null default 'system',
  created_at timestamptz not null default now(),
  unique(participant_id, match_id)
);

alter table public.phase32_match_penalties enable row level security;

drop policy if exists "phase32_match_penalties_select_all" on public.phase32_match_penalties;
create policy "phase32_match_penalties_select_all"
on public.phase32_match_penalties
for select
using (true);

insert into public.app_settings(key, value)
values
  ('phase32_daily_lock_hour_ec', '14'::jsonb),
  ('phase32_daily_lock_minute_ec', '0'::jsonb),
  ('phase32_strict_match_lock_enabled', 'true'::jsonb),
  ('phase32_predictions_unlocked', 'false'::jsonb)
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

insert into public.phase32_match_penalties(participant_id, match_id, penalty_type, reason, deadline_at, applied_by)
select
  p.id,
  'R32-01',
  case when f.id is null then 'missing_prediction' else 'late_prediction' end,
  case
    when f.id is null then 'Sin pronóstico válido antes del cierre Sudáfrica vs Canadá.'
    else 'Pronóstico registrado o confirmado después del cierre 14:30 Ecuador para Sudáfrica vs Canadá.'
  end,
  timestamptz '2026-06-28 19:30:00+00',
  'admin-audit-20260628'
from public.participants p
left join public.phase32_forecasts f on f.participant_id = p.id
where f.id is null
   or coalesce(f.confirmed_at, f.updated_at) > timestamptz '2026-06-28 19:30:00+00'
on conflict(participant_id, match_id) do update set
  penalty_type = excluded.penalty_type,
  reason = excluded.reason,
  deadline_at = excluded.deadline_at,
  applied_by = excluded.applied_by;
