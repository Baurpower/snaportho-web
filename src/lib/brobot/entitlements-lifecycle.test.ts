/**
 * Unit tests for mobile entitlement lifecycle field computation.
 *
 * These tests exercise the pure logic that derives isCanceled, renewsAt,
 * accessEndsAt, canManageStripe, and canResubscribe from raw subscription row
 * state. They run without network access or DB — the logic is extracted into
 * `classifySubscriptionLifecycle` below, which mirrors getMobileBroBotEntitlement.
 *
 * Run with: npx tsx src/lib/brobot/entitlements-lifecycle.test.ts
 */

// ─── Pure classifier (mirrors getMobileBroBotEntitlement logic) ───────────────

interface SubRow {
  status: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  provider: 'stripe' | 'apple' | string | null;
}

interface LifecycleResult {
  isCanceled: boolean;
  renewsAt: string | null;
  accessEndsAt: string | null;
  canManageStripe: boolean;
  canResubscribe: boolean;
}

function classifySubscriptionLifecycle(
  sub: SubRow,
  mobileSource: 'stripe' | 'apple' | 'free_quota' | 'override' | 'disabled',
  nowIso: string
): LifecycleResult {
  const subscriptionStatus = sub.status;
  const currentPeriodEnd = sub.currentPeriodEnd;
  const cancelAtPeriodEnd = sub.cancelAtPeriodEnd;

  const isCanceled = subscriptionStatus === 'canceled';
  const isScheduledToCancel = !isCanceled && cancelAtPeriodEnd;

  const nowTs = new Date(nowIso).getTime();
  const periodEndTs = currentPeriodEnd ? new Date(currentPeriodEnd).getTime() : null;
  const periodEndIsFuture = periodEndTs != null && periodEndTs > nowTs;

  const isStripeOrApple = mobileSource === 'stripe' || mobileSource === 'apple';
  const isRenewing =
    isStripeOrApple &&
    !isCanceled &&
    !isScheduledToCancel &&
    (subscriptionStatus === 'active' || subscriptionStatus === 'trialing');
  const renewsAt = isRenewing && currentPeriodEnd ? currentPeriodEnd : null;

  const accessEndsAt =
    (isCanceled || isScheduledToCancel) && periodEndIsFuture && currentPeriodEnd
      ? currentPeriodEnd
      : null;

  const hasStripeLinkage =
    mobileSource === 'stripe' &&
    sub.stripeCustomerId != null &&
    sub.stripeSubscriptionId != null;
  const canManageStripe =
    hasStripeLinkage &&
    !isCanceled &&
    (subscriptionStatus === 'active' ||
      subscriptionStatus === 'trialing' ||
      subscriptionStatus === 'past_due');

  const canResubscribe = mobileSource === 'stripe' && isCanceled;

  return { isCanceled, renewsAt, accessEndsAt, canManageStripe, canResubscribe };
}

