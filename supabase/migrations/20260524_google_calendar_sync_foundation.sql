create table if not exists public.user_calendar_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  provider_account_email text null,
  access_token text null,
  refresh_token text null,
  token_expiry timestamptz null,
  calendar_id text null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.user_calendar_sync_settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  provider text not null,
  enabled boolean not null default false,
  scope text null,
  last_error text null,
  last_error_at timestamptz null,
  last_success_at timestamptz null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.synced_call_events (
  id uuid primary key default gen_random_uuid(),
  call_assignment_id uuid not null,
  user_id uuid not null,
  provider text not null,
  provider_event_id text null,
  provider_calendar_id text null,
  sync_target text not null default 'user',
  program_id uuid null,
  sync_enabled boolean not null default false,
  synced_at timestamptz null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.user_calendar_connections
  add column if not exists provider_account_email text null,
  add column if not exists access_token text null,
  add column if not exists refresh_token text null,
  add column if not exists token_expiry timestamptz null,
  add column if not exists calendar_id text null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

alter table public.user_calendar_sync_settings
  add column if not exists enabled boolean not null default false,
  add column if not exists scope text null,
  add column if not exists last_error text null,
  add column if not exists last_error_at timestamptz null,
  add column if not exists last_success_at timestamptz null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

alter table public.synced_call_events
  add column if not exists provider_event_id text null,
  add column if not exists provider_calendar_id text null,
  add column if not exists sync_target text not null default 'user',
  add column if not exists program_id uuid null,
  add column if not exists sync_enabled boolean not null default false,
  add column if not exists synced_at timestamptz null,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists user_calendar_connections_user_provider_uidx
  on public.user_calendar_connections (user_id, provider);

create unique index if not exists user_calendar_sync_settings_user_provider_uidx
  on public.user_calendar_sync_settings (user_id, provider);

create unique index if not exists synced_call_events_assignment_provider_target_user_uidx
  on public.synced_call_events (call_assignment_id, provider, sync_target, user_id);

create index if not exists synced_call_events_user_provider_idx
  on public.synced_call_events (user_id, provider);

create index if not exists synced_call_events_program_idx
  on public.synced_call_events (program_id);
