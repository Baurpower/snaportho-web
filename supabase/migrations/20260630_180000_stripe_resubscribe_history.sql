-- ============================================================================
-- Stripe resubscribe hardening
--
-- Root cause:
--   Stripe rows were constrained and upserted by (user_id, provider), which
--   collapses all Stripe subscription history into a single row. When a user
--   cancels and later resubscribes with a new Stripe subscription ID, the new
--   subscription cannot safely coexist with the old canceled row.
--
-- Fix:
--   - allow multiple Stripe rows per user/provider
--   - keep one active-like row per user/provider as a best-effort guard
--   - preserve Stripe row identity by stripe_subscription_id
-- ============================================================================

drop index if exists public.subscriptions_user_provider_idx;

drop index if exists public.subscriptions_one_active_per_user_provider;
create unique index if not exists subscriptions_one_active_per_user_provider
  on public.subscriptions (user_id, provider)
  where status in ('active', 'past_due', 'trialing', 'incomplete');

create index if not exists subscriptions_user_provider_lookup_idx
  on public.subscriptions (user_id, provider, plan_code, current_period_end desc, updated_at desc);

comment on table public.subscriptions is
  'BroBot subscription records. Supports multiple provider rows and Stripe resubscribe history. Source of truth for entitlements.';
