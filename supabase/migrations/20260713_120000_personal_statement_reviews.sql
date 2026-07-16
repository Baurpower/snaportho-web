create table if not exists public.personal_statement_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'completed' check (status in ('processing', 'completed', 'failed')),
  source_type text not null check (source_type in ('paste', 'docx', 'pdf', 'txt')),
  original_filename text null,
  statement_text text not null,
  statement_hash text not null,
  word_count integer not null check (word_count > 0),
  model text not null,
  prompt_version text not null,
  review_schema_version text not null,
  review_json jsonb not null,
  error_code text null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null,
  updated_at timestamptz not null default now()
);
create index if not exists personal_statement_reviews_user_created_idx on public.personal_statement_reviews (user_id, created_at desc);
create index if not exists personal_statement_reviews_user_hash_idx on public.personal_statement_reviews (user_id, statement_hash);
alter table public.personal_statement_reviews enable row level security;
drop policy if exists personal_statement_reviews_select_own on public.personal_statement_reviews;
create policy personal_statement_reviews_select_own on public.personal_statement_reviews for select to authenticated using (auth.uid() = user_id);
drop policy if exists personal_statement_reviews_insert_own on public.personal_statement_reviews;
create policy personal_statement_reviews_insert_own on public.personal_statement_reviews for insert to authenticated with check (auth.uid() = user_id);
drop policy if exists personal_statement_reviews_delete_own on public.personal_statement_reviews;
create policy personal_statement_reviews_delete_own on public.personal_statement_reviews for delete to authenticated using (auth.uid() = user_id);
create or replace function public.personal_statement_reviews_set_updated_at() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists personal_statement_reviews_updated_at on public.personal_statement_reviews;
create trigger personal_statement_reviews_updated_at before update on public.personal_statement_reviews for each row execute function public.personal_statement_reviews_set_updated_at();
