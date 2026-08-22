-- Program-owned Google Calendar inbound source-of-truth foundation.
-- All provider credentials and operational tables are server-only.

create table if not exists public.program_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  provider text not null default 'google' check (provider in ('google')),
  granted_by_user_id uuid null references auth.users(id) on delete set null,
  provider_account_email text null,
  encrypted_access_token text null,
  encrypted_refresh_token text null,
  token_expiry timestamptz null,
  status text not null default 'active'
    check (status in ('active', 'reauth_required', 'revoked', 'disabled')),
  last_token_error text null,
  last_token_error_at timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (program_id, provider),
  unique (id, program_id)
);

-- CREATE TABLE IF NOT EXISTS does not add constraints to a table left behind by
-- an earlier partial run. Materialize the composite key explicitly before the
-- source table declares its program-isolation foreign key.
create unique index if not exists program_calendar_connections_id_program_uidx
  on public.program_calendar_connections (id, program_id);

create table if not exists public.program_calendar_sources (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  connection_id uuid not null references public.program_calendar_connections(id) on delete restrict,
  provider text not null default 'google' check (provider in ('google')),
  provider_calendar_id text not null,
  provider_calendar_summary text null,
  mode text not null default 'preview'
    check (mode in ('preview', 'active', 'paused', 'error', 'disconnected')),
  effective_start date not null,
  effective_end date not null,
  timezone text not null default 'America/Los_Angeles',
  sync_token text null,
  configuration_version bigint not null default 1,
  sync_lock_token uuid null,
  sync_lock_expires_at timestamptz null,
  initial_sync_completed_at timestamptz null,
  last_sync_started_at timestamptz null,
  last_success_at timestamptz null,
  last_notification_at timestamptz null,
  last_error_class text null,
  last_error_message text null,
  last_error_at timestamptz null,
  consecutive_failure_count integer not null default 0,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_calendar_sources_effective_range_check
    check (effective_end >= effective_start),
  constraint program_calendar_sources_connection_program_fkey
    foreign key (connection_id, program_id)
    references public.program_calendar_connections(id, program_id) on delete restrict,
  unique (program_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.program_calendar_sources'::regclass
      and conname = 'program_calendar_sources_connection_program_fkey'
  ) then
    alter table public.program_calendar_sources
      add constraint program_calendar_sources_connection_program_fkey
      foreign key (connection_id, program_id)
      references public.program_calendar_connections(id, program_id)
      on delete restrict;
  end if;
end
$$;

create table if not exists public.program_calendar_oauth_states (
  nonce_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.programs(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

create table if not exists public.program_calendar_person_aliases (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs(id) on delete cascade,
  normalized_alias text not null,
  roster_id uuid not null references public.program_roster(id) on delete cascade,
  program_membership_id uuid null references public.program_memberships(id) on delete set null,
  active_from date null,
  active_to date null,
  created_by_user_id uuid null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint program_calendar_alias_active_range_check
    check (active_to is null or active_from is null or active_to >= active_from),
  unique (program_id, normalized_alias, roster_id)
);

create index if not exists program_calendar_alias_lookup_idx
  on public.program_calendar_person_aliases (program_id, normalized_alias, active_from, active_to);

create table if not exists public.program_calendar_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.program_calendar_sources(id) on delete cascade,
  run_type text not null check (run_type in ('preview', 'full', 'incremental', 'reconcile')),
  trigger text not null default 'manual',
  status text not null default 'running'
    check (status in ('running', 'succeeded', 'blocked', 'failed')),
  configuration_version bigint not null,
  provider_page_count integer not null default 0,
  provider_event_count integer not null default 0,
  created_count integer not null default 0,
  updated_count integer not null default 0,
  deleted_count integer not null default 0,
  unchanged_count integer not null default 0,
  warning_count integer not null default 0,
  blocked_count integer not null default 0,
  error_class text null,
  error_message text null,
  started_at timestamptz not null default now(),
  completed_at timestamptz null,
  created_at timestamptz not null default now()
);

create index if not exists program_calendar_sync_runs_source_started_idx
  on public.program_calendar_sync_runs (source_id, started_at desc);

create table if not exists public.program_calendar_import_events (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.program_calendar_sources(id) on delete cascade,
  provider_event_id text not null,
  provider_recurring_event_id text null,
  etag text null,
  provider_status text null,
  raw_payload jsonb not null default '{}'::jsonb,
  original_title text null,
  normalized_title text null,
  start_date date null,
  end_date_exclusive date null,
  start_datetime timestamptz null,
  end_datetime timestamptz null,
  matched_roster_id uuid null references public.program_roster(id) on delete set null,
  matched_membership_id uuid null references public.program_memberships(id) on delete set null,
  validation_status text not null default 'blocked'
    check (validation_status in ('valid', 'warning', 'blocked', 'ignored')),
  validation_issues jsonb not null default '[]'::jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  applied_at timestamptz null,
  source_deleted_at timestamptz null,
  last_sync_run_id uuid null references public.program_calendar_sync_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, provider_event_id)
);

create index if not exists program_calendar_import_review_idx
  on public.program_calendar_import_events (source_id, validation_status, start_date);

create table if not exists public.program_calendar_event_assignments (
  id uuid primary key default gen_random_uuid(),
  import_event_id uuid not null references public.program_calendar_import_events(id) on delete cascade,
  call_assignment_id uuid not null references public.call_assignments(id) on delete cascade,
  assignment_date date not null,
  created_at timestamptz not null default now(),
  unique (import_event_id, assignment_date),
  unique (call_assignment_id)
);

create table if not exists public.program_calendar_channels (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.program_calendar_sources(id) on delete cascade,
  channel_id text not null unique,
  resource_id text null,
  channel_token_hash text not null,
  resource_uri text null,
  expires_at timestamptz null,
  status text not null default 'creating'
    check (status in ('creating', 'active', 'superseded', 'stopped', 'expired')),
  last_message_number bigint null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists program_calendar_channels_source_status_idx
  on public.program_calendar_channels (source_id, status, expires_at);

create table if not exists public.program_calendar_jobs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.program_calendar_sources(id) on delete cascade,
  configuration_version bigint not null,
  job_type text not null default 'incremental_sync'
    check (job_type in ('incremental_sync', 'full_sync', 'renew_watch')),
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'succeeded', 'failed', 'dead')),
  trigger text not null default 'system',
  attempts integer not null default 0,
  available_at timestamptz not null default now(),
  locked_at timestamptz null,
  locked_by text null,
  last_error text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists program_calendar_jobs_pending_source_type_uidx
  on public.program_calendar_jobs (source_id, job_type)
  where status in ('pending', 'processing');
