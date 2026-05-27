-- ============================================================================
-- BroBot Phase 2: Stripe Subscriptions & Entitlements
-- Adds support for paid "Unlimited BroBot" while preserving Phase 1 quotas.
-- ============================================================================

-- Enums
do $$
begin
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type public.subscription_status as enum (
      'incomplete',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'trialing'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'entitlement_override_type') then
    create type public.entitlement_override_type as enum (
      'hard_disable',
      'unlimited_until',
      'unlimited_permanent'
    );
  end if;
end $$;

-- Main subscriptions table (one row per user, upserted on each Stripe event)
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  stripe_customer_id text not null,
  stripe_subscription_id text unique,
  stripe_price_id text,

  plan_code text not null default 'unlimited_brobot',

  status public.subscription_status not null default 'incomplete',

  current_period_start timestamptz,
  current_period_end timestamptz,

  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,

  metadata jsonb default '{}',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes
create unique index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions (stripe_customer_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
create index if not exists subscriptions_current_period_end_idx on public.subscriptions (current_period_end);

-- Prevent multiple active-like subscriptions per user (best-effort)
create unique index if not exists subscriptions_one_active_per_user
  on public.subscriptions (user_id)
  where status in ('active', 'past_due', 'trialing', 'incomplete');

-- Append-only subscription event log (for webhooks + audit)
create table if not exists public.subscription_events (
  id bigserial primary key,
  stripe_event_id text not null unique,
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  processed_at timestamptz,
  raw_event jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists subscription_events_user_id_idx on public.subscription_events (user_id);
create index if not exists subscription_events_event_type_idx on public.subscription_events (event_type);

-- Admin / manual entitlement overrides (highest precedence)
create table if not exists public.entitlement_overrides (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type public.entitlement_override_type not null,
  expires_at timestamptz,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists entitlement_overrides_user_id_idx on public.entitlement_overrides (user_id);

-- Comments for future maintainers
comment on table public.subscriptions is
  'BroBot subscription records. Stripe is billing source of truth; this table is the entitlement source of truth.';
comment on table public.subscription_events is
  'Idempotent log of Stripe webhook events for BroBot subscriptions.';
comment on table public.entitlement_overrides is
  'Highest-precedence manual overrides (admin grants, hard disables, etc.).';

-- RLS intentionally left disabled for now (same pattern as Phase 1 usage tables).
-- All reads/writes use service role via createAdminClient().