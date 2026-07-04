import assert from 'node:assert/strict';

import { getMobileSubscriptionDisplayConfig } from './mobile-subscription';

const defaults = getMobileSubscriptionDisplayConfig({});

assert.equal(defaults.planName, 'BroBot Unlimited');
assert.equal(defaults.apple.enabled, true);
assert.equal(defaults.apple.buttonTitle, 'Start free trial with Apple');
assert.equal(defaults.apple.priceText, '$3.99/month');
assert.equal(defaults.stripe.buttonTitle, 'Start free trial with Stripe');
assert.equal(defaults.legal.privacyTitle, 'Privacy Policy');
assert.equal(defaults.fallbackUpdatedAt, '2026-07-04T00:00:00Z');

const overridden = getMobileSubscriptionDisplayConfig({
  MOBILE_SUB_PLAN_NAME: 'Backend Plan',
  MOBILE_SUB_APPLE_BUTTON_TITLE: 'Backend Apple CTA',
  MOBILE_SUB_APPLE_SUBTITLE: 'Backend Apple subtitle',
  MOBILE_SUB_STRIPE_BUTTON_TITLE: 'Backend Stripe CTA',
  MOBILE_SUB_STRIPE_ENABLED: 'false',
  MOBILE_SUB_PRIVACY_TITLE: 'Backend Privacy',
  STRIPE_SECRET_KEY: 'sk_test_should_not_leak',
  APPLE_SHARED_SECRET: 'apple_secret_should_not_leak',
});

assert.equal(overridden.planName, 'Backend Plan');
assert.equal(overridden.apple.buttonTitle, 'Backend Apple CTA');
assert.equal(overridden.apple.subtitle, 'Backend Apple subtitle');
assert.equal(overridden.stripe.buttonTitle, 'Backend Stripe CTA');
assert.equal(overridden.stripe.enabled, false);
assert.equal(overridden.legal.privacyTitle, 'Backend Privacy');

const serialized = JSON.stringify(overridden);
assert.equal(serialized.includes('sk_test_should_not_leak'), false);
assert.equal(serialized.includes('apple_secret_should_not_leak'), false);
assert.equal(serialized.includes('SECRET'), false);

console.log('mobile subscription config tests passed');
