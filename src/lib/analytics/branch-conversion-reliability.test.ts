import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  BRANCH_CONVERSION_MAX_ATTEMPTS,
  branchConversionRetryDelayMs,
  buildBranchConversionIdempotencyKey,
  shouldAttemptBranchOutboxDelivery,
} from './branch-conversion-outbox';
import { getClaimableBillingUser } from '../auth/claimable-billing-user';

const userId = '00000000-0000-4000-8000-000000000001';

assert.deepEqual(
  getClaimableBillingUser({
    id: userId,
    email: 'guest@example.com',
    email_confirmed_at: '2026-08-30T12:00:00.000Z',
    is_anonymous: false,
  }),
  { ok: true, user: { id: userId, email: 'guest@example.com' } }
);
assert.equal(
  getClaimableBillingUser({
    id: userId,
    email: 'guest@example.com',
    email_confirmed_at: '2026-08-30T12:00:00.000Z',
    is_anonymous: true,
  }).ok,
  false
);
assert.equal(
  getClaimableBillingUser({
    id: userId,
    email: null,
    email_confirmed_at: '2026-08-30T12:00:00.000Z',
  }).ok,
  false
);
assert.equal(
  getClaimableBillingUser({
    id: userId,
    email: 'guest@example.com',
    email_confirmed_at: null,
  }).ok,
  false
);

assert.equal(
  buildBranchConversionIdempotencyKey({
    provider: 'apple',
    environment: 'production',
    name: 'SUBSCRIBE',
    transactionId: 'orig_1',
  }),
  'apple:production:SUBSCRIBE:orig_1'
);
assert.equal(branchConversionRetryDelayMs(0), 60 * 1000);
assert.equal(branchConversionRetryDelayMs(5), 1440 * 60 * 1000);
assert.equal(branchConversionRetryDelayMs(99), 1440 * 60 * 1000);

const now = new Date('2026-08-30T12:00:00.000Z');
assert.equal(
  shouldAttemptBranchOutboxDelivery(
    { status: 'delivered', attempt_count: 0, last_attempted_at: null },
    now
  ),
  false
);
assert.equal(
  shouldAttemptBranchOutboxDelivery(
    { status: 'pending', attempt_count: 0, last_attempted_at: null },
    now
  ),
  true
);
assert.equal(
  shouldAttemptBranchOutboxDelivery(
    {
      status: 'pending',
      attempt_count: 1,
      last_attempted_at: '2026-08-30T11:59:30.000Z',
    },
    now
  ),
  false
);
assert.equal(
  shouldAttemptBranchOutboxDelivery(
    {
      status: 'pending',
      attempt_count: 1,
      last_attempted_at: '2026-08-30T11:54:00.000Z',
    },
    now
  ),
  true
);
assert.equal(
  shouldAttemptBranchOutboxDelivery(
    {
      status: 'failed',
      attempt_count: BRANCH_CONVERSION_MAX_ATTEMPTS,
      last_attempted_at: null,
    },
    now
  ),
  false
);

const root = process.cwd();
function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const migration = readSource('supabase/migrations/20260830_110000_branch_conversion_outbox.sql');
assert.ok(migration.includes('create table if not exists public.branch_conversion_outbox'));
assert.ok(migration.includes('branch_conversion_outbox_identity_uidx'));
assert.ok(migration.includes('enable row level security'));
assert.ok(migration.includes('revoke all on table public.branch_conversion_outbox from anon, authenticated'));

const stripeLib = readSource('src/lib/stripe.ts');
assert.ok(stripeLib.includes('enqueueClaimedStripeBranchConversions'));
assert.ok(stripeLib.includes('enqueueStripeSubscriptionConversions'));
const claimStart = stripeLib.indexOf('export async function claimPendingBroBotSubscriptionForUser');
const claimEnd = stripeLib.indexOf('export async function createBillingPortalSession');
const claimFn = stripeLib.slice(claimStart, claimEnd);
assert.ok(claimFn.includes("status: 'claimed'"));
assert.ok(
  claimFn.lastIndexOf('enqueueClaimedStripeBranchConversions') >
    claimFn.indexOf('upsertCanonicalSubscription')
);

const webhook = readSource('src/app/api/stripe/webhook/route.ts');
assert.ok(webhook.includes('enqueueStripeSubscriptionConversions'));
assert.ok(!webhook.includes('sendBranchServerEvent'));

const appleSync = readSource('src/app/api/mobile/apple/subscription/sync/route.ts');
assert.ok(appleSync.includes('enqueueAppleSubscriptionConversions'));
assert.ok(appleSync.includes('appleAccountTokensMatch'));
assert.ok(!appleSync.includes('sendBranchServerEvent'));

const appleNotifications = readSource('src/app/api/apple/notifications/handler.ts');
assert.ok(appleNotifications.includes('enqueueAppleSubscriptionConversions'));
assert.ok(!appleNotifications.includes('sendBranchServerEvent'));

const mobileClaim = readSource('src/app/api/mobile/stripe/claim-pending-subscription/route.ts');
assert.ok(mobileClaim.includes('getClaimableBillingUser'));
assert.ok(mobileClaim.includes('email_unconfirmed') || mobileClaim.includes('claimable.reason'));

const webClaim = readSource('src/app/api/billing/claim-pending-subscription/route.ts');
assert.ok(webClaim.includes('getClaimableBillingUser'));

const vercel = readSource('vercel.json');
assert.ok(vercel.includes('/api/cron/branch-conversions'));
assert.ok(vercel.includes('15 4 * * *'));

const storeKit = readSource('../Xcode/Snap-Ortho/Snap Ortho/Entitlements/BroBotStoreKitManager.swift');
const listenerStart = storeKit.indexOf('private func handleTransactionUpdate');
assert.ok(listenerStart >= 0);
const listenerGuard = storeKit.slice(
  listenerStart,
  storeKit.indexOf('print("[IOS-IAP-TRANSACTION-VERIFIED] context=listener', listenerStart)
);
assert.ok(listenerGuard.includes('reason=unrelated_product'));
assert.ok(!listenerGuard.includes('await transaction.finish()'));
const listenerFn = storeKit.slice(
  listenerStart,
  storeKit.indexOf('private func shouldIgnoreHistoricalTransactionAlreadyCoveredByBackend', listenerStart)
);
assert.ok(!listenerFn.includes('await refreshCurrentEntitlements()'));
assert.ok(listenerFn.includes('purchasedProductIDs.insert'));

const appEntry = readSource('../Xcode/Snap-Ortho/Snap Ortho/Snap_OrthoApp.swift');
assert.ok(appEntry.includes('path == "/portal-return"'));
assert.ok(appEntry.includes('return "portal-return"'));
assert.ok(appEntry.includes('outcome == "success" || outcome == "portal-return"'));

console.log('branch conversion reliability tests passed');
