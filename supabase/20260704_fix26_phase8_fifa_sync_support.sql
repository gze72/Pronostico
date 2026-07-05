-- Fix 26 - Soporte para sincronización FIFA de Pronóstico 8°
-- La tabla física vigente de resultados de Octavos en la app es phase16_results.
-- El nombre visual/funcional de la fase es Pronóstico 8°.

begin;

alter table public.phase16_results
  add column if not exists source_url text,
  add column if not exists external_match_key text,
  add column if not exists fetched_at timestamptz;

alter table public.phase16_results enable row level security;

drop policy if exists phase16_results_public_read on public.phase16_results;

create policy phase16_results_public_read
on public.phase16_results
for select
to public
using (true);

commit;

-- Validación:
-- select column_name
-- from information_schema.columns
-- where table_schema='public'
--   and table_name='phase16_results'
--   and column_name in ('source_url','external_match_key','fetched_at')
-- order by column_name;
--
-- select policyname, cmd
-- from pg_policies
-- where schemaname='public'
--   and tablename='phase16_results'
-- order by policyname;
