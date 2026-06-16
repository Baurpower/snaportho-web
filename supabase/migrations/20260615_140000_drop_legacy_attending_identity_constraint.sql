-- Drop the remaining legacy attending coverage uniqueness object.
--
-- The live error names program_call_attending_assignments_identity_key, which
-- is the pre-slot uniqueness object. It can exist either as a table constraint
-- or as a unique index depending on how the environment was migrated.
--
-- Correct active uniqueness is:
--   program_id + coverage_date + coverage_scope + slot_id
-- for slot-aware rows, plus a separate legacy null-slot guard.

alter table if exists public.program_call_attending_assignments
  drop constraint if exists program_call_attending_assignments_identity_key;

alter table if exists public.program_call_attending_assignments
  drop constraint if exists program_call_attending_assignments_single_default_idx;

drop index if exists public.program_call_attending_assignments_identity_key;
drop index if exists public.program_call_attending_assignments_single_default_idx;
drop index if exists public.program_call_attending_assignments_slot_identity_key;
drop index if exists public.program_call_attending_assignments_legacy_identity_key;

do $$
begin
  if exists (
    select 1
    from public.program_call_attending_assignments
    where is_active = true
      and slot_id is not null
    group by program_id, coverage_date, coverage_scope, slot_id
    having count(*) > 1
  ) then
    raise exception 'Cannot create slot-aware attending coverage index: duplicate active program/date/scope/slot rows exist.';
  end if;

  if exists (
    select 1
    from public.program_call_attending_assignments
    where is_active = true
      and slot_id is null
    group by program_id, coverage_date, coverage_scope
    having count(*) > 1
  ) then
    raise exception 'Cannot create legacy attending coverage index: duplicate active program/date/scope null-slot rows exist.';
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

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.program_call_attending_assignments'::regclass
      and conname = 'program_call_attending_assignments_identity_key'
  ) then
    raise exception 'Legacy table constraint program_call_attending_assignments_identity_key still exists after repair.';
  end if;

  if exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'program_call_attending_assignments'
      and indexname = 'program_call_attending_assignments_identity_key'
  ) then
    raise exception 'Legacy index program_call_attending_assignments_identity_key still exists after repair.';
  end if;
end
$$;

notify pgrst, 'reload schema';
