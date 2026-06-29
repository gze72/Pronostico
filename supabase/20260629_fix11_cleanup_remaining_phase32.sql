-- Fix 11 - Regularización pendiente Pronóstico 16°
-- SQL only. No toca frontend, Edge Functions ni estructura.

-- 1) Limpiar penaltyWinner inválido restante de Dominic Ramirez en R32-10.
update public.phase32_forecasts f
set predictions = jsonb_set(
      f.predictions,
      array['R32-10', 'penaltyWinner'],
      'null'::jsonb,
      true
    ),
    updated_at = now()
from public.participants p
where p.id = f.participant_id
  and p.name = 'Dominic Ramirez'
  and f.predictions->'R32-10'->>'penaltyWinner' = 'USA';

-- 2) Eliminar fila automática vacía de R32-03 si quedó como scheduled sin marcador.
delete from public.phase32_results
where match_id = 'R32-03'
  and home_goals is null
  and away_goals is null
  and lower(coalesce(source,'')) like 'fifa-auto-cleared%';

-- 3) Registrar versión.
insert into public.app_settings (key, value, updated_at)
values
  ('phase32_cleanup_fix_version', '"fix11_cleanup_remaining_20260629"'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

-- Validación 1:
-- select p.name,
--        f.predictions->'R32-10'->>'penaltyWinner' as r32_10_penalty_winner
-- from public.phase32_forecasts f
-- join public.participants p on p.id=f.participant_id
-- where p.name = 'Dominic Ramirez';

-- Validación 2:
-- select match_id, home_goals, away_goals, status, source
-- from public.phase32_results
-- where match_id in ('R32-01','R32-02','R32-03')
-- order by match_id;
