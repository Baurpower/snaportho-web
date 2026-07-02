-- ============================================================================
-- Canonical subscription ledger v2
--
-- Goal:
--   Make public.subscriptions the provider-neutral canonical ledger while
--   preserving legacy Stripe-specific columns for backward compatibility.
--
-- Notes:
--   - additive only; do not remove legacy columns yet
--   - provider/environment/provider_subscription_id is the canonical identity
--   - subscription_events is broadened into a provider-neutral immutable log
-- ============================================================================

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subscription_status' and e.enumlabel = 'grace'
  ) then
    null;
  else
    alter type public.subscription_status add value 'grace';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subscription_status' and e.enumlabel = 'billing_retry'
  ) then
    null;
  else
    alter type public.subscription_status add value 'billing_retry';
  end if;
end $$;

do $$
begin
  if exists (
    select 1
    from pg_type t
    join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'subscription_status' and e.enumlabel = 'expired'
  ) then
    null;
  else
    alter type public.subscription_status add value 'expired';
  end if;
end $$;

alter table public.subscriptions
  add column if not exists provider_customer_id text,
  add column if not exists provider_product_id text,
  add column if not exists provider_price_id text,
  add column if not exists provider_original_transaction_id text,
  add column if not exists raw_provider_status text,
  add column if not exists provider_metadata jsonb not null default '{}'::jsonb,
  add column if not exists last_verified_at timestamptz;

update public.subscriptions
set
  provider = coalesce(nullif(provider, ''), 'stripe'),
  provider_customer_id = coalesce(provider_customer_id, stripe_customer_id),
  provider_subscription_id = coalesce(provider_subscription_id, stripe_subscription_id),
  provider_price_id = coalesce(provider_price_id, stripe_price_id),
  provider_original_transaction_id = coalesce(
    provider_original_transaction_id,
    case when provider = 'apple' then provider_subscription_id else null end
  ),
  raw_provider_status = coalesce(raw_provider_status, status::text),
  provider_metadata = coalesce(provider_metadata, '{}'::jsonb),
  last_verified_at = coalesce(last_verified_at, updated_at)
where true;

create unique index if not exists subscriptions_provider_env_subscription_uidx
  on public.subscriptions (provider, environment, provider_subscription_id)
  where provider is not null and environment is not null and provider_subscription_id is not null;

create index if not exists subscriptions_provider_customer_idx
  on public.subscriptions (provider, provider_customer_id)
  where provider_customer_id is not null;

create index if not exists subscriptions_provider_transaction_idx
  on public.subscriptions (provider, provider_transaction_id)
  where provider_transaction_id is not null;

create index if not exists subscriptions_provider_original_transaction_idx
  on public.subscriptions (provider, provider_original_transaction_id)
  where provider_original_transaction_id is not null;

create index if not exists subscriptions_entitlement_lookup_idx
  on public.subscriptions (user_id, plan_code, status, current_period_end desc, updated_at desc);

alter table public.subscription_events
  add column if not exists provider text,
  add column if not exists provider_event_id text,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_transaction_id text,
  add column if not exists received_at timestamptz not null default now(),
  add column if not exists raw_payload jsonb,
  add column if not exists processing_result jsonb;

update public.subscription_events
set
  provider = coalesce(provider, 'stripe'),
  provider_event_id = coalesce(provider_event_id, stripe_event_id),
  raw_payload = coalesce(raw_payload, raw_event),
  received_at = coalesce(received_at, created_at)
where true;

create unique index if not exists subscription_events_provider_event_uidx
  on public.subscription_events (provider, provider_event_id)
  where provider is not null and provider_event_id is not null;

create index if not exists subscription_events_provider_subscription_idx
  on public.subscription_events (provider, provider_subscription_id);

create index if not exists subscription_events_provider_transaction_idx
  on public.subscription_events (provider, provider_transaction_id);

comment on table public.subscriptions is
  'Canonical provider-neutral subscription ledger for SnapOrtho entitlements. Legacy Stripe columns remain for compatibility.';

comment on table public.subscription_events is
  'Immutable provider-neutral subscription event log. Stores Stripe, Apple, and future provider audit events.';
