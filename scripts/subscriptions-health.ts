import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

type Check = {
  name: string;
  ok: boolean;
  detail: string;
  action?: string;
};

type SubscriptionRow = {
  id: string | null;
  user_id: string | null;
  provider: string | null;
  environment: string | null;
  plan_code: string | null;
  status: string | null;
  current_period_end: string | null;
  provider_subscription_id: string | null;
  provider_original_transaction_id: string | null;
  provider_transaction_id: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  updated_at: string | null;
};

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

function check(name: string, ok: boolean, detail: string, action?: string): Check {
  return { name, ok, detail, action };
}

function isFuture(value: string | null | undefined, now = Date.now()) {
  if (!value) return false;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) && ts > now;
}

function rowGrantsAccess(row: SubscriptionRow) {
  if (!isFuture(row.current_period_end)) return false;
  if (row.status === 'active' || row.status === 'trialing') return true;
  if (row.provider === 'apple' && (row.status === 'grace' || row.status === 'billing_retry')) return true;
  return false;
}

function getStripeEnvironment(secretKey: string | undefined) {
  if (secretKey?.startsWith('sk_live_')) return 'live';
  if (secretKey?.startsWith('sk_test_')) return 'test';
  return 'unknown';
}

function detectSubscriptionIssues(rows: SubscriptionRow[]) {
  const issues: string[] = [];
  const providerKeys = new Map<string, number>();
  const transactionKeys = new Map<string, number>();
  const entitlingByUser = new Map<string, SubscriptionRow[]>();

  for (const row of rows) {
    const id = row.id ?? row.provider_subscription_id ?? row.stripe_subscription_id ?? 'unknown_row';

    if (!row.user_id) issues.push(`missing_user_mapping:${id}`);
    if (!row.provider_subscription_id && !row.stripe_subscription_id) issues.push(`missing_provider_subscription_id:${id}`);
    if (['active', 'trialing', 'grace', 'billing_retry'].includes(row.status ?? '') && !row.current_period_end) {
      issues.push(`missing_current_period_end:${id}`);
    }

    if (row.provider && row.environment && row.provider_subscription_id) {
      const key = `${row.provider}:${row.environment}:${row.provider_subscription_id}`;
      providerKeys.set(key, (providerKeys.get(key) ?? 0) + 1);
    }
    if (row.provider && row.provider_transaction_id) {
      const key = `${row.provider}:${row.provider_transaction_id}`;
      transactionKeys.set(key, (transactionKeys.get(key) ?? 0) + 1);
    }
    if (row.user_id && rowGrantsAccess(row)) {
      const list = entitlingByUser.get(row.user_id) ?? [];
      list.push(row);
      entitlingByUser.set(row.user_id, list);
    }
  }

  for (const [key, count] of providerKeys.entries()) {
    if (count > 1) issues.push(`duplicate_provider_subscription:${key}`);
  }
  for (const [key, count] of transactionKeys.entries()) {
    if (count > 1) issues.push(`duplicate_provider_transaction:${key}`);
  }
  for (const [userId, grantingRows] of entitlingByUser.entries()) {
    if (grantingRows.length > 1) {
      issues.push(`conflicting_active_subscriptions:${userId}:${grantingRows.map((row) => row.id ?? row.provider_subscription_id ?? row.stripe_subscription_id).join('|')}`);
    }
  }

  const appleEnvironments = new Map<string, Set<string>>();
  for (const row of rows.filter((candidate) => candidate.provider === 'apple')) {
    const original = row.provider_original_transaction_id ?? row.provider_subscription_id;
    if (!original) continue;
    const set = appleEnvironments.get(original) ?? new Set<string>();
    set.add(row.environment ?? 'unknown');
    appleEnvironments.set(original, set);
  }
  for (const [original, environments] of appleEnvironments.entries()) {
    if (environments.size > 1) {
      issues.push(`mixed_apple_environments:${original}:${Array.from(environments).join(',')}`);
    }
  }

  return issues;
}

async function main() {
  loadDotEnvLocal();

  const checks: Check[] = [];
  const stripeEnv = getStripeEnvironment(process.env.STRIPE_SECRET_KEY);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  checks.push(check('Stripe configured', Boolean(process.env.STRIPE_SECRET_KEY), `environment=${stripeEnv}`, 'Set STRIPE_SECRET_KEY.'));
  checks.push(check('Stripe webhook secret present', Boolean(process.env.STRIPE_WEBHOOK_SECRET), 'STRIPE_WEBHOOK_SECRET checked', 'Set STRIPE_WEBHOOK_SECRET.'));
  checks.push(check('Stripe monthly price mapped', Boolean(process.env.STRIPE_BROBOT_MONTHLY_PRICE_ID), 'STRIPE_BROBOT_MONTHLY_PRICE_ID checked', 'Set monthly BroBot price ID.'));
  checks.push(check('Stripe yearly price mapped', Boolean(process.env.STRIPE_BROBOT_YEARLY_PRICE_ID), 'STRIPE_BROBOT_YEARLY_PRICE_ID checked', 'Set yearly BroBot price ID.'));
  checks.push(check(
    'Apple configured',
    Boolean(process.env.APPLE_ISSUER_ID && process.env.APPLE_KEY_ID && process.env.APPLE_PRIVATE_KEY && process.env.APPLE_BUNDLE_ID),
    'APPLE_ISSUER_ID, APPLE_KEY_ID, APPLE_PRIVATE_KEY, APPLE_BUNDLE_ID checked',
    'Set all App Store Server API variables.'
  ));
  checks.push(check(
    'Apple product IDs mapped',
    true,
    'Allowed Apple products are code-mapped: com.snaportho.brobot.unlimited.monthly, com.snaportho.brobot.unlimited.yearly'
  ));
  checks.push(check(
    'Supabase service role configured',
    Boolean(supabaseUrl && serviceRoleKey),
    'NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY checked',
    'Set Supabase URL and service role key for DB audits.'
  ));
  checks.push(check(
    'Environment consistency',
    process.env.NODE_ENV !== 'production' || stripeEnv === 'live',
    `NODE_ENV=${process.env.NODE_ENV ?? 'unset'}, stripe=${stripeEnv}`,
    'Production should use a live Stripe secret.'
  ));

  if (supabaseUrl && serviceRoleKey) {
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data, error } = await supabase
      .from('subscriptions')
      .select(`
        id, user_id, provider, environment, plan_code, status, current_period_end,
        provider_subscription_id, provider_original_transaction_id, provider_transaction_id,
        stripe_customer_id, stripe_subscription_id, updated_at
      `)
      .eq('plan_code', 'unlimited_brobot')
      .order('updated_at', { ascending: false })
      .limit(2000);

    if (error) {
      checks.push(check('Database subscription audit', false, error.message, 'Verify service-role access and subscriptions schema.'));
    } else {
      const rows = (data ?? []) as SubscriptionRow[];
      const issues = detectSubscriptionIssues(rows);
      checks.push(check('Database subscription audit', issues.length === 0, `${rows.length} rows scanned, ${issues.length} issue(s)${issues.length ? `: ${issues.slice(0, 10).join('; ')}` : ''}`, 'Run npm run subscriptions:audit for affected users.'));
      checks.push(check('Resolver consistency', !issues.some((issue) => issue.startsWith('conflicting_active_subscriptions')), 'No user should have multiple currently entitling rows.', 'Inspect conflicting rows and expire/cancel stale provider records.'));
    }
  }

  const failed = checks.filter((item) => !item.ok);
  for (const item of checks) {
    const mark = item.ok ? '✓' : '✗';
    console.log(`${mark} ${item.name}: ${item.detail}`);
    if (!item.ok && item.action) console.log(`  action: ${item.action}`);
  }

  if (failed.length > 0) {
    console.error(`\nsubscriptions health failed: ${failed.length} check(s) need attention`);
    process.exit(1);
  }

  console.log('\nsubscriptions health passed');
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
