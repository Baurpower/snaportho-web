-- Fix schedule_events time columns to match the UI mental model.
--
-- schedule_events.start_time / end_time were incorrectly typed as
-- timestamptz. That made simple same-day timed events (e.g. clinic
-- 12:00-17:00) require awkward timestamp construction and broke the
-- "AM half / PM half" mental model the workspace week planner uses.
-- This migration converts both columns to plain `time` and adds check
-- constraints that keep all-day vs. timed rows internally consistent.
--
-- Timezone note: schedule_events rows are owned by individual program
-- members (attendings/residents), and there is no program/workspace
-- timezone recorded for them today (unlike student_workspace_profiles,
-- which does have a timezone column). Converting the legacy timestamptz
-- clock portion therefore reads it out in UTC rather than a per-user
-- local time. Any event whose timestamptz was originally entered while
-- viewing a non-UTC wall clock may shift by the UTC offset in effect at
-- creation time. If a program/workspace timezone becomes available later,
-- this is the place to redo the conversion with `at time zone <tz>`
-- instead of `at time zone 'UTC'`.
do $$
declare
  start_time_type text;
  end_time_type text;
begin
  if to_regclass('public.schedule_events') is null then
    -- Fresh database: create the table directly with the correct schema.
    create table public.schedule_events (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      title text null,
      category text null,
      event_date date not null,
      is_all_day boolean not null default true,
      start_time time null,
      end_time time null,
      location text null,
      description text null,
      attending text null,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      constraint schedule_events_all_day_times_check check (
        (is_all_day = true and start_time is null and end_time is null)
        or
        (is_all_day = false and start_time is not null and end_time is not null and end_time > start_time)
      )
    );

    create index schedule_events_user_date_idx
      on public.schedule_events (user_id, event_date);

    alter table public.schedule_events enable row level security;

    create policy "Users can view their own schedule events"
      on public.schedule_events
      for select
      using (auth.uid() = user_id);

    create policy "Users can insert their own schedule events"
      on public.schedule_events
      for insert
      with check (auth.uid() = user_id);

    create policy "Users can update their own schedule events"
      on public.schedule_events
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);

    create policy "Users can delete their own schedule events"
      on public.schedule_events
      for delete
      using (auth.uid() = user_id);

    return;
  end if;

  -- Existing table: only touch the time columns/constraints. RLS,
  -- policies, and indexes already on the table are left untouched.
  select data_type into start_time_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'schedule_events'
    and column_name = 'start_time';

  select data_type into end_time_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'schedule_events'
    and column_name = 'end_time';

  -- All-day rows must not carry a stale clock value forward.
  update public.schedule_events
  set start_time = null, end_time = null
  where is_all_day = true
    and (start_time is not null or end_time is not null);

  if start_time_type = 'timestamp with time zone' then
    alter table public.schedule_events
      alter column start_time type time using (start_time at time zone 'UTC')::time;
  end if;

  if end_time_type = 'timestamp with time zone' then
    alter table public.schedule_events
      alter column end_time type time using (end_time at time zone 'UTC')::time;
  end if;

  -- Defensive backfill: fold any pre-existing timed row that would violate
  -- the new constraints (missing one side of its range, or a non-positive
  -- duration from an earlier bug) back to all-day so the constraint below
  -- can be added without failing on invalid legacy data.
  update public.schedule_events
  set is_all_day = true, start_time = null, end_time = null
  where is_all_day = false
    and (start_time is null or end_time is null or end_time <= start_time);

  if not exists (
    select 1
    from information_schema.table_constraints
    where constraint_schema = 'public'
      and table_name = 'schedule_events'
      and constraint_name = 'schedule_events_all_day_times_check'
  ) then
    alter table public.schedule_events
      add constraint schedule_events_all_day_times_check check (
        (is_all_day = true and start_time is null and end_time is null)
        or
        (is_all_day = false and start_time is not null and end_time is not null and end_time > start_time)
      );
  end if;
end
$$;

notify pgrst, 'reload schema';
