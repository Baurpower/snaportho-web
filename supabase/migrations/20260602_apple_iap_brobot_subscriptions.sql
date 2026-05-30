-- ============================================================================
-- Apple IAP Support for BroBot Subscriptions
-- Extends the subscriptions table for Apple App Store purchases (in addition to Stripe).
-- One active BroBot subscription per (user, provider) pair.
-- ============================================================================

-- Add provider columns (additive, backward compatible)
ALTER TABLE public.subscriptions 
  ADD COLUMN IF NOT EXISTS provider text DEFAULT 'stripe',
  ADD COLUMN IF NOT EXISTS provider_subscription_id text,
  ADD COLUMN IF NOT EXISTS provider_transaction_id text,
  ADD COLUMN IF NOT EXISTS environment text;

-- Make legacy Stripe columns nullable so pure-Apple rows are valid
ALTER TABLE public.subscriptions 
  ALTER COLUMN stripe_customer_id DROP NOT NULL,
  ALTER COLUMN stripe_subscription_id DROP NOT NULL;

-- Backfill existing rows
UPDATE public.subscriptions 
SET provider = 'stripe' 
WHERE provider IS NULL OR provider = '';

-- New indexes for multi-provider support
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_provider_idx 
  ON public.subscriptions (user_id, provider);

-- Replace/adjust the "one active per user" guard to be per-provider
DROP INDEX IF EXISTS subscriptions_one_active_per_user;
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_one_active_per_user_provider
  ON public.subscriptions (user_id, provider)
  WHERE status IN ('active', 'past_due', 'trialing', 'incomplete');

-- Helpful index for Apple lookups
CREATE INDEX IF NOT EXISTS subscriptions_provider_idx ON public.subscriptions (provider);
CREATE INDEX IF NOT EXISTS subscriptions_provider_sub_id_idx ON public.subscriptions (provider_subscription_id);

-- Update table comment
COMMENT ON TABLE public.subscriptions IS 
  'BroBot subscription records. Supports multiple providers (stripe, apple). Source of truth for entitlements.';

-- Note: RLS remains disabled (service role only, same as before).
-- Existing Stripe code will continue to set provider='stripe'.
