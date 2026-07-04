-- Fix 25 - Llaves independientes para Pronóstico 8°
-- Corrige la separación de fases:
-- Pronóstico 16° debe usar phase16_* y quedar histórico/bloqueado.
-- Pronóstico 8° debe usar phase8_* y quedar habilitado para usuarios.

begin;

insert into public.app_settings(key,value,updated_at)
values
  ('phase8_predictions_unlocked', 'true'::jsonb, now()),
  ('phase8_daily_lock_hour_ec', '11'::jsonb, now()),
  ('phase8_daily_lock_minute_ec', '0'::jsonb, now()),
  ('phase8_late_penalty_enabled', 'true'::jsonb, now()),
  ('phase8_strict_match_lock_enabled', 'true'::jsonb, now()),
  ('phase8_ranking_enabled', 'true'::jsonb, now()),
  ('phase8_fixture_version', '"fix21b_octavos_definitivos_20260704"'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

-- Pronóstico 16° queda como fase histórica cerrada.
insert into public.app_settings(key,value,updated_at)
values ('phase16_predictions_unlocked', 'false'::jsonb, now())
on conflict (key) do update
set value = 'false'::jsonb,
    updated_at = now();

commit;

-- Validación:
-- select key,value,updated_at
-- from public.app_settings
-- where key like 'phase8_%' or key='phase16_predictions_unlocked'
-- order by key;
