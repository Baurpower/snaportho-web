-- Read-only verification for Google Calendar account isolation.

-- Columns.
select
  table_name,
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in (
    'user_calendar_connections',
    'user_calendar_sync_settings',
    'synced_call_events',
    'google_oauth_states'
  )
order by table_name, ordinal_position;

-- Constraints and foreign keys.
select
  cls.relname as table_name,
  con.conname as constraint_name,
  con.contype as constraint_type,
  con.convalidated as validated,
  pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class cls on cls.oid = con.conrelid
join pg_namespace ns on ns.oid = cls.relnamespace
where ns.nspname = 'public'
  and cls.relname in (
    'user_calendar_connections',
    'user_calendar_sync_settings',
    'synced_call_events',
    'google_oauth_states'
  )
order by cls.relname, con.conname;

-- Indexes.
select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in (
    'user_calendar_connections',
    'user_calendar_sync_settings',
    'synced_call_events',
    'google_oauth_states'
  )
order by tablename, indexname;

-- RLS and grants.
select relname as table_name, relrowsecurity as rls_enabled
from pg_class
join pg_namespace on pg_namespace.oid = pg_class.relnamespace
where pg_namespace.nspname = 'public'
  and relname in (
    'user_calendar_connections',
    'user_calendar_sync_settings',
    'synced_call_events',
    'google_oauth_states'
  )
order by relname;

select grantee, table_name, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in (
    'user_calendar_connections',
    'user_calendar_sync_settings',
    'synced_call_events',
    'google_oauth_states'
  )
order by table_name, grantee, privilege_type;

-- Exact row counts.
select 'user_calendar_connections' as table_name, count(*) as row_count
from public.user_calendar_connections
union all
select 'user_calendar_sync_settings', count(*)
from public.user_calendar_sync_settings
union all
select 'synced_call_events', count(*)
from public.synced_call_events
union all
select 'google_oauth_states', count(*)
from public.google_oauth_states;

-- Orphans and rows that the original migration would have deleted.
select
  count(*) filter (where connections.id is null) as settings_without_connection,
  count(*) filter (
    where settings.program_id is null or settings.connection_id is null
  ) as settings_originally_deleteable
from public.user_calendar_sync_settings settings
left join public.user_calendar_connections connections
  on connections.id = settings.connection_id
 and connections.user_id = settings.user_id;

select
  count(*) filter (where connections.id is null) as events_without_connection,
  count(*) filter (
    where events.program_id is null or events.connection_id is null
  ) as events_originally_deleteable
from public.synced_call_events events
left join public.user_calendar_connections connections
  on connections.id = events.connection_id
 and connections.user_id = events.user_id;

-- Duplicate groups. Each result should be zero.
select count(*) as duplicate_google_connection_groups
from (
  select user_id, provider
  from public.user_calendar_connections
  group by user_id, provider
  having count(*) > 1
) duplicates;

select count(*) as duplicate_sync_setting_groups
from (
  select user_id, program_id, provider
  from public.user_calendar_sync_settings
  group by user_id, program_id, provider
  having count(*) > 1
) duplicates;

select count(*) as duplicate_synced_event_groups
from (
  select
    user_id,
    connection_id,
    program_id,
    call_assignment_id,
    provider,
    sync_target
  from public.synced_call_events
  group by
    user_id,
    connection_id,
    program_id,
    call_assignment_id,
    provider,
    sync_target
  having count(*) > 1
) duplicates;
