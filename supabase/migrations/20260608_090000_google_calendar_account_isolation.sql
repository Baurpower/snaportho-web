-- Scope Google Calendar state to the authenticated SnapOrtho owner, program,
-- and concrete Google connection. All access is service-only; API routes must
-- authenticate the browser session before using the service role.

create table if not exists public.google_oauth_states (
  nonce_hash text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.user_calendar_connections'::regclass
      and conname = 'user_calendar_connections_user_id_fkey'
  ) then
    alter table public.user_calendar_connections
      add constraint user_calendar_connections_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade
      not valid;
  end if;
end
$$;

alter table public.user_calendar_connections
  validate constraint user_calendar_connections_user_id_fkey;

alter table public.user_calendar_sync_settings
  add column if not exists program_id uuid null,
  add column if not exists connection_id uuid null;

update public.user_calendar_sync_settings settings
set program_id = (
  select events.program_id
  from public.synced_call_events events
  where events.user_id = settings.user_id
    and events.provider = settings.provider
    and events.program_id is not null
  order by events.updated_at desc
  limit 1
)
where settings.program_id is null;

update public.user_calendar_sync_settings settings
set program_id = (
  select memberships.program_id
  from public.program_memberships memberships
  where memberships.user_id = settings.user_id
    and coalesce(memberships.is_active, false) = true
    and memberships.program_id is not null
  order by memberships.start_date desc nulls last
  limit 1
)
where settings.program_id is null;

update public.user_calendar_sync_settings settings
set connection_id = connections.id
from public.user_calendar_connections connections
where settings.connection_id is null
  and connections.user_id = settings.user_id
  and connections.provider = settings.provider;

do $$
declare
  unresolved_count bigint;
begin
  select count(*)
  into unresolved_count
  from public.user_calendar_sync_settings
  where program_id is null or connection_id is null;

  if unresolved_count > 0 then
    raise exception
      'Google isolation migration blocked: % sync setting rows have no program or connection',
      unresolved_count;
  end if;
end
$$;

alter table public.user_calendar_sync_settings
  alter column program_id set not null,
  alter column connection_id set not null;

create unique index if not exists user_calendar_connections_id_user_uidx
  on public.user_calendar_connections (id, user_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_calendar_sync_settings'::regclass
      and conname = 'user_calendar_sync_settings_user_id_fkey'
  ) then
    alter table public.user_calendar_sync_settings
      add constraint user_calendar_sync_settings_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_calendar_sync_settings'::regclass
      and conname = 'user_calendar_sync_settings_connection_owner_fkey'
  ) then
    alter table public.user_calendar_sync_settings
      add constraint user_calendar_sync_settings_connection_owner_fkey
      foreign key (connection_id, user_id)
      references public.user_calendar_connections(id, user_id)
      on delete cascade not valid;
  end if;
end
$$;

alter table public.user_calendar_sync_settings
  validate constraint user_calendar_sync_settings_user_id_fkey;
alter table public.user_calendar_sync_settings
  validate constraint user_calendar_sync_settings_connection_owner_fkey;

alter table public.synced_call_events
  add column if not exists connection_id uuid null;

update public.synced_call_events events
set connection_id = connections.id
from public.user_calendar_connections connections
where events.connection_id is null
  and connections.user_id = events.user_id
  and connections.provider = events.provider;

do $$
declare
  unresolved_count bigint;
begin
  select count(*)
  into unresolved_count
  from public.synced_call_events
  where program_id is null or connection_id is null;

  if unresolved_count > 0 then
    raise exception
      'Google isolation migration blocked: % synced event rows have no program or connection',
      unresolved_count;
  end if;
end
$$;

alter table public.synced_call_events
  alter column program_id set not null,
  alter column connection_id set not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.synced_call_events'::regclass
      and conname = 'synced_call_events_user_id_fkey'
  ) then
    alter table public.synced_call_events
      add constraint synced_call_events_user_id_fkey
      foreign key (user_id) references auth.users(id) on delete cascade not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.synced_call_events'::regclass
      and conname = 'synced_call_events_connection_owner_fkey'
  ) then
    alter table public.synced_call_events
      add constraint synced_call_events_connection_owner_fkey
      foreign key (connection_id, user_id)
      references public.user_calendar_connections(id, user_id)
      on delete cascade not valid;
  end if;
end
$$;

alter table public.synced_call_events
  validate constraint synced_call_events_user_id_fkey;
alter table public.synced_call_events
  validate constraint synced_call_events_connection_owner_fkey;

drop index if exists public.user_calendar_sync_settings_user_provider_uidx;
create unique index user_calendar_sync_settings_owner_program_provider_uidx
  on public.user_calendar_sync_settings (user_id, program_id, provider);

drop index if exists public.synced_call_events_assignment_provider_target_user_uidx;
create unique index synced_call_events_owner_connection_program_assignment_uidx
  on public.synced_call_events
    (user_id, connection_id, program_id, call_assignment_id, provider, sync_target);

create index if not exists user_calendar_connections_google_email_idx
  on public.user_calendar_connections (user_id, provider, provider_account_email);
create index if not exists synced_call_events_connection_idx
  on public.synced_call_events (connection_id);

alter table public.user_calendar_connections enable row level security;
alter table public.user_calendar_sync_settings enable row level security;
alter table public.synced_call_events enable row level security;
alter table public.google_oauth_states enable row level security;

revoke all on public.user_calendar_connections from anon, authenticated;
revoke all on public.user_calendar_sync_settings from anon, authenticated;
revoke all on public.synced_call_events from anon, authenticated;
revoke all on public.google_oauth_states from anon, authenticated;

notify pgrst, 'reload schema';
