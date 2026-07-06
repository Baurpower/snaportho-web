import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createAdminClient } from '../src/lib/supabase/admin.ts';

type Args = {
  userId: string | null;
  email: string | null;
  firstSubscriptionUser: boolean;
};

type SubscriptionRow = {
  id: string | null;
  user_id: string;
  provider: string | null;
  environment: string | null;
  plan_code: string;
  status: string;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  provider_original_transaction_id: string | null;
  provider_transaction_id: string | null;
  raw_provider_status: string | null;
  last_verified_at: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type SubscriptionEventRow = {
  provider: string | null;
  provider_event_id: string | null;
  event_type: string | null;
  user_id: string | null;
  provider_subscription_id: string | null;
  provider_transaction_id: string | null;
  received_at: string | null;
  processed_at: string | null;
  processing_result: Record<string, unknown> | null;
};

function parseArgs(argv: string[]): Args {
  let userId: string | null = null;
  let email: string | null = null;
  let firstSubscriptionUser = false;

  for (let index = 2; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--user-id') {
      userId = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--email') {
      email = argv[index + 1] ?? null;
      index += 1;
    } else if (arg === '--first-subscription-user') {
      firstSubscriptionUser = true;
    }
  }

  return { userId, email, firstSubscriptionUser };
}

function loadDotEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;

  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function getTs(value: string | null | undefined) {
  if (!value) return null;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : null;
}

function grantsAccess(row: SubscriptionRow, now: Date) {
  const periodEnd = getTs(row.current_period_end);
  const periodEndIsFuture = periodEnd != null && periodEnd > now.getTime();

  if ((row.status === 'active' || row.status === 'trialing') && periodEndIsFuture) return true;
  if (row.status === 'grace' && row.provider === 'apple' && periodEndIsFuture) return true;
  return false;
}

function statusRank(status: string) {
  switch (status) {
    case 'active': return 7;
    case 'trialing': return 6;
    case 'grace': return 5;
    case 'billing_retry': return 4;
    case 'past_due': return 3;
    case 'canceled': return 2;
    case 'expired': return 1;
    default: return 0;
  }
}

function reason(row: SubscriptionRow, now: Date, selected: boolean, grants: boolean) {
  if (selected) return `selected_${row.status}_with_latest_valid_current_period_end`;
  if (grants) return 'valid_but_lower_priority_than_selected_subscription';

  const periodEnd = getTs(row.current_period_end);
  const future = periodEnd != null && periodEnd > now.getTime();

  if ((row.status === 'active' || row.status === 'trialing') && !future) {
    return 'active_like_status_missing_or_past_current_period_end';
  }
  if (row.status === 'grace' && row.provider !== 'apple') return 'grace_period_only_entitles_apple_subscriptions';
  if (row.status === 'grace' && !future) return 'apple_grace_period_missing_or_past_current_period_end';
  if (row.status === 'canceled' || row.status === 'expired') {
    return future
      ? `${row.status}_status_does_not_grant_access_even_with_future_period_end`
      : `${row.status}_and_period_ended`;
  }
  return `status_${row.status || 'unknown'}_does_not_grant_access`;
}

function pickBest(rows: SubscriptionRow[], now: Date) {
  return [...rows]
    .filter((row) => grantsAccess(row, now))
    .sort((left, right) => {
      const statusDiff = statusRank(right.status) - statusRank(left.status);
      if (statusDiff !== 0) return statusDiff;

      const periodDiff = (getTs(right.current_period_end) ?? -Infinity) - (getTs(left.current_period_end) ?? -Infinity);
      if (periodDiff !== 0) return periodDiff;

      return (getTs(right.updated_at) ?? -Infinity) - (getTs(left.updated_at) ?? -Infinity);
    })[0] ?? null;
}

function resolutionSource(selected: SubscriptionRow | null) {
  if (!selected) return 'free_quota';
  if (selected.provider === 'apple') {
    if (selected.status === 'grace' || selected.status === 'billing_retry') return 'apple_cached';
    return selected.environment === 'sandbox' ? 'apple_sandbox' : 'apple_live';
  }
  if (selected.provider === 'stripe' || !selected.provider) {
    return selected.environment === 'test' ? 'stripe_test' : 'stripe_live';
  }
  return 'legacy';
}

