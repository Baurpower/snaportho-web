-- Make the Workspace weekly planner loss-resistant.
-- One user owns at most one planner event per date, and all changed days in a
-- save are committed (or rejected) together with optimistic concurrency checks.

update public.schedule_events
set updated_at = coalesce(updated_at, created_at, now())
where updated_at is null;

alter table public.schedule_events
  alter column user_id set not null,
  alter column event_date set not null,
  alter column is_all_day set default true,
  alter column is_all_day set not null,
  alter column updated_at set default now(),
  alter column updated_at set not null;

create unique index if not exists schedule_events_user_date_unique_idx
  on public.schedule_events (user_id, event_date);

create or replace function public.save_schedule_event_week(
  p_week_start date,
  p_week_end date,
  p_changes jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_change jsonb;
  v_date date;
  v_event_id uuid;
  v_expected_updated_at timestamptz;
  v_action text;
  v_affected integer;
  v_is_all_day boolean;
  v_start_time time;
  v_end_time time;
begin
  if v_user_id is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_week_start is null or p_week_end is null or p_week_end < p_week_start
     or (p_week_end - p_week_start) > 6 then
    raise exception 'Invalid weekly plan range' using errcode = '22023';
  end if;

  if jsonb_typeof(p_changes) <> 'array' or jsonb_array_length(p_changes) > 7 then
    raise exception 'Weekly plan changes must be an array of at most seven days'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_changes) item
    group by item ->> 'date'
    having count(*) > 1
  ) then
    raise exception 'Weekly plan changes contain duplicate dates'
      using errcode = '22023';
  end if;

  for v_change in select value from jsonb_array_elements(p_changes)
  loop
    v_date := (v_change ->> 'date')::date;
    v_action := v_change ->> 'action';
    v_event_id := nullif(v_change ->> 'eventId', '')::uuid;
    v_expected_updated_at := nullif(v_change ->> 'expectedUpdatedAt', '')::timestamptz;

    if v_date < p_week_start or v_date > p_week_end then
      raise exception 'Changed date is outside the requested week'
        using errcode = '22023';
    end if;

    if v_action = 'delete' then
      if v_event_id is null or v_expected_updated_at is null then
        raise exception 'Delete requires an event id and version'
          using errcode = '22023';
      end if;

      delete from public.schedule_events
      where id = v_event_id
        and user_id = v_user_id
        and event_date = v_date
        and updated_at = v_expected_updated_at;
      get diagnostics v_affected = row_count;

      if v_affected <> 1 then
        raise exception 'Weekly plan changed in another session. Reload before saving.'
          using errcode = '40001';
      end if;
    elsif v_action = 'upsert' then
      if coalesce(btrim(v_change ->> 'title'), '') = ''
         or (v_change ->> 'category') not in ('or', 'clinic', 'custom') then
        raise exception 'Every planned day needs a title and valid category'
          using errcode = '22023';
      end if;

      v_is_all_day := coalesce((v_change ->> 'isAllDay')::boolean, true);
      v_start_time := nullif(v_change ->> 'startTime', '')::time;
      v_end_time := nullif(v_change ->> 'endTime', '')::time;

      if v_is_all_day then
        v_start_time := null;
        v_end_time := null;
      elsif v_start_time is null or v_end_time is null or v_end_time <= v_start_time then
        raise exception 'Timed days require a valid start and end time'
          using errcode = '22023';
      end if;

      if v_event_id is null then
        begin
          insert into public.schedule_events (
            user_id, title, category, event_date, is_all_day, start_time,
            end_time, location, attending, description, updated_at
          ) values (
            v_user_id,
            btrim(v_change ->> 'title'),
            v_change ->> 'category',
            v_date,
            v_is_all_day,
            v_start_time,
            v_end_time,
            nullif(btrim(v_change ->> 'location'), ''),
            nullif(btrim(v_change ->> 'attending'), ''),
            nullif(btrim(v_change ->> 'description'), ''),
            now()
          );
        exception when unique_violation then
          raise exception 'This day was created in another session. Reload before saving.'
            using errcode = '40001';
        end;
      else
        if v_expected_updated_at is null then
          raise exception 'Update requires the version that was loaded'
            using errcode = '22023';
        end if;

        update public.schedule_events
        set title = btrim(v_change ->> 'title'),
            category = v_change ->> 'category',
            event_date = v_date,
            is_all_day = v_is_all_day,
            start_time = v_start_time,
            end_time = v_end_time,
            location = nullif(btrim(v_change ->> 'location'), ''),
            attending = nullif(btrim(v_change ->> 'attending'), ''),
            description = nullif(btrim(v_change ->> 'description'), ''),
            updated_at = now()
        where id = v_event_id
          and user_id = v_user_id
          and updated_at = v_expected_updated_at;
        get diagnostics v_affected = row_count;

        if v_affected <> 1 then
          raise exception 'Weekly plan changed in another session. Reload before saving.'
            using errcode = '40001';
        end if;
      end if;
    else
      raise exception 'Unknown weekly plan action' using errcode = '22023';
    end if;
  end loop;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(e) order by e.event_date)
      from public.schedule_events e
      where e.user_id = v_user_id
        and e.event_date between p_week_start and p_week_end
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.save_schedule_event_week(date, date, jsonb) from public;
revoke all on function public.save_schedule_event_week(date, date, jsonb) from anon;
grant execute on function public.save_schedule_event_week(date, date, jsonb) to authenticated;

notify pgrst, 'reload schema';
