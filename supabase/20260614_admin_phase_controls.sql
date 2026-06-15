-- Controles administrativos de fase

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_settings enable row level security;

drop policy if exists app_settings_read_all on public.app_settings;
create policy app_settings_read_all on public.app_settings for select using (true);

drop policy if exists app_settings_insert_block_anon on public.app_settings;
create policy app_settings_insert_block_anon on public.app_settings for insert with check (false);

drop policy if exists app_settings_update_block_anon on public.app_settings;
create policy app_settings_update_block_anon on public.app_settings for update using (false) with check (false);

insert into public.app_settings(key, value)
values
  ('registration_enabled', 'true'::jsonb),
  ('phase1_predictions_locked', 'false'::jsonb)
on conflict (key) do nothing;

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_participant_id uuid references public.participants(id) on delete set null,
  action text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_actions enable row level security;

drop policy if exists admin_actions_read_all on public.admin_actions;
create policy admin_actions_read_all on public.admin_actions for select using (true);

drop policy if exists admin_actions_insert_block_anon on public.admin_actions;
create policy admin_actions_insert_block_anon on public.admin_actions for insert with check (false);
