-- Durable Branch conversion outbox.
-- Guest Stripe claims, Apple mobile sync, and provider webhooks enqueue
-- START_TRIAL/SUBSCRIBE here so delivery is idempotent and retryable.

create table if not exists public.branch_conversion_outbox (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'apple')),
  event_name text not null check (event_name in ('START_TRIAL', 'SUBSCRIBE', 'PURCHASE')),
  transaction_id text not null,
  environment text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  custom_data jsonb not null default '{}'::jsonb,
  user_data jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'delivered', 'failed')),
  attempt_count integer not null default 0,
  last_error text,
  last_attempted_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists branch_conversion_outbox_identity_uidx
  on public.branch_conversion_outbox (provider, event_name, transaction_id, environment);

create index if not exists branch_conversion_outbox_retry_idx
  on public.branch_conversion_outbox (status, last_attempted_at)
  where status in ('pending', 'failed');

alter table public.branch_conversion_outbox enable row level security;
alter table public.branch_conversion_outbox force row level security;
revoke all on table public.branch_conversion_outbox from anon, authenticated;

comment on table public.branch_conversion_outbox is
  'Idempotent Branch START_TRIAL/SUBSCRIBE delivery queue. Service-role only.';
