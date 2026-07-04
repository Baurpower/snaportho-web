-- ============================================================================
-- Canonical subscription upsert conflict target
--
-- Apple mobile sync upserts subscriptions by stable provider subscription
-- identity. For Apple, provider_subscription_id is originalTransactionId, not
-- the per-renewal transactionId. This non-partial unique index is required so
-- PostgREST/Supabase can infer the conflict target for:
--   onConflict: 'provider,provider_subscription_id,environment'
--
-- A partial unique index with the same columns is not enough for a plain
-- ON CONFLICT column target because the conflict target cannot express the
-- partial-index predicate through supabase-js.
-- ============================================================================

create unique index if not exists subscriptions_provider_subscription_environment_uidx
  on public.subscriptions (provider, provider_subscription_id, environment);

comment on index public.subscriptions_provider_subscription_environment_uidx is
  'Supports idempotent provider subscription upserts. Apple stores originalTransactionId in provider_subscription_id; latest transactionId is provider_transaction_id.';
