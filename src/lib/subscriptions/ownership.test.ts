import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  evaluatePendingSubscriptionClaimGate,
  isSubscriptionOwnerConflict,
  SubscriptionOwnerConflictError,
} from './ownership';

const userA = '00000000-0000-4000-8000-000000000001';
const userB = '00000000-0000-4000-8000-000000000002';

assert.deepEqual(
  evaluatePendingSubscriptionClaimGate({
    userId: userA,
    pending: {
      id: 'pending_1',
      claimed_at: '2026-08-30T12:00:00.000Z',
      claimed_by_user_id: userA,
      stripe_subscription_id: 'sub_1',
    },
  }),
  {
    action: 'reject',
    result: {
      status: 'already_claimed_by_user',
      subscriptionId: 'sub_1',
      pendingId: 'pending_1',
    },
  }
);

assert.deepEqual(
  evaluatePendingSubscriptionClaimGate({
    userId: userA,
    pending: {
      id: 'pending_1',
      claimed_at: '2026-08-30T12:00:00.000Z',
      claimed_by_user_id: userB,
      stripe_subscription_id: 'sub_1',
    },
  }),
  {
    action: 'reject',
    result: { status: 'not_claimable', reason: 'already_claimed' },
  }
);

assert.deepEqual(
  evaluatePendingSubscriptionClaimGate({
    userId: userA,
    pending: {
      id: 'pending_1',
      claimed_at: null,
      claimed_by_user_id: userB,
      stripe_subscription_id: 'sub_1',
    },
  }),
  {
    action: 'reject',
    result: { status: 'not_claimable', reason: 'reserved_by_another_account' },
  }
);

assert.deepEqual(
  evaluatePendingSubscriptionClaimGate({
    userId: userA,
    pending: {
      id: 'pending_1',
      claimed_at: null,
      claimed_by_user_id: userA,
      stripe_subscription_id: 'sub_1',
    },
  }),
  { action: 'resume' }
);

assert.deepEqual(
  evaluatePendingSubscriptionClaimGate({
    userId: userA,
    pending: {
      id: 'pending_1',
      claimed_at: null,
      claimed_by_user_id: null,
      stripe_subscription_id: 'sub_1',
    },
  }),
  { action: 'reserve' }
);

assert.equal(
  isSubscriptionOwnerConflict({
    code: 'P0001',
    message: 'subscription_owner_conflict',
    details: 'A provider subscription cannot be reassigned to another user.',
  }),
  true
);
assert.equal(isSubscriptionOwnerConflict({ code: '23505', message: 'duplicate key' }), false);
assert.ok(new SubscriptionOwnerConflictError() instanceof Error);

const root = process.cwd();
const migration = readFileSync(
  join(root, 'supabase/migrations/20260830_100000_subscription_ownership_hardening.sql'),
  'utf8'
);
const stripeLib = readFileSync(join(root, 'src/lib/stripe.ts'), 'utf8');
const ledger = readFileSync(join(root, 'src/lib/subscriptions/ledger.ts'), 'utf8');
const apple = readFileSync(join(root, 'src/lib/apple/app-store-server.ts'), 'utf8');
const appleSync = readFileSync(
  join(root, 'src/app/api/mobile/apple/subscription/sync/route.ts'),
  'utf8'
);

assert.ok(migration.includes('alter table public.subscriptions enable row level security'));
assert.ok(migration.includes('alter table public.subscription_events enable row level security'));
assert.ok(migration.includes('alter table public.entitlement_overrides enable row level security'));
assert.ok(migration.includes('force row level security'));
assert.ok(migration.includes('revoke all on table public.subscriptions from anon, authenticated'));
assert.ok(migration.includes('guard_subscription_owner_immutable'));
assert.ok(migration.includes('upsert_subscription_preserving_owner'));
assert.ok(migration.includes('where public.subscriptions.user_id = excluded.user_id'));

const claimStart = stripeLib.indexOf('export async function claimPendingBroBotSubscriptionForUser');
const claimEnd = stripeLib.indexOf('export async function createBillingPortalSession');
assert.ok(claimStart >= 0 && claimEnd > claimStart);
const claimFn = stripeLib.slice(claimStart, claimEnd);

const gateIdx = claimFn.indexOf('evaluatePendingSubscriptionClaimGate');
const claimableIdx = claimFn.indexOf('hasClaimableStripeStatus');
const reserveIdx = claimFn.indexOf(".is('claimed_by_user_id', null)");
const stripeUpdateIdx = claimFn.indexOf('stripe.subscriptions.update');
const upsertIdx = claimFn.indexOf('upsertCanonicalSubscription');
const finalizeOwnerIdx = claimFn.indexOf(".eq('claimed_by_user_id', userId)");

assert.ok(gateIdx >= 0 && claimableIdx > gateIdx);
assert.ok(reserveIdx > claimableIdx);
assert.ok(stripeUpdateIdx > reserveIdx);
assert.ok(upsertIdx > stripeUpdateIdx);
assert.ok(finalizeOwnerIdx > upsertIdx);

assert.ok(ledger.includes("rpc('upsert_subscription_preserving_owner'"));
assert.ok(ledger.includes('SubscriptionOwnerConflictError'));
assert.ok(apple.includes('SubscriptionOwnerConflictError'));
assert.ok(apple.includes('Apple subscription is already linked to another account'));
assert.ok(appleSync.includes("'apple_subscription_owner_conflict'"));
assert.ok(appleSync.includes('ownerConflict ? 409'));
assert.ok(appleSync.includes("'apple_unowned_transaction_requires_support'"));
assert.ok(!appleSync.includes("body.claimAfterAuthentication !== true"));

console.log('subscription ownership hardening tests passed');
