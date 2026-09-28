-- Align the authoritative Google source with the Call Hub's primary-slot model.
-- Call Hub treats Primary, weekday, and weekend as the same visible primary slot.

-- System-created assignments legitimately have no creating auth user. The old
-- random UUID default can never satisfy the auth.users foreign key.
alter table public.call_assignments alter column created_by drop default;

create or replace function public.apply_program_calendar_source_run(
  p_source_id uuid,
  p_sync_run_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_source public.program_calendar_sources%rowtype;
  v_event public.program_calendar_import_events%rowtype;
  v_date date;
  v_call_id uuid;
  v_duplicate_id uuid;
  v_before jsonb;
  v_created integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
  v_call_type text;
begin
  select * into v_source
  from public.program_calendar_sources
  where id = p_source_id
  for update;

  if not found or v_source.mode <> 'active' then
    raise exception 'Calendar source is not active';
  end if;

  if v_source.configuration_version is distinct from (
    select configuration_version
    from public.program_calendar_sync_runs
    where id = p_sync_run_id and source_id = p_source_id
  ) then
    raise exception 'Calendar source configuration changed during synchronization';
  end if;

  for v_event in
    select * from public.program_calendar_import_events
    where source_id = p_source_id
      and last_sync_run_id = p_sync_run_id
      and validation_status in ('valid', 'warning')
    order by provider_event_id
  loop
    if v_event.source_deleted_at is not null or v_event.provider_status = 'cancelled' then
      for v_call_id, v_before in
        select ca.id, to_jsonb(ca)
        from public.program_calendar_event_assignments pea
        join public.call_assignments ca on ca.id = pea.call_assignment_id
        where pea.import_event_id = v_event.id
      loop
        insert into public.program_calendar_change_audit(
          program_id, source_id, sync_run_id, import_event_id, call_assignment_id,
          actor_kind, action, before_values
        ) values (
          v_source.program_id, v_source.id, p_sync_run_id, v_event.id, v_call_id,
          'google', 'delete', v_before
        );
        delete from public.call_assignments
        where id = v_call_id
          and source_kind = 'google'
          and source_calendar_source_id = v_source.id;
        v_deleted := v_deleted + 1;
      end loop;
      continue;
    end if;

    if v_event.matched_roster_id is null then
      raise exception 'Valid import event % has no roster mapping', v_event.id;
    end if;

    for v_call_id, v_before in
      select ca.id, to_jsonb(ca)
      from public.program_calendar_event_assignments pea
      join public.call_assignments ca on ca.id = pea.call_assignment_id
      where pea.import_event_id = v_event.id
        and not (
          pea.assignment_date >= coalesce(v_event.start_date, (v_event.start_datetime at time zone v_source.timezone)::date)
          and pea.assignment_date < coalesce(v_event.end_date_exclusive, coalesce((v_event.start_datetime at time zone v_source.timezone)::date, v_event.start_date) + 1)
        )
    loop
      insert into public.program_calendar_change_audit(
        program_id, source_id, sync_run_id, import_event_id, call_assignment_id,
        actor_kind, action, before_values
      ) values (
        v_source.program_id, v_source.id, p_sync_run_id, v_event.id, v_call_id,
        'google', 'delete', v_before
      );
      delete from public.call_assignments
      where id = v_call_id and source_calendar_source_id = v_source.id;
      v_deleted := v_deleted + 1;
    end loop;

    for v_date in
      select day::date
      from generate_series(
        coalesce(v_event.start_date, (v_event.start_datetime at time zone v_source.timezone)::date),
        coalesce(v_event.end_date_exclusive - 1, (v_event.start_datetime at time zone v_source.timezone)::date),
        interval '1 day'
      ) as day
      where day::date between v_source.effective_start and v_source.effective_end
    loop
      -- Preserve the historical weekday/weekend labels used by Call Hub.
      v_call_type := case
        when extract(dow from v_date) in (0, 5, 6) then 'weekend'
        else 'weekday'
      end;
      v_call_id := null;
      v_before := null;

      -- Reuse one existing visible primary slot so swaps and references retain
      -- their assignment id. Prefer a Google-owned row, then weekday/weekend.
      select ca.id, to_jsonb(ca)
      into v_call_id, v_before
      from public.call_assignments ca
      where ca.program_id = v_source.program_id
        and ca.call_date = v_date
        and lower(coalesce(ca.call_type, '')) in ('primary', 'weekday', 'weekend')
      order by
        (ca.source_kind = 'google' and ca.source_calendar_source_id = v_source.id) desc,
        (lower(ca.call_type) in ('weekday', 'weekend')) desc,
        ca.updated_at desc nulls last,
        ca.id
      limit 1
      for update;

      if v_call_id is null then
        insert into public.call_assignments(
          program_id, roster_id, program_membership_id, call_type, call_date,
          start_datetime, end_datetime, site, is_home_call, notes,
          source_kind, source_calendar_source_id, source_event_id, source_event_etag,
          source_synced_at, source_deleted_at, created_by, updated_at
        ) values (
          v_source.program_id, v_event.matched_roster_id, v_event.matched_membership_id,
          v_call_type, v_date, null, null, null, false,
          case when v_event.original_title is distinct from v_event.normalized_title then 'Imported from Google Calendar' else null end,
          'google', v_source.id, v_event.provider_event_id, v_event.etag, now(), null, null, now()
        ) returning id into v_call_id;
        v_created := v_created + 1;
      else
        update public.call_assignments
        set roster_id = v_event.matched_roster_id,
            program_membership_id = v_event.matched_membership_id,
            call_type = v_call_type,
            start_datetime = null,
            end_datetime = null,
            source_kind = 'google',
            source_calendar_source_id = v_source.id,
            source_event_id = v_event.provider_event_id,
            source_event_etag = v_event.etag,
            source_synced_at = now(),
            source_deleted_at = null,
            updated_at = now()
        where id = v_call_id;
        v_updated := v_updated + 1;
      end if;

      -- Older data can contain both Primary and weekday/weekend rows. Once an
      -- administrator activates Google authority, remove only those duplicate
      -- primary-equivalent slots; Backup and Buddy remain untouched.
      for v_duplicate_id in
        select ca.id
        from public.call_assignments ca
        where ca.program_id = v_source.program_id
          and ca.call_date = v_date
          and lower(coalesce(ca.call_type, '')) in ('primary', 'weekday', 'weekend')
          and ca.id <> v_call_id
        for update
      loop
        insert into public.program_calendar_change_audit(
          program_id, source_id, sync_run_id, import_event_id, call_assignment_id,
          actor_kind, action, before_values
        )
        select v_source.program_id, v_source.id, p_sync_run_id, v_event.id, ca.id,
               'google', 'delete', to_jsonb(ca)
        from public.call_assignments ca where ca.id = v_duplicate_id;
        delete from public.call_assignments where id = v_duplicate_id;
        v_deleted := v_deleted + 1;
      end loop;

      insert into public.program_calendar_event_assignments(import_event_id, call_assignment_id, assignment_date)
      values (v_event.id, v_call_id, v_date)
      on conflict (import_event_id, assignment_date)
      do update set call_assignment_id = excluded.call_assignment_id;

      insert into public.program_calendar_change_audit(
        program_id, source_id, sync_run_id, import_event_id, call_assignment_id,
        actor_kind, action, before_values, after_values
      ) values (
        v_source.program_id, v_source.id, p_sync_run_id, v_event.id, v_call_id,
        'google', case when v_before is null then 'create' else 'update' end,
        v_before, (select to_jsonb(ca) from public.call_assignments ca where ca.id = v_call_id)
      );
    end loop;

    update public.program_calendar_import_events
    set applied_at = now(), updated_at = now()
    where id = v_event.id;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'deleted', v_deleted);
end;
$$;

revoke all on function public.apply_program_calendar_source_run(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_program_calendar_source_run(uuid, uuid) to service_role;
