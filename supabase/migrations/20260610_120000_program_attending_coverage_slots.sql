-- Migration: Add support for configurable coverage slots/services for attending coverage.
-- This allows multiple slots per day (e.g. Ortho, Hand, Trauma) and assigning specific attendings to each.

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

create index if not exists program_attending_coverage_slots_program_active_idx
  on public.program_attending_coverage_slots (program_id, is_active, sort_order, name);

-- Add slot_id to existing assignments table for slot-aware coverage.
-- slot_id is nullable for backward compat during migration.
alter table public.program_call_attending_assignments
  add column if not exists slot_id uuid null references public.program_attending_coverage_slots(id) on delete restrict;

-- The active assignment identity is program + date + scope + slot.
-- Drop the legacy identities that prevented more than one slot on a date.
drop index if exists public.program_call_attending_assignments_identity_key;
drop index if exists public.program_call_attending_assignments_single_default_idx;
drop index if exists public.program_call_attending_assignments_slot_identity_key;

create unique index program_call_attending_assignments_slot_identity_key
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope,
    slot_id
  )
  where slot_id is not null and is_active = true;

create unique index if not exists program_call_attending_assignments_legacy_identity_key
  on public.program_call_attending_assignments (
    program_id,
    coverage_date,
    coverage_scope
  )
  where slot_id is null and is_active = true;

create index if not exists program_call_attending_assignments_slot_idx
  on public.program_call_attending_assignments (slot_id, coverage_date);

-- RLS for new slots table (reuse attendings permission model for simplicity).
alter table public.program_attending_coverage_slots enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'program_attending_coverage_slots'
      and policyname = 'Program members can read coverage slots'
  ) then
    create policy "Program members can read coverage slots"
      on public.program_attending_coverage_slots
      for select
      using (public.is_active_program_member_for_attendings(program_id));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'program_attending_coverage_slots'
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

-- Add slot_id to the existing select policies if needed (the column is new, queries will be updated in code).
-- The existing policies on assignments remain; slot_id is just an additional column.

-- Data migration: For each program that has attendings or assignments, ensure a default "Ortho" slot exists,
-- and migrate legacy assignments (where slot_id is null) to the default slot.
do $$
declare
  prog record;
  default_slot_id uuid;
begin
  for prog in
    select distinct p.id as program_id
    from public.programs p
    left join public.program_attendings pa on pa.program_id = p.id
    left join public.program_call_attending_assignments pca on pca.program_id = p.id
    where pa.id is not null or pca.id is not null
  loop
    -- Create default slot if not exists for this program
    insert into public.program_attending_coverage_slots (program_id, name, abbreviation, color, is_active, sort_order)
    select prog.program_id, 'Ortho', 'ORTHO', '#0ea5e9', true, 0
    where not exists (
      select 1 from public.program_attending_coverage_slots s
      where s.program_id = prog.program_id and lower(s.name) = 'ortho'
    )
    returning id into default_slot_id;

    if default_slot_id is null then
      select id into default_slot_id
      from public.program_attending_coverage_slots
      where program_id = prog.program_id and lower(name) = 'ortho'
      limit 1;
    end if;

    -- Migrate legacy assignments (slot_id null) to default slot for this program
    update public.program_call_attending_assignments
    set slot_id = default_slot_id
    where program_id = prog.program_id
      and slot_id is null
      and is_active = true;
  end loop;
end
$$;

drop function if exists public.replace_program_call_attending_assignments_month(uuid, date, jsonb, uuid);

create or replace function public.replace_program_call_attending_assignments_month(
  target_program_id uuid,
  target_month_start date,
  replacement_assignments jsonb
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  month_start date := date_trunc('month', target_month_start)::date;
  month_end date := (date_trunc('month', target_month_start) + interval '1 month - 1 day')::date;
begin
  if not public.can_manage_program_attendings(target_program_id) then
    raise exception 'You do not have permission to save attending coverage.';
  end if;

  if replacement_assignments is null or jsonb_typeof(replacement_assignments) <> 'array' then
    raise exception 'replacement_assignments must be an array.';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(replacement_assignments) as item(
      coverage_date date,
      attending_id uuid,
      slot_id uuid,
      coverage_scope text,
      is_default boolean
    )
    left join public.program_attendings attending
      on attending.id = item.attending_id
     and attending.program_id = target_program_id
     and attending.is_active = true
    left join public.program_attending_coverage_slots slot
      on slot.id = item.slot_id
     and slot.program_id = target_program_id
     and slot.is_active = true
    where item.coverage_date < month_start
       or item.coverage_date > month_end
       or attending.id is null
       or slot.id is null
  ) then
    raise exception 'Assignments contain an invalid date, attending, or coverage slot.';
  end if;

  update public.program_call_attending_assignments
  set
    is_active = false,
    updated_by = auth.uid(),
    updated_at = now()
  where program_id = target_program_id
    and coverage_date between month_start and month_end
    and is_active = true;

  insert into public.program_call_attending_assignments (
    program_id,
    attending_id,
    coverage_date,
    coverage_scope,
    slot_id,
    is_default,
    is_active,
    created_by,
    updated_by,
    updated_at
  )
  select
    target_program_id,
    item.attending_id,
    item.coverage_date,
    coalesce(nullif(btrim(item.coverage_scope), ''), 'program_call'),
    item.slot_id,
    coalesce(item.is_default, true),
    true,
    auth.uid(),
    auth.uid(),
    now()
  from jsonb_to_recordset(replacement_assignments) as item(
    coverage_date date,
    attending_id uuid,
    slot_id uuid,
    coverage_scope text,
    is_default boolean
  );
end
$$;

revoke all on function public.replace_program_call_attending_assignments_month(uuid, date, jsonb) from public;
grant execute on function public.replace_program_call_attending_assignments_month(uuid, date, jsonb) to authenticated;

-- Refresh PostgREST (Supabase API) schema cache so foreign key relationships are recognized immediately.
NOTIFY pgrst, 'reload schema';
