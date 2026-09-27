-- Run after 20260927230000_anki_device_token_activation_lifecycle.sql.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'brobot_anki_device_tokens'
      and column_name = 'activated_at'
  ) then raise exception 'activated_at missing'; end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'brobot_anki_device_tokens'
      and column_name = 'provisional_expires_at'
  ) then raise exception 'provisional_expires_at missing'; end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'revoke_expired_provisional_anki_tokens'
  ) then raise exception 'provisional cleanup function missing'; end if;
  if has_function_privilege('public', 'public.revoke_expired_provisional_anki_tokens()', 'execute')
     or has_function_privilege('anon', 'public.revoke_expired_provisional_anki_tokens()', 'execute')
     or has_function_privilege('authenticated', 'public.revoke_expired_provisional_anki_tokens()', 'execute')
  then raise exception 'cleanup function is exposed to an application role'; end if;
  if not has_function_privilege('service_role', 'public.revoke_expired_provisional_anki_tokens()', 'execute')
  then raise exception 'service_role cannot execute cleanup function'; end if;
  if not exists (
    select 1 from cron.job
    where jobname = 'revoke-expired-provisional-anki-tokens'
      and schedule = '*/15 * * * *'
  ) then raise exception 'provisional cleanup cron missing or incorrectly scheduled'; end if;
end $$;

select activated_at is not null as legacy_token_activated,
       provisional_expires_at is null as legacy_token_not_provisional
from public.brobot_anki_device_tokens
where created_at < '2026-09-27 23:00:00+00'
limit 25;
