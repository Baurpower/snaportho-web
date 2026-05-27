-- Patch: add columns to user_calendar_sync_settings that were defined in
-- 20260524_google_calendar_sync_foundation.sql but may not have been
-- applied to the live database yet.
--
-- Safe to run multiple times (all statements are idempotent).
-- Ordering: CREATE TABLE IF NOT EXISTS first so ALTER TABLE never hits a
-- "relation does not exist" error, even on a fresh database.

-- 1. Ensure the table exists with its base shape.
create table if not exists public.user_calendar_sync_settings (
  id              uuid        primary key default gen_random_uuid(),
  user_id         uuid        not null,
  provider        text        not null,
  enabled         boolean     not null default false,
  scope           text        null,
  last_error      text        null,
  last_error_at   timestamptz null,
  last_success_at timestamptz null,
  updated_at      timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- 2. Add any columns that are missing on an already-existing table.
alter table public.user_calendar_sync_settings
  add column if not exists enabled         boolean     not null default false,
  add column if not exists scope           text        null,
  add column if not exists last_error      text        null,
  add column if not exists last_error_at   timestamptz null,
  add column if not exists last_success_at timestamptz null,
  add column if not exists updated_at      timestamptz not null default now(),
  add column if not exists created_at      timestamptz not null default now();

-- 3. Unique index required for upsert onConflict("user_id,provider").
create unique index if not exists user_calendar_sync_settings_user_provider_uidx
  on public.user_calendar_sync_settings (user_id, provider);

-- 4. Reload PostgREST schema cache so the new columns are immediately visible
--    without restarting the Supabase project.
notify pgrst, 'reload schema';
