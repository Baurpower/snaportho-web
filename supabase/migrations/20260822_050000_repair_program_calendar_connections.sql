-- Upgrade the legacy program calendar connection table to the encrypted,
-- program-owned source-of-truth shape. The original foundation migration used
-- CREATE TABLE IF NOT EXISTS, which could not update a pre-existing table.

do $$
begin
  if exists (select 1 from public.program_calendar_connections limit 1) then
    raise exception
      'program_calendar_connections contains legacy rows; migrate them before changing the token schema';
  end if;
end
$$;

drop policy if exists "Connected user can view program calendar connection"
  on public.program_calendar_connections;
drop policy if exists "Connected user can insert program calendar connection"
  on public.program_calendar_connections;
drop policy if exists "Connected user can update program calendar connection"
  on public.program_calendar_connections;
drop policy if exists "Connected user can delete program calendar connection"
  on public.program_calendar_connections;

alter table public.program_calendar_connections
  drop constraint if exists program_calendar_connections_connected_by_user_id_fkey;

alter table public.program_calendar_connections
  drop column if exists connected_by_user_id,
  drop column if exists access_token,
  drop column if exists refresh_token,
  drop column if exists calendar_id,
  add column if not exists granted_by_user_id uuid null
    references auth.users(id) on delete set null,
  add column if not exists encrypted_access_token text null,
  add column if not exists encrypted_refresh_token text null,
  add column if not exists status text not null default 'active',
  add column if not exists last_token_error text null,
  add column if not exists last_token_error_at timestamptz null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.program_calendar_connections'::regclass
      and conname = 'program_calendar_connections_status_check'
  ) then
    alter table public.program_calendar_connections
      add constraint program_calendar_connections_status_check
      check (status in ('active', 'reauth_required', 'revoked', 'disabled'));
  end if;
end
$$;

create unique index if not exists program_calendar_connections_id_program_uidx
  on public.program_calendar_connections (id, program_id);

comment on table public.program_calendar_connections is
  'Server-only encrypted program-owned Google OAuth connections.';
