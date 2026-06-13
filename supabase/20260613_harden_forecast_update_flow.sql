-- Garantiza que cada participante tenga un solo registro de pronóstico
-- y que el guardado parcial pueda actualizarse varias veces sin perder datos.

create unique index if not exists forecasts_participant_id_unique_idx
on public.forecasts(participant_id);

alter table public.forecasts alter column match_id drop not null;
alter table public.forecasts alter column predicted_home_goals drop not null;
alter table public.forecasts alter column predicted_away_goals drop not null;

alter table public.forecasts add column if not exists status text not null default 'draft';
alter table public.forecasts drop constraint if exists forecasts_status_check;
alter table public.forecasts add constraint forecasts_status_check check (status in ('draft','confirmed'));

update public.forecasts
set status = case
  when confirmed = true or confirmed_at is not null then 'confirmed'
  else 'draft'
end
where status is null or status not in ('draft','confirmed');
