-- Sincronización FIFA para Dieciseisavos / Pronóstico 16°

alter table public.phase32_results
add column if not exists source_url text;

alter table public.phase32_results
add column if not exists external_match_key text;

alter table public.phase32_results
add column if not exists fetched_at timestamptz;

create index if not exists phase32_results_source_idx
on public.phase32_results(source);

create index if not exists phase32_results_external_key_idx
on public.phase32_results(external_match_key);
