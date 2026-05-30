-- ============================================================================
-- Fix: Drop the single-user unique index that blocks Apple IAP rows
--
-- Root cause:
--   20260528_090000_brobot_subscriptions.sql created:
--     UNIQUE INDEX subscriptions_user_id_idx ON subscriptions (user_id)
--   This allowed only ONE subscription row per user — one provider total.
--
--   20260602_apple_iap_brobot_subscriptions.sql added the correct
--   per-provider index (subscriptions_user_provider_idx ON (user_id, provider))
--   but did NOT drop the old single-user index.
--
--   Result: inserting an Apple row for a user who already has a Stripe row
--   fails with "duplicate key value violates unique constraint subscriptions_user_id_idx".
--
-- Fix: drop the old single-user index so both Stripe and Apple rows coexist.
-- The per-provider index (subscriptions_user_provider_idx) is the correct constraint.
-- ============================================================================

-- Drop the index that blocked multi-provider rows for the same user
DROP INDEX IF EXISTS public.subscriptions_user_id_idx;

-- Verify the replacement index exists (idempotent, safe to re-run)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_provider_idx
  ON public.subscriptions (user_id, provider);

-- Also ensure the active-per-provider guard is in place
DROP INDEX IF EXISTS subscriptions_one_active_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user_provider
  ON public.subscriptions (user_id, provider)
  WHERE status IN ('active', 'past_due', 'trialing', 'incomplete');
