-- Fix 10 - Actualizar resultado final Brasil vs Japón
-- Resultado verificado: Brasil 2 - 1 Japón.
-- Ejecutar en Supabase SQL Editor.

update public.phase32_results
set
  home_goals = 2,
  away_goals = 1,
  went_penalties = false,
  penalty_winner = null,
  status = 'finished',
  source = 'manual-admin-final-fifa-confirmed',
  updated_at = now()
where match_id = 'R32-02';

-- Validación:
-- select match_id, home_goals, away_goals, status, source
-- from public.phase32_results
-- where match_id in ('R32-01','R32-02','R32-03')
-- order by match_id;
