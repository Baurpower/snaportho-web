-- Two-phase device-token activation. New add-ons acknowledge only after native
-- credential persistence; older add-ons receive immediately active tokens.
begin;

create extension if not exists pg_cron;

alter table public.brobot_anki_device_tokens
  add column if not exists activated_at timestamptz null,
  add column if not exists provisional_expires_at timestamptz null;

update public.brobot_anki_device_tokens
set activated_at = coalesce(activated_at, created_at),
    updated_at = timezone('utc', now())
where activated_at is null
  and provisional_expires_at is null;

create index if not exists brobot_anki_device_tokens_provisional_expiry_idx
  on public.brobot_anki_device_tokens (provisional_expires_at)
  where activated_at is null and revoked_at is null;

create or replace function public.revoke_expired_provisional_anki_tokens()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  update public.brobot_anki_device_tokens
  set revoked_at = pg_catalog.timezone('utc', pg_catalog.now()),
      updated_at = pg_catalog.timezone('utc', pg_catalog.now())
  where activated_at is null
    and revoked_at is null
    and provisional_expires_at <= pg_catalog.timezone('utc', pg_catalog.now());
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.revoke_expired_provisional_anki_tokens() from public, anon, authenticated;
grant execute on function public.revoke_expired_provisional_anki_tokens() to service_role;

do $$
declare job record;
begin
  for job in select jobid from cron.job where jobname = 'revoke-expired-provisional-anki-tokens'
  loop perform cron.unschedule(job.jobid); end loop;
end $$;

select cron.schedule(
  'revoke-expired-provisional-anki-tokens',
  '*/15 * * * *',
  $job$select public.revoke_expired_provisional_anki_tokens();$job$
);

comment on column public.brobot_anki_device_tokens.activated_at is
  'Set only after a client confirms native credential persistence; legacy clients are activated at issuance.';
comment on column public.brobot_anki_device_tokens.provisional_expires_at is
  'Expiry for an issued but not yet client-acknowledged token; raw tokens are never retained server-side.';

create or replace view analytics.anki_linked_devices
with (security_invoker = true) as
select
  count(*) filter (where revoked_at is null and activated_at is not null) as linked_devices,
  count(distinct user_id) filter (where revoked_at is null and activated_at is not null) as linked_users,
  count(distinct user_id) filter (
    where revoked_at is null and activated_at is not null and last_used_at >= now() - interval '1 day'
  ) as active_users_1d,
  count(distinct user_id) filter (
    where revoked_at is null and activated_at is not null and last_used_at >= now() - interval '7 day'
  ) as active_users_7d,
  count(distinct user_id) filter (
    where revoked_at is null and activated_at is not null and last_used_at >= now() - interval '30 day'
  ) as active_users_30d,
  count(*) filter (where revoked_at is null and activated_at is null) as provisional_devices
from public.brobot_anki_device_tokens;

commit;
