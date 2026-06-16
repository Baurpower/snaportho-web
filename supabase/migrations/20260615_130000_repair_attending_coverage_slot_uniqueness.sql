-- Repair attending coverage uniqueness for multi-slot assignments.
--
-- Older databases may still have one of the legacy uniqueness objects:
--   program_call_attending_assignments_identity_key
--   program_call_attending_assignments_single_default_idx
--
-- Those objects do not include slot_id, and the identity key also ignores
-- is_active. That can block saving a month with more than one coverage slot,
-- or even block replacement inserts after the RPC marks old rows inactive.

create table if not exists public.program_attending_coverage_slots (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  name text not null,
  abbreviation text not null,
  color text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  description text,
  created_by uuid null references auth.users(id) on delete set null,
  updated_by uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_attending_coverage_slots_name_check check (length(btrim(name)) > 0),
  constraint program_attending_coverage_slots_abbr_check check (length(btrim(abbreviation)) > 0)
);

alter table public.program_call_attending_assignments
  add column if not exists slot_id uuid null references public.program_attending_coverage_slots(id) on delete restrict;

do $$
begin
  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'program_call_attending_assignments'
      and constraint_name = 'program_call_attending_assignments_identity_key'
  ) then
    alter table public.program_call_attending_assignments
      drop constraint program_call_attending_assignments_identity_key;
  end if;

  if exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'program_call_attending_assignments'
      and constraint_name = 'program_call_attending_assignments_single_default_idx'
  ) then
    alter table public.program_call_attending_assignments
      drop constraint program_call_attending_assignments_single_default_idx;
  end if;
end
$$;

drop index if exists public.program_call_attending_assignments_identity_key;
drop index if exists public.program_call_attending_assignments_single_default_idx;
drop index if exists public.program_call_attending_assignments_slot_identity_key;
drop index if exists public.program_call_attending_assignments_legacy_identity_key;

create index if not exists program_attending_coverage_slots_program_active_idx
  on public.program_attending_coverage_slots (program_id, is_active, sort_order, name);

alter table public.program_attending_coverage_slots enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_attending_coverage_slots'
      and policyname = 'Program members can read coverage slots'
  ) then
    create policy "Program members can read coverage slots"
      on public.program_attending_coverage_slots
      for select
      using (public.is_active_program_member_for_attendings(program_id));
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'program_attending_coverage_slots'
      and policyname = 'Program call editors can manage coverage slots'
  ) then
    create policy "Program call editors can manage coverage slots"
      on public.program_attending_coverage_slots
      for all
      using (public.can_manage_program_attendings(program_id))
      with check (public.can_manage_program_attendings(program_id));
  end if;
end
$$;

create unique index program_call_attending_assignments_slot_identity_key
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope,
    slot_id
  )
  where slot_id is not null and is_active = true;

create unique index program_call_attending_assignments_legacy_identity_key
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope
  )
  where slot_id is null and is_active = true;

create index if not exists program_call_attending_assignments_slot_idx
  on public.program_call_attending_assignments (slot_id, coverage_date);

notify pgrst, 'reload schema';
