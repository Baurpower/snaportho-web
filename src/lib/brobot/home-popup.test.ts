import assert from 'node:assert/strict';

import {
  BROBOT_HOME_POPUP_CAMPAIGN,
  getBroBotPopupEntitlementTier,
  getBroBotPopupInfoDestination,
  getBroBotPopupPrimaryDestination,
  isBroBotPopupDismissed,
} from './home-popup';
import { APP_ROUTES, loginWithReturnUrl } from '../routes';

assert.equal(getBroBotPopupPrimaryDestination(), '/brobot/chat');
assert.equal(getBroBotPopupInfoDestination(), '/brobot/landing');

assert.equal(
  getBroBotPopupEntitlementTier({
    authState: 'guest',
    isUnlimited: false,
    entitlementLoaded: true,
  }),
  'guest'
);
assert.equal(
  getBroBotPopupEntitlementTier({
    authState: 'authenticated',
    isUnlimited: false,
    entitlementLoaded: true,
  }),
  'free'
);
assert.equal(
  getBroBotPopupEntitlementTier({
    authState: 'authenticated',
    isUnlimited: true,
    entitlementLoaded: true,
  }),
  'unlimited'
);

// Stripe, Apple, trialing, and permanent overrides all resolve centrally to isUnlimited.
for (const source of ['stripe', 'apple', 'trialing', 'permanent_override']) {
  assert.equal(
    getBroBotPopupEntitlementTier({
      authState: 'authenticated',
      isUnlimited: Boolean(source),
      entitlementLoaded: true,
    }),
    'unlimited'
  );
}

// Expired/canceled users remain free users and still enter BroBot.
assert.equal(getBroBotPopupPrimaryDestination(), APP_ROUTES.broBot.workspace);
assert.equal(isBroBotPopupDismissed(BROBOT_HOME_POPUP_CAMPAIGN), true);
assert.equal(isBroBotPopupDismissed('brobot-home-v0'), false);
assert.equal(isBroBotPopupDismissed(null), false);

assert.equal(
  loginWithReturnUrl('/brobot/chat?mode=oite'),
  '/auth/sign-in?redirectTo=%2Fbrobot%2Fchat%3Fmode%3Doite'
);
assert.equal(
  loginWithReturnUrl('https://evil.example/steal'),
  '/auth/sign-in?redirectTo=%2Fbrobot%2Fchat'
);

console.log('home-popup.test.ts: all assertions passed');