create index if not exists program_calendar_jobs_available_idx
  on public.program_calendar_jobs (status, available_at, created_at);

create table if not exists public.program_calendar_change_audit (
  id bigint generated always as identity primary key,
  program_id uuid not null references public.programs(id) on delete cascade,
  source_id uuid null references public.program_calendar_sources(id) on delete set null,
  sync_run_id uuid null references public.program_calendar_sync_runs(id) on delete set null,
  import_event_id uuid null references public.program_calendar_import_events(id) on delete set null,
  call_assignment_id uuid null references public.call_assignments(id) on delete set null,
  actor_kind text not null check (actor_kind in ('google', 'user', 'system')),
  actor_user_id uuid null references auth.users(id) on delete set null,
  action text not null,
  before_values jsonb null,
  after_values jsonb null,
  reason text null,
  created_at timestamptz not null default now()
);

create index if not exists program_calendar_change_audit_program_created_idx
  on public.program_calendar_change_audit (program_id, created_at desc);

alter table public.call_assignments
  add column if not exists source_kind text not null default 'snaportho',
  add column if not exists source_calendar_source_id uuid null
    references public.program_calendar_sources(id) on delete set null,
  add column if not exists source_event_id text null,
  add column if not exists source_event_etag text null,
  add column if not exists source_synced_at timestamptz null,
  add column if not exists source_deleted_at timestamptz null,
  add column if not exists source_override_state text null;

alter table public.call_assignments
  drop constraint if exists call_assignments_source_kind_check;
alter table public.call_assignments
  add constraint call_assignments_source_kind_check
  check (source_kind in ('snaportho', 'google'));

create unique index if not exists call_assignments_google_source_event_date_uidx
  on public.call_assignments (program_id, source_calendar_source_id, source_event_id, call_date, call_type)
  nulls distinct;

-- Bound outbound stale-event cleanup to the window that created each row.
alter table public.synced_call_events
  add column if not exists sync_window_start date null,
  add column if not exists sync_window_end date null;

alter table public.program_calendar_connections enable row level security;
alter table public.program_calendar_sources enable row level security;
alter table public.program_calendar_oauth_states enable row level security;
alter table public.program_calendar_person_aliases enable row level security;
alter table public.program_calendar_sync_runs enable row level security;
alter table public.program_calendar_import_events enable row level security;
alter table public.program_calendar_event_assignments enable row level security;
alter table public.program_calendar_channels enable row level security;
alter table public.program_calendar_jobs enable row level security;
alter table public.program_calendar_change_audit enable row level security;

revoke all on public.program_calendar_connections from anon, authenticated;
revoke all on public.program_calendar_sources from anon, authenticated;
revoke all on public.program_calendar_oauth_states from anon, authenticated;
revoke all on public.program_calendar_person_aliases from anon, authenticated;
revoke all on public.program_calendar_sync_runs from anon, authenticated;
revoke all on public.program_calendar_import_events from anon, authenticated;
revoke all on public.program_calendar_event_assignments from anon, authenticated;
revoke all on public.program_calendar_channels from anon, authenticated;
revoke all on public.program_calendar_jobs from anon, authenticated;
revoke all on public.program_calendar_change_audit from anon, authenticated;