function resolutionReason(selected: SubscriptionRow | null) {
  if (!selected) return 'No active paid subscription found; free quota only';
  if (selected.provider === 'apple') {
    if (selected.status === 'grace') return 'Selected Apple subscription currently in grace period';
    if (selected.status === 'billing_retry') return 'Provider verification unavailable or billing retry active; cached Apple entitlement used until current period end';
    return 'Selected newest active Apple subscription';
  }
  if (selected.status === 'trialing') return 'Selected newest trialing Stripe subscription';
  return 'Selected newest active Stripe subscription';
}

function detectIssues(rows: SubscriptionRow[], now: Date) {
  const issues: string[] = [];
  const paidRows = rows.filter((row) => row.plan_code === 'unlimited_brobot');
  const grantingRows = paidRows.filter((row) => grantsAccess(row, now));

  if (grantingRows.length > 1) {
    issues.push(`multiple_entitling_rows:${grantingRows.map((row) => row.id ?? row.provider_subscription_id ?? row.stripe_subscription_id).join(',')}`);
  }

  for (const row of paidRows) {
    if (!row.provider_subscription_id && !row.stripe_subscription_id) {
      issues.push(`missing_provider_subscription_id:${row.id ?? 'unknown_row'}`);
    }
    if (['active', 'trialing', 'grace', 'billing_retry'].includes(row.status) && !row.current_period_end) {
      issues.push(`missing_current_period_end:${row.id ?? row.provider_subscription_id ?? row.stripe_subscription_id ?? 'unknown_row'}`);
    }
    if (row.provider === 'apple' && !row.provider_original_transaction_id && !row.provider_subscription_id) {
      issues.push(`missing_apple_original_transaction_id:${row.id ?? 'unknown_row'}`);
    }
  }

  const providerIds = new Map<string, number>();
  const transactionIds = new Map<string, number>();
  for (const row of paidRows) {
    const providerKey = row.provider && row.environment && row.provider_subscription_id
      ? `${row.provider}:${row.environment}:${row.provider_subscription_id}`
      : null;
    if (providerKey) providerIds.set(providerKey, (providerIds.get(providerKey) ?? 0) + 1);
    if (row.provider_transaction_id) {
      const key = `${row.provider ?? 'unknown'}:${row.provider_transaction_id}`;
      transactionIds.set(key, (transactionIds.get(key) ?? 0) + 1);
    }
  }

  for (const [key, count] of providerIds.entries()) {
    if (count > 1) issues.push(`duplicate_provider_subscription:${key}`);
  }
  for (const [key, count] of transactionIds.entries()) {
    if (count > 1) issues.push(`duplicate_provider_transaction:${key}`);
  }

  const appleEnvironmentsByOriginal = new Map<string, Set<string>>();
  for (const row of paidRows.filter((candidate) => candidate.provider === 'apple')) {
    const original = row.provider_original_transaction_id ?? row.provider_subscription_id;
    if (!original) continue;
    const set = appleEnvironmentsByOriginal.get(original) ?? new Set<string>();
    set.add(row.environment ?? 'unknown');
    appleEnvironmentsByOriginal.set(original, set);
  }
  for (const [original, environments] of appleEnvironmentsByOriginal.entries()) {
    if (environments.size > 1) issues.push(`mixed_apple_environments:${original}:${Array.from(environments).join(',')}`);
  }

  return issues;
}

async function resolveUserId(args: Args) {
  if (args.userId) return args.userId;
  const supabase = createAdminClient();

  if (args.firstSubscriptionUser) {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('user_id')
      .eq('plan_code', 'unlimited_brobot')
      .not('user_id', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ user_id: string }>();

    if (error) throw new Error(`Failed to find a subscription user: ${error.message}`);
    if (!data?.user_id) throw new Error('No subscription user found.');
    return data.user_id;
  }

  if (!args.email) throw new Error('Pass --user-id <uuid>, --email <address>, or --first-subscription-user.');

  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw new Error(`Failed to list auth users: ${error.message}`);

  const user = data.users.find((candidate) => candidate.email?.toLowerCase() === args.email!.toLowerCase());
  if (!user) throw new Error(`No Supabase auth user found for ${args.email}.`);
  return user.id;
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv);
  const userId = await resolveUserId(args);
  const supabase = createAdminClient();
  const now = new Date();

  const [{ data: user }, { data: userProfiles }, { data: subscriptions, error: subscriptionError }, { data: usage }] =
    await Promise.all([
      supabase.auth.admin.getUserById(userId),
      supabase.from('user_profiles').select('user_id,email,display_name').eq('user_id', userId).limit(5),
      supabase
        .from('subscriptions')
        .select(`
          id, user_id, provider, environment, plan_code, status, current_period_start, current_period_end,
          cancel_at_period_end, canceled_at, stripe_customer_id, stripe_subscription_id, stripe_price_id,
          provider_customer_id, provider_subscription_id, provider_original_transaction_id,
          provider_transaction_id, raw_provider_status, last_verified_at, updated_at, created_at
        `)
        .eq('user_id', userId)
        .order('current_period_end', { ascending: false, nullsFirst: false })
        .order('updated_at', { ascending: false }),
      supabase
        .from('user_daily_usage')
        .select('*')
        .eq('user_id', userId)
        .order('usage_date', { ascending: false })
        .limit(14),
    ]);

  if (subscriptionError) {
    throw new Error(`Failed to load subscriptions: ${subscriptionError.message}`);
  }

  const rows = (subscriptions ?? []) as SubscriptionRow[];
  const selected = pickBest(rows.filter((row) => row.plan_code === 'unlimited_brobot'), now);
  const selectedIdentity = selected?.id ?? selected?.provider_subscription_id ?? selected?.stripe_subscription_id ?? null;
  const selectedProviderSubscriptionId = selected?.provider_subscription_id ?? selected?.stripe_subscription_id ?? null;
  const customerIds = Array.from(
    new Set(rows.map((row) => row.provider_customer_id ?? row.stripe_customer_id).filter(Boolean))
  );
  const appleIdentifiers = Array.from(
    new Set(
      rows
        .filter((row) => row.provider === 'apple')
        .flatMap((row) => [row.provider_original_transaction_id, row.provider_subscription_id, row.provider_transaction_id])
        .filter(Boolean)
    )
  );
  const candidates = rows.map((row) => {
    const rowIdentity = row.id ?? row.provider_subscription_id ?? row.stripe_subscription_id ?? null;
    const selectedRow = Boolean(selectedIdentity && rowIdentity === selectedIdentity);
    const rowGrants = grantsAccess(row, now);
    return {
      id: row.id,
      provider: row.provider ?? 'stripe',
      environment: row.environment,
      planCode: row.plan_code,
      status: row.status,
      currentPeriodEnd: row.current_period_end,
      cancelAtPeriodEnd: row.cancel_at_period_end ?? false,
      stripeCustomerId: row.stripe_customer_id ?? row.provider_customer_id,
      stripeSubscriptionId: row.stripe_subscription_id,
      providerSubscriptionId: row.provider_subscription_id,
      appleOriginalTransactionId: row.provider === 'apple'
        ? row.provider_original_transaction_id ?? row.provider_subscription_id
        : null,
      providerTransactionId: row.provider_transaction_id,
      lastVerifiedAt: row.last_verified_at,
      selected: selectedRow,
      grantsAccess: rowGrants,
      reason: reason(row, now, selectedRow, rowGrants),
    };
  });

  const eventFilters = [
    `user_id.eq.${userId}`,
    selectedProviderSubscriptionId ? `provider_subscription_id.eq.${selectedProviderSubscriptionId}` : null,
    ...rows
      .map((row) => row.provider_transaction_id)
      .filter(Boolean)
      .slice(0, 10)
      .map((transactionId) => `provider_transaction_id.eq.${transactionId}`),
  ].filter(Boolean);

  const { data: events, error: eventsError } = eventFilters.length > 0
    ? await supabase
        .from('subscription_events')
        .select('provider, provider_event_id, event_type, user_id, provider_subscription_id, provider_transaction_id, received_at, processed_at, processing_result')
        .or(eventFilters.join(','))
        .order('received_at', { ascending: false })
        .limit(25)
    : { data: [], error: null };

  if (eventsError) {
    throw new Error(`Failed to load subscription events: ${eventsError.message}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const todayUsage = (usage ?? []).find((row: { usage_date?: string }) => row.usage_date === today);
  const usedToday = typeof todayUsage?.count === 'number' ? todayUsage.count : 0;
  const freeLimit = Number(process.env.BROBOT_FREE_DAILY_CAP || '3');
  const supabaseHost = (() => {
    try {
      return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').host;
    } catch {
      return null;
    }
  })();

  const duplicateEmailUsers =
    user.user?.email
      ? (await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 })).data.users.filter(
          (candidate) => candidate.email?.toLowerCase() === user.user!.email!.toLowerCase()
        ).length
      : 0;

  console.log(JSON.stringify({
    auditedAt: now.toISOString(),
    environment: {
      supabaseHost,
      brobotPaidEnabled: process.env.BROBOT_PAID_ENABLED !== 'false',
      brobotEnabled: process.env.BROBOT_ENABLED !== 'false',
      nodeEnv: process.env.NODE_ENV ?? 'development',
    },
    user: {
      id: user.user?.id ?? userId,
      email: user.user?.email ?? args.email,
      duplicateAuthUsersWithSameEmail: duplicateEmailUsers,
    },
    userProfiles: userProfiles ?? [],
    stripeCustomerIds: customerIds,
    appleIdentifiers,
    usage: usage ?? [],
    quota: {
      usedToday,
      freeLimit,
      freeRemaining: Math.max(0, freeLimit - usedToday),
    },
    selectedEntitlement: selected
      ? {
          access: 'unlimited',
          planCode: 'unlimited_brobot',
          provider: selected.provider ?? 'stripe',
          status: selected.status,
          currentPeriodEnd: selected.current_period_end,
          selectedSubscriptionRowId: selected.id,
          selectedSubscriptionId: selectedProviderSubscriptionId,
          resolutionSource: resolutionSource(selected),
          resolutionReason: resolutionReason(selected),
        }
      : {
          access: 'free',
          planCode: 'free',
          provider: 'none',
          status: null,
          currentPeriodEnd: null,
          selectedSubscriptionRowId: null,
          selectedSubscriptionId: null,
          resolutionSource: 'free_quota',
          resolutionReason: resolutionReason(null),
        },
    apiMeEntitlements: selected
      ? {
          access: 'unlimited',
          planCode: 'unlimited_brobot',
          provider: selected.provider === 'apple' ? 'apple' : 'stripe',
          status: selected.status,
          currentPeriodEnd: selected.current_period_end,
          resolutionSource: resolutionSource(selected),
          resolutionReason: resolutionReason(selected),
          selectedSubscriptionId: selectedProviderSubscriptionId,
          legacySource: 'subscription',
          legacyUnlimited: true,
          freeQuotaRemaining: Math.max(0, freeLimit - usedToday),
          isLimitReached: false,
        }
      : {
          access: 'free',
          planCode: 'free',
          provider: 'none',
          status: null,
          currentPeriodEnd: null,
          resolutionSource: 'free_quota',
          resolutionReason: resolutionReason(null),
          selectedSubscriptionId: null,
          legacySource: 'free_quota',
          legacyUnlimited: false,
          freeQuotaRemaining: Math.max(0, freeLimit - usedToday),
          isLimitReached: Math.max(0, freeLimit - usedToday) <= 0,
        },
    candidates,
    issues: detectIssues(rows, now),
    subscriptionEvents: ((events ?? []) as SubscriptionEventRow[]).map((event) => ({
      provider: event.provider,
      eventType: event.event_type,
      providerEventId: event.provider_event_id,
      providerSubscriptionId: event.provider_subscription_id,
      providerTransactionId: event.provider_transaction_id,
      receivedAt: event.received_at,
      processedAt: event.processed_at,
      processingResult: event.processing_result,
    })),
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
