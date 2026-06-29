-- Regla corregida Pronóstico 16°
-- 28/jun/2026: cierre excepcional 14:30 Ecuador = 19:30 UTC.
-- Desde 29/jun/2026 en adelante: cierre diario 12:00 Ecuador = 17:00 UTC.

insert into public.app_settings (key, value, updated_at)
values
  ('phase32_initial_cutoff_iso', '"2026-06-28T19:30:00.000Z"'::jsonb, now()),
  ('phase32_initial_cutoff_label', '"28/jun/2026 14:30 Ecuador"'::jsonb, now()),
  ('phase32_daily_lock_hour_ec', '12'::jsonb, now()),
  ('phase32_daily_lock_minute_ec', '0'::jsonb, now()),
  ('phase32_late_penalty_enabled', 'true'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;
