-- Fix 35 - Cierre único de Pronóstico 4°
-- Periodo permitido:
-- Hasta 2026-07-09 14:59 Ecuador.
-- Desde 15:00 Ecuador se bloquea automáticamente.
--
-- phase4_predictions_unlocked queda en false para que el control de fecha/hora aplique normalmente.
-- Solo debe ponerse en true si ADMIN habilita una excepción manual.

update public.app_settings
set value = 'false'::jsonb,
    updated_at = now()
where key = 'phase4_predictions_unlocked';

insert into public.app_settings(key,value,updated_at)
values
  ('phase4_cutoff_ec', '"2026-07-09 14:59 Ecuador"'::jsonb, now()),
  ('phase4_cutoff_utc', '"2026-07-09T20:00:00Z"'::jsonb, now()),
  ('phase4_daily_lock_hour_ec', '14'::jsonb, now()),
  ('phase4_daily_lock_minute_ec', '59'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;

-- Validación:
-- select key,value from public.app_settings
-- where key like 'phase4_%'
-- order by key;
