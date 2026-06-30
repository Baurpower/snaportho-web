-- ============================================================================
-- Apple App Store subscription webhook hardening
-- - Adds an idempotent Apple notification log
-- - Enforces one Apple original_transaction_id per subscription row
-- ============================================================================

create table if not exists public.apple_subscription_events (
  id bigserial primary key,
  notification_uuid text not null unique,
  notification_type text not null,
  subtype text,
  original_transaction_id text,
  transaction_id text,
  signed_payload text not null,
  payload_sha256 text not null,
  raw_payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists apple_subscription_events_original_transaction_id_idx
  on public.apple_subscription_events (original_transaction_id);

create index if not exists apple_subscription_events_transaction_id_idx
  on public.apple_subscription_events (transaction_id);

create unique index if not exists subscriptions_apple_original_transaction_uidx
  on public.subscriptions (provider_subscription_id)
  where provider = 'apple' and provider_subscription_id is not null;

comment on table public.apple_subscription_events is
  'Idempotent log of verified App Store Server Notifications V2 payloads for Apple subscriptions.';

-- RLS intentionally left disabled to match the existing server-only subscription tables.
