-- ============================================================================
-- BroBot pre-authentication Stripe checkout support
-- Stores Stripe subscriptions purchased before a Supabase user account exists.
-- ============================================================================

create table if not exists public.pending_subscriptions (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  normalized_email text generated always as (lower(trim(email))) stored,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  stripe_price_id text,
  checkout_session_id text not null,
  plan_code text not null default 'unlimited_brobot',
  status public.subscription_status not null default 'incomplete',
  current_period_start timestamptz,
  current_period_end timestamptz,
  metadata jsonb not null default '{}',
  claimed_by_user_id uuid references auth.users(id) on delete set null,
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists pending_subscriptions_checkout_session_uidx
  on public.pending_subscriptions (checkout_session_id);

create unique index if not exists pending_subscriptions_stripe_subscription_uidx
  on public.pending_subscriptions (stripe_subscription_id);

create index if not exists pending_subscriptions_normalized_email_idx
  on public.pending_subscriptions (normalized_email)
  where claimed_at is null;

create index if not exists pending_subscriptions_stripe_customer_idx
  on public.pending_subscriptions (stripe_customer_id);

create index if not exists pending_subscriptions_claimed_by_user_idx
  on public.pending_subscriptions (claimed_by_user_id);

alter table public.pending_subscriptions enable row level security;

revoke all on public.pending_subscriptions from anon, authenticated;

comment on table public.pending_subscriptions is
  'Stripe BroBot subscriptions purchased before Supabase account creation. Service-role only; claimed into subscriptions after auth.';
