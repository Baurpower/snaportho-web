import assert from 'node:assert/strict';

import { parseMeEntitlementsPayload } from './billing-entitlement-state';
import {
  buildCheckoutSuccessReturnPath,
  CHECKOUT_SUCCESS_ROUTES,
  getCheckoutSuccessCtas,
  getCheckoutSuccessHeadline,
  getCheckoutSuccessStatusBadge,
  getCheckoutSuccessSubtext,
  resolveCheckoutSuccessPhase,
  shouldShowCheckoutBenefitCards,
  shouldShowCheckoutFreeQuota,
} from './checkout-success-state';

assert.equal(
  resolveCheckoutSuccessPhase({
    isAuthenticated: true,
    isUnlimited: false,
    pollTimedOut: false,
  }),
  'activating'
);

assert.equal(
  resolveCheckoutSuccessPhase({
    isAuthenticated: true,
    isUnlimited: true,
    pollTimedOut: false,
  }),
  'active'
);

assert.equal(
  resolveCheckoutSuccessPhase({
    isAuthenticated: true,
    isUnlimited: false,
    pollTimedOut: true,
  }),
  'delayed'
);

assert.equal(
  resolveCheckoutSuccessPhase({
    isAuthenticated: false,
    isUnlimited: false,
    pollTimedOut: false,
  }),
  'guest'
);

assert.match(getCheckoutSuccessHeadline('activating'), /Activating BroBot Unlimited/);
assert.match(getCheckoutSuccessHeadline('active'), /You're in/);
assert.match(getCheckoutSuccessSubtext('delayed'), /will not be charged twice/i);

assert.equal(getCheckoutSuccessStatusBadge('active', 'trialing'), 'trial');
assert.equal(getCheckoutSuccessStatusBadge('active', 'active'), 'active');
assert.equal(getCheckoutSuccessStatusBadge('delayed', null), 'delayed');
assert.equal(getCheckoutSuccessStatusBadge('activating', null), 'processing');

assert.equal(shouldShowCheckoutBenefitCards('active'), true);
assert.equal(shouldShowCheckoutBenefitCards('activating'), false);
assert.equal(shouldShowCheckoutFreeQuota('activating'), false);
assert.equal(shouldShowCheckoutFreeQuota('delayed'), false);

const unlimitedPayload = {
  access: 'unlimited' as const,
  status: 'trialing',
  data: null,
};
assert.equal(parseMeEntitlementsPayload(unlimitedPayload).isUnlimited, true);

assert.equal(
  buildCheckoutSuccessReturnPath('cs_test_123'),
  '/checkout/success?session_id=cs_test_123'
);

const activeCtas = getCheckoutSuccessCtas({ phase: 'active', isUnlimited: true });
assert.equal(activeCtas.length, 3);
assert.equal(activeCtas[0]?.label, 'Start chatting with BroBot');
assert.equal(activeCtas[0]?.href, CHECKOUT_SUCCESS_ROUTES.startChat);
assert.equal(activeCtas[1]?.href, CHECKOUT_SUCCESS_ROUTES.studentWorkspace);
assert.equal(activeCtas[2]?.href, CHECKOUT_SUCCESS_ROUTES.manageBilling);

const delayedCtas = getCheckoutSuccessCtas({ phase: 'delayed', isUnlimited: false });
assert.equal(delayedCtas.length, 2);
assert.equal(delayedCtas[0]?.action, 'restore');
assert.equal(delayedCtas[0]?.label, 'Restore Subscription');
assert.ok(!delayedCtas.some((cta) => cta.label.includes('Free')));

const delayedWithAccess = getCheckoutSuccessCtas({ phase: 'delayed', isUnlimited: true });
assert.equal(delayedWithAccess.length, 3);
assert.equal(
  delayedWithAccess.find((cta) => cta.href === CHECKOUT_SUCCESS_ROUTES.startChat)?.kind,
  'secondary'
);

console.log('checkout-success-state tests passed');