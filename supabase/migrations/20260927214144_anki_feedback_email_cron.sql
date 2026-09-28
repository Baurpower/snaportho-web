-- ============================================================================
-- STAGED — DO NOT APPLY until the feedback email flow is manually verified.
--
-- Enable order (see task step 12):
--   1. Apply the anki_feedback_email migration (table + claim RPC).
--   2. Deploy the send-anki-feedback-emails Edge Function.
--   3. Set the RESEND_API_KEY function secret.
--   4. Invoke the function manually (dry_run, then live) with a test account.
--   5. Confirm exactly-once delivery + database records.
--   6. ONLY THEN: create the vault secrets below and apply this migration.
--
-- Prerequisites before applying:
--   a) Extensions enabled (Dashboard -> Database -> Extensions, or the
--      CREATE EXTENSION statements below if permitted):
--        pg_cron, pg_net, vault (supabase_vault)
--   b) Two vault secrets created ONE TIME by an operator via the dashboard
--      SQL editor (never commit secret values to source control):
--
--        select vault.create_secret(
--          'https://<project-ref>.functions.supabase.co/send-anki-feedback-emails',
--          'anki_feedback_function_url',
--          'Edge Function URL for the 24h Anki feedback email cron job'
--        );
--        select vault.create_secret(
--          '<service-role-key>',
--          'anki_feedback_service_role_key',
--          'Service-role key authorizing the 24h Anki feedback email cron job'
--        );
--
-- This job intentionally carries NO credentials inline: the function URL and
-- key are read from vault at each run.
-- ============================================================================

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-runnable: replace the job if it already exists.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-anki-feedback-emails-15min') then
    perform cron.unschedule('send-anki-feedback-emails-15min');
  end if;
end
$$;

select cron.schedule(
  'send-anki-feedback-emails-15min',
  '*/15 * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'anki_feedback_function_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'anki_feedback_service_role_key')
    ),
    body := '{"batch_limit": 25}'::jsonb,
    -- Function typically responds in <1s; 30s absorbs cold starts.
    timeout_milliseconds := 30000
  );
  $$
);
