-- ============================================================
-- CasePrep Content Review — Phase 1 reviewer allowlist
-- ============================================================

create table if not exists public.caseprep_reviewers (
  user_id uuid primary key
    references auth.users(id) on delete cascade,
  role text not null,
  display_name text null,
  specialty text null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid null references auth.users(id) on delete set null,
  constraint caseprep_reviewers_role_check
    check (
      role in (
        'viewer',
        'resident_reviewer',
        'attending_reviewer',
        'certifier',
        'content_admin'
      )
    )
);

create index if not exists caseprep_reviewers_active_role_idx
  on public.caseprep_reviewers (is_active, role);

alter table public.caseprep_reviewers enable row level security;

create or replace function public.is_caseprep_reviewer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.caseprep_reviewers cr
    where cr.user_id = auth.uid()
      and cr.is_active = true
  );
$$;

create or replace function public.caseprep_reviewer_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select cr.role
  from public.caseprep_reviewers cr
  where cr.user_id = auth.uid()
    and cr.is_active = true
  limit 1;
$$;

drop policy if exists caseprep_reviewers_select_own on public.caseprep_reviewers;
create policy caseprep_reviewers_select_own
  on public.caseprep_reviewers
  for select
  to authenticated
  using (user_id = auth.uid() and is_active = true);