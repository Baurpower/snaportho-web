-- Protect the server-owned billing ledger from Data API access and make a
-- provider subscription's account owner immutable under concurrent upserts.
--
-- This migration is additive. It does not apply itself to a live project;
-- deploy it through the normal Supabase migration path.

alter table public.subscriptions enable row level security;
alter table public.subscriptions force row level security;
alter table public.subscription_events enable row level security;
alter table public.subscription_events force row level security;
alter table public.entitlement_overrides enable row level security;
alter table public.entitlement_overrides force row level security;

revoke all on table public.subscriptions from anon, authenticated;
revoke all on table public.subscription_events from anon, authenticated;
revoke all on table public.entitlement_overrides from anon, authenticated;

create or replace function public.guard_subscription_owner_immutable()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.user_id is distinct from new.user_id then
    raise exception using
      errcode = 'P0001',
      message = 'subscription_owner_conflict',
      detail = 'A provider subscription cannot be reassigned to another user.';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_subscription_owner_immutable() from public;
revoke execute on function public.guard_subscription_owner_immutable() from anon, authenticated;

drop trigger if exists guard_subscription_owner_immutable on public.subscriptions;
create trigger guard_subscription_owner_immutable
before update of user_id on public.subscriptions
for each row
execute function public.guard_subscription_owner_immutable();

comment on function public.guard_subscription_owner_immutable() is
  'Prevents concurrent provider-identity upserts from transferring subscription ownership.';

create or replace function public.upsert_subscription_preserving_owner(payload jsonb)
returns public.subscriptions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  result public.subscriptions;
begin
  if payload is null
     or nullif(payload->>'user_id', '') is null
     or nullif(payload->>'provider', '') is null
     or nullif(payload->>'environment', '') is null
     or nullif(payload->>'provider_subscription_id', '') is null then
    raise exception using
      errcode = '22023',
      message = 'subscription_upsert_missing_identity';
  end if;

  insert into public.subscriptions (
    user_id,
    provider,
    environment,
    provider_subscription_id,
    provider_customer_id,
    provider_product_id,
    provider_price_id,
    provider_original_transaction_id,
    provider_transaction_id,
    raw_provider_status,
    provider_metadata,
    plan_code,
    status,
    current_period_start,
    current_period_end,
    cancel_at_period_end,
    canceled_at,
    last_verified_at,
    stripe_customer_id,
    stripe_subscription_id,
    stripe_price_id,
    updated_at
  )
  values (
    (payload->>'user_id')::uuid,
    payload->>'provider',
    payload->>'environment',
    payload->>'provider_subscription_id',
    nullif(payload->>'provider_customer_id', ''),
    nullif(payload->>'provider_product_id', ''),
    nullif(payload->>'provider_price_id', ''),
    nullif(payload->>'provider_original_transaction_id', ''),
    nullif(payload->>'provider_transaction_id', ''),
    nullif(payload->>'raw_provider_status', ''),
    coalesce(payload->'provider_metadata', '{}'::jsonb),
    coalesce(nullif(payload->>'plan_code', ''), 'unlimited_brobot'),
    coalesce(nullif(payload->>'status', ''), 'incomplete')::public.subscription_status,
    nullif(payload->>'current_period_start', '')::timestamptz,
    nullif(payload->>'current_period_end', '')::timestamptz,
    coalesce((payload->>'cancel_at_period_end')::boolean, false),
    nullif(payload->>'canceled_at', '')::timestamptz,
    coalesce(nullif(payload->>'last_verified_at', '')::timestamptz, now()),
    nullif(payload->>'stripe_customer_id', ''),
    nullif(payload->>'stripe_subscription_id', ''),
    nullif(payload->>'stripe_price_id', ''),
    now()
  )
  on conflict (provider, provider_subscription_id, environment)
  do update set
    provider_customer_id = excluded.provider_customer_id,
    provider_product_id = excluded.provider_product_id,
    provider_price_id = excluded.provider_price_id,
    provider_original_transaction_id = excluded.provider_original_transaction_id,
    provider_transaction_id = excluded.provider_transaction_id,
    raw_provider_status = excluded.raw_provider_status,
    provider_metadata = excluded.provider_metadata,
    plan_code = excluded.plan_code,
    status = excluded.status,
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    cancel_at_period_end = excluded.cancel_at_period_end,
    canceled_at = excluded.canceled_at,
    last_verified_at = excluded.last_verified_at,
    stripe_customer_id = excluded.stripe_customer_id,
    stripe_subscription_id = excluded.stripe_subscription_id,
    stripe_price_id = excluded.stripe_price_id,
    updated_at = now()
  where public.subscriptions.user_id = excluded.user_id
  returning * into result;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'subscription_owner_conflict',
      detail = 'A provider subscription cannot be reassigned to another user.';
  end if;

  return result;
end;
$$;

revoke execute on function public.upsert_subscription_preserving_owner(jsonb) from public;
revoke execute on function public.upsert_subscription_preserving_owner(jsonb) from anon, authenticated;
grant execute on function public.upsert_subscription_preserving_owner(jsonb) to service_role;

comment on function public.upsert_subscription_preserving_owner(jsonb) is
  'Inserts or updates a canonical subscription only when the caller already owns the provider identity.';