grant all on public.program_calendar_connections to service_role;
grant all on public.program_calendar_sources to service_role;
grant all on public.program_calendar_oauth_states to service_role;
grant all on public.program_calendar_person_aliases to service_role;
grant all on public.program_calendar_sync_runs to service_role;
grant all on public.program_calendar_import_events to service_role;
grant all on public.program_calendar_event_assignments to service_role;
grant all on public.program_calendar_channels to service_role;
grant all on public.program_calendar_jobs to service_role;
grant all on public.program_calendar_change_audit to service_role;
grant usage, select on sequence public.program_calendar_change_audit_id_seq to service_role;

comment on table public.program_calendar_connections is
  'Server-only encrypted OAuth credentials for a program-owned calendar integration.';
comment on table public.program_calendar_import_events is
  'Server-only minimal Google event mirror, validation state, and import lineage.';

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
  v_before jsonb;
  v_created integer := 0;
  v_updated integer := 0;
  v_deleted integer := 0;
begin
  select * into v_source
  from public.program_calendar_sources
  where id = p_source_id
  for update;

  if not found or v_source.mode <> 'active' then
    raise exception 'Calendar source is not active';
  end if;

  if v_source.configuration_version is distinct from (
    select configuration_version from public.program_calendar_sync_runs where id = p_sync_run_id and source_id = p_source_id
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

    -- Remove dates no longer covered by this event. end_date_exclusive follows Google semantics.
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
      ) values (v_source.program_id, v_source.id, p_sync_run_id, v_event.id, v_call_id, 'google', 'delete', v_before);
      delete from public.call_assignments where id = v_call_id and source_calendar_source_id = v_source.id;
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
      v_call_id := null;
      v_before := null;
      if exists (
        select 1 from public.call_assignments ca
        where ca.program_id = v_source.program_id
          and ca.call_date = v_date
          and ca.call_type = 'Primary'
          and (ca.source_kind <> 'google' or ca.source_calendar_source_id is distinct from v_source.id)
      ) then
        raise exception 'Native schedule conflict on %', v_date;
      end if;

      select id, to_jsonb(ca) into v_call_id, v_before
      from public.call_assignments ca
      where ca.program_id = v_source.program_id
        and ca.source_calendar_source_id = v_source.id
        and ca.source_event_id = v_event.provider_event_id
        and ca.call_date = v_date
        and ca.call_type = 'Primary';

      insert into public.call_assignments(
        program_id, roster_id, program_membership_id, call_type, call_date,
        start_datetime, end_datetime, site, is_home_call, notes,
        source_kind, source_calendar_source_id, source_event_id, source_event_etag,
        source_synced_at, source_deleted_at, updated_at
      ) values (
        v_source.program_id, v_event.matched_roster_id, v_event.matched_membership_id,
        'Primary', v_date, null, null, null, false,
        case when v_event.original_title is distinct from v_event.normalized_title then 'Imported from Google Calendar' else null end,
        'google', v_source.id, v_event.provider_event_id, v_event.etag, now(), null, now()
      )
      on conflict (program_id, source_calendar_source_id, source_event_id, call_date, call_type)
      do update set
        roster_id = excluded.roster_id,
        program_membership_id = excluded.program_membership_id,
        source_event_etag = excluded.source_event_etag,
        source_synced_at = excluded.source_synced_at,
        source_deleted_at = null,
        updated_at = excluded.updated_at
      returning id into v_call_id;

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

      if v_before is null then v_created := v_created + 1; else v_updated := v_updated + 1; end if;
    end loop;

    update public.program_calendar_import_events set applied_at = now(), updated_at = now() where id = v_event.id;
  end loop;

  return jsonb_build_object('created', v_created, 'updated', v_updated, 'deleted', v_deleted);
end;
$$;

revoke all on function public.apply_program_calendar_source_run(uuid, uuid) from public, anon, authenticated;
grant execute on function public.apply_program_calendar_source_run(uuid, uuid) to service_role;

create or replace function public.claim_program_calendar_source_sync(
  p_source_id uuid,
  p_lock_token uuid,
  p_lease_seconds integer default 600
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_claimed uuid;
begin
  update public.program_calendar_sources
  set sync_lock_token = p_lock_token,
      sync_lock_expires_at = now() + make_interval(secs => greatest(60, least(p_lease_seconds, 1800))),
      updated_at = now()
  where id = p_source_id
    and (sync_lock_expires_at is null or sync_lock_expires_at < now() or sync_lock_token = p_lock_token)
  returning id into v_claimed;
  return v_claimed is not null;
end;
$$;

create or replace function public.release_program_calendar_source_sync(
  p_source_id uuid,
  p_lock_token uuid
)
returns boolean
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_released uuid;
begin
  update public.program_calendar_sources
  set sync_lock_token = null,
      sync_lock_expires_at = null,
      updated_at = now()
  where id = p_source_id and sync_lock_token = p_lock_token
  returning id into v_released;
  return v_released is not null;
end;
$$;

revoke all on function public.claim_program_calendar_source_sync(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.release_program_calendar_source_sync(uuid, uuid) from public, anon, authenticated;
grant execute on function public.claim_program_calendar_source_sync(uuid, uuid, integer) to service_role;
grant execute on function public.release_program_calendar_source_sync(uuid, uuid) to service_role;
