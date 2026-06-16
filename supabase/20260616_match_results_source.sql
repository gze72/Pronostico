-- Campos de auditoría para resultados sincronizados desde FIFA

alter table public.match_results
add column if not exists source text default 'manual';

alter table public.match_results
add column if not exists updated_at timestamptz default now();

create index if not exists match_results_source_idx
on public.match_results(source);