// ─── Test runner ──────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assertEqual<T>(label: string, actual: T, expected: T) {
  const ok =
    typeof expected === 'object'
      ? JSON.stringify(actual) === JSON.stringify(expected)
      : actual === expected;
  if (ok) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     expected: ${JSON.stringify(expected)}`);
    console.error(`     received: ${JSON.stringify(actual)}`);
    failed++;
  }
}

const NOW = '2026-06-06T12:00:00.000Z';
const FUTURE = '2026-06-27T19:38:10.000Z'; // 21 days from NOW
const PAST = '2026-05-01T00:00:00.000Z';   // ~36 days before NOW

const STRIPE_IDS = {
  stripeCustomerId: 'cus_test123',
  stripeSubscriptionId: 'sub_test456',
};

// ─── Case 1: Stripe active, renewing (cancel_at_period_end=false) ─────────────
console.log('\nCase 1: Stripe active, renewing');
{
  const result = classifySubscriptionLifecycle(
    { status: 'active', currentPeriodEnd: FUTURE, cancelAtPeriodEnd: false, provider: 'stripe', ...STRIPE_IDS },
    'stripe',
    NOW
  );
  assertEqual('isCanceled', result.isCanceled, false);
  assertEqual('renewsAt set to currentPeriodEnd', result.renewsAt, FUTURE);
  assertEqual('accessEndsAt null', result.accessEndsAt, null);
  assertEqual('canManageStripe true', result.canManageStripe, true);
  assertEqual('canResubscribe false', result.canResubscribe, false);
}

// ─── Case 2: Stripe active, cancel_at_period_end=true (will end, not yet canceled) ──
console.log('\nCase 2: Stripe active, cancel_at_period_end=true');
{
  const result = classifySubscriptionLifecycle(
    { status: 'active', currentPeriodEnd: FUTURE, cancelAtPeriodEnd: true, provider: 'stripe', ...STRIPE_IDS },
    'stripe',
    NOW
  );
  assertEqual('isCanceled', result.isCanceled, false);
  assertEqual('renewsAt null (scheduled to cancel)', result.renewsAt, null);
  assertEqual('accessEndsAt set', result.accessEndsAt, FUTURE);
  assertEqual('canManageStripe true (still active)', result.canManageStripe, true);
  assertEqual('canResubscribe false (not yet canceled)', result.canResubscribe, false);
}

// ─── Case 3: THE BUG SCENARIO — status=canceled, future currentPeriodEnd, cancel_at_period_end=false ──
console.log('\nCase 3: status=canceled, future period end, cancel_at_period_end=false (bug scenario)');
{
  const result = classifySubscriptionLifecycle(
    { status: 'canceled', currentPeriodEnd: FUTURE, cancelAtPeriodEnd: false, provider: 'stripe', ...STRIPE_IDS },
    'stripe',
    NOW
  );
  assertEqual('isCanceled true', result.isCanceled, true);
  assertEqual('renewsAt null (canceled must not renew)', result.renewsAt, null);
  assertEqual('accessEndsAt set to future end', result.accessEndsAt, FUTURE);
  assertEqual('canManageStripe false (portal unreliable for canceled)', result.canManageStripe, false);
  assertEqual('canResubscribe true', result.canResubscribe, true);
}

// ─── Case 4: Stripe canceled, past currentPeriodEnd (fully expired) ──────────
console.log('\nCase 4: status=canceled, past period end (fully expired)');
{
  const result = classifySubscriptionLifecycle(
    { status: 'canceled', currentPeriodEnd: PAST, cancelAtPeriodEnd: false, provider: 'stripe', ...STRIPE_IDS },
    'stripe',
    NOW
  );
  assertEqual('isCanceled true', result.isCanceled, true);
  assertEqual('renewsAt null', result.renewsAt, null);
  assertEqual('accessEndsAt null (already expired)', result.accessEndsAt, null);
  assertEqual('canManageStripe false', result.canManageStripe, false);
  assertEqual('canResubscribe true (offer resubscribe)', result.canResubscribe, true);
}

// ─── Case 5: Stripe past_due ──────────────────────────────────────────────────
console.log('\nCase 5: Stripe past_due');
{
  const result = classifySubscriptionLifecycle(
    { status: 'past_due', currentPeriodEnd: FUTURE, cancelAtPeriodEnd: false, provider: 'stripe', ...STRIPE_IDS },
    'stripe',
    NOW
  );
  assertEqual('isCanceled false', result.isCanceled, false);
  assertEqual('renewsAt null (past_due is not renewing)', result.renewsAt, null);
  assertEqual('accessEndsAt null (not canceled/ending)', result.accessEndsAt, null);
  assertEqual('canManageStripe true (portal useful for past_due)', result.canManageStripe, true);
  assertEqual('canResubscribe false', result.canResubscribe, false);
}

// ─── Case 6: Apple active, future period end ──────────────────────────────────
console.log('\nCase 6: Apple active, future period end');
{
  const result = classifySubscriptionLifecycle(
    { status: 'active', currentPeriodEnd: FUTURE, cancelAtPeriodEnd: false, provider: 'apple', stripeCustomerId: null, stripeSubscriptionId: null },
    'apple',
    NOW
  );
  assertEqual('isCanceled false', result.isCanceled, false);
  assertEqual('renewsAt set', result.renewsAt, FUTURE);
  assertEqual('accessEndsAt null', result.accessEndsAt, null);
  // Apple has no Stripe IDs — canManageStripe must be false regardless
  assertEqual('canManageStripe false (Apple sub)', result.canManageStripe, false);
  assertEqual('canResubscribe false (Apple sub)', result.canResubscribe, false);
}

// ─── Case 7: Free user (no subscription) ─────────────────────────────────────
console.log('\nCase 7: Free user');
{
  const result = classifySubscriptionLifecycle(
    { status: null, currentPeriodEnd: null, cancelAtPeriodEnd: false, provider: null, stripeCustomerId: null, stripeSubscriptionId: null },
    'free_quota',
    NOW
  );
  assertEqual('isCanceled false', result.isCanceled, false);
  assertEqual('renewsAt null', result.renewsAt, null);
  assertEqual('accessEndsAt null', result.accessEndsAt, null);
  assertEqual('canManageStripe false', result.canManageStripe, false);
  assertEqual('canResubscribe false', result.canResubscribe, false);
}

// ─── Case 8: Trialing (active, never billed yet) ──────────────────────────────
console.log('\nCase 8: Stripe trialing');
{
  const result = classifySubscriptionLifecycle(
    { status: 'trialing', currentPeriodEnd: FUTURE, cancelAtPeriodEnd: false, provider: 'stripe', ...STRIPE_IDS },
    'stripe',
    NOW
  );
  assertEqual('isCanceled false', result.isCanceled, false);
  assertEqual('renewsAt set', result.renewsAt, FUTURE);
  assertEqual('accessEndsAt null', result.accessEndsAt, null);
  assertEqual('canManageStripe true', result.canManageStripe, true);
  assertEqual('canResubscribe false', result.canResubscribe, false);
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(55)}`);
console.log(`  ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
