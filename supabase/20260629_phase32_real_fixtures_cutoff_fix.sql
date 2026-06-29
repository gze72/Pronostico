insert into public.app_settings (key, value, updated_at)
values
  ('phase32_exception_cutoff_20260628_ec', '"14:30"'::jsonb, now()),
  ('phase32_daily_lock_hour_ec', '12'::jsonb, now()),
  ('phase32_daily_lock_minute_ec', '0'::jsonb, now()),
  ('phase32_late_penalty_enabled', 'true'::jsonb, now()),
  ('phase32_fixture_version', '"real_round_of_32_safe_rollback_20260629"'::jsonb, now())
on conflict (key) do update
set value = excluded.value,
    updated_at = excluded.updated_at;
