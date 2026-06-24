-- ============================================================
-- CasePrep Content Review — Phase 2 section review state
-- ============================================================
-- Stores one active review decision per section per procedure.
-- Upsert on (procedure_slug, section_key) to update in place.
-- Content edits are written back to modules.json via FastAPI;
-- this table only tracks reviewer decisions, not content.
-- ============================================================

create table if not exists public.caseprep_section_reviews (
  id              uuid        primary key default gen_random_uuid(),
  procedure_slug  text        not null,
  section_key     text        not null,
  reviewer_id     uuid        not null references auth.users(id) on delete cascade,
  status          text        not null default 'unreviewed'
                                check (status in ('unreviewed', 'needs_improvement', 'approved')),
  comment         text        null,
  reviewed_at     timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One active record per section. Upsert replaces in place.
  unique (procedure_slug, section_key)
);

-- Indexes
create index if not exists caseprep_section_reviews_slug_idx
  on public.caseprep_section_reviews (procedure_slug);

create index if not exists caseprep_section_reviews_reviewer_idx
  on public.caseprep_section_reviews (reviewer_id);

create index if not exists caseprep_section_reviews_status_idx
  on public.caseprep_section_reviews (status);

-- updated_at trigger
create or replace function public.caseprep_section_reviews_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists caseprep_section_reviews_updated_at on public.caseprep_section_reviews;
create trigger caseprep_section_reviews_updated_at
  before update on public.caseprep_section_reviews
  for each row
  execute function public.caseprep_section_reviews_set_updated_at();

-- RLS
alter table public.caseprep_section_reviews enable row level security;

-- Active reviewers can read all section reviews (needed to show who approved what)
drop policy if exists caseprep_section_reviews_select on public.caseprep_section_reviews;
create policy caseprep_section_reviews_select
  on public.caseprep_section_reviews
  for select
  to authenticated
  using (public.is_caseprep_reviewer());

-- Active reviewers can insert their own reviews
drop policy if exists caseprep_section_reviews_insert on public.caseprep_section_reviews;
create policy caseprep_section_reviews_insert
  on public.caseprep_section_reviews
  for insert
  to authenticated
  with check (
    reviewer_id = auth.uid()
    and public.is_caseprep_reviewer()
  );

-- Reviewers can update their own reviews; content_admin can update any
drop policy if exists caseprep_section_reviews_update on public.caseprep_section_reviews;
create policy caseprep_section_reviews_update
  on public.caseprep_section_reviews
  for update
  to authenticated
  using (
    reviewer_id = auth.uid()
    or public.caseprep_reviewer_role() = 'content_admin'
  );

-- No client-side DELETE policy.
