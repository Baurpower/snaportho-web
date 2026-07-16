create table if not exists public.personal_statement_comparisons (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
  source_review_id_a uuid null references public.personal_statement_reviews(id) on delete cascade,
  source_review_id_b uuid null references public.personal_statement_reviews(id) on delete cascade,
  statement_hash_a text not null, statement_hash_b text not null,
  model text not null, prompt_version text not null, comparison_schema_version text not null,
  comparison_json jsonb not null, created_at timestamptz not null default now(),
  check (source_review_id_a is null or source_review_id_b is null or source_review_id_a <> source_review_id_b), check (statement_hash_a <> statement_hash_b)
);
create index if not exists personal_statement_comparisons_user_created_idx on public.personal_statement_comparisons (user_id, created_at desc);
alter table public.personal_statement_comparisons enable row level security;
drop policy if exists personal_statement_comparisons_select_own on public.personal_statement_comparisons;
create policy personal_statement_comparisons_select_own on public.personal_statement_comparisons for select to authenticated using (auth.uid() = user_id);
drop policy if exists personal_statement_comparisons_insert_own on public.personal_statement_comparisons;
create policy personal_statement_comparisons_insert_own on public.personal_statement_comparisons for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists personal_statement_comparisons_delete_own on public.personal_statement_comparisons;
create policy personal_statement_comparisons_delete_own on public.personal_statement_comparisons for delete to authenticated using (auth.uid() = user_id);
