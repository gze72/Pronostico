-- Restringe escritura directa de Score real para clientes anon.
-- La escritura debe hacerse por la Edge Function admin-save-real-score,
-- que valida que el participante tenga role='admin'.

drop policy if exists match_results_insert_all on public.match_results;
drop policy if exists match_results_update_all on public.match_results;
drop policy if exists match_results_delete_all on public.match_results;
drop policy if exists match_results_insert_block_anon on public.match_results;
drop policy if exists match_results_update_block_anon on public.match_results;

create policy match_results_insert_block_anon
on public.match_results
for insert
with check (false);

create policy match_results_update_block_anon
on public.match_results
for update
using (false)
with check (false);

drop policy if exists match_results_read_all on public.match_results;
create policy match_results_read_all
on public.match_results
for select
using (true);
