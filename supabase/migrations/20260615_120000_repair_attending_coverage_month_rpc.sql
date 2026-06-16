-- Repair the atomic month replacement RPC used by Attending Coverage.
--
-- PostgREST resolves RPC calls by function name plus named arguments. Drop
-- earlier overloads before recreating the canonical signature so the schema
-- cache exposes exactly:
--   target_program_id uuid
--   target_month_start date
--   replacement_assignments jsonb

drop function if exists public.replace_program_call_attending_assignments_month(uuid, date, jsonb, uuid);
drop function if exists public.replace_program_call_attending_assignments_month(uuid, date, jsonb);

create function public.replace_program_call_attending_assignments_month(
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
  month_start date;
  month_end date;
begin
  if target_program_id is null then
    raise exception 'target_program_id is required.';
  end if;

  if target_month_start is null then
    raise exception 'target_month_start is required.';
  end if;

  if not public.can_manage_program_attendings(target_program_id) then
    raise exception 'You do not have permission to save attending coverage.';
  end if;

  if replacement_assignments is null
     or jsonb_typeof(replacement_assignments) <> 'array' then
    raise exception 'replacement_assignments must be an array.';
  end if;

  month_start := date_trunc('month', target_month_start)::date;
  month_end := (month_start + interval '1 month - 1 day')::date;

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
    where item.coverage_date is null
       or item.coverage_date < month_start
       or item.coverage_date > month_end
       or attending.id is null
       or slot.id is null
  ) then
    raise exception 'Assignments contain an invalid date, attending, or coverage slot.';
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
    group by
      item.coverage_date,
      coalesce(nullif(btrim(item.coverage_scope), ''), 'program_call'),
      item.slot_id
    having count(*) > 1
  ) then
    raise exception 'Assignments contain duplicate coverage slots for the same date.';
  end if;

  -- The update and insert execute in the RPC transaction. Any validation,
  -- RLS, constraint, or insert failure rolls the entire replacement back.
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

comment on function public.replace_program_call_attending_assignments_month(uuid, date, jsonb)
is 'Atomically replaces active multi-slot attending coverage assignments for one program month.';

notify pgrst, 'reload schema';
