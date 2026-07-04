import assert from 'node:assert/strict';

import { GET } from './route';

process.env.MOBILE_SUB_APPLE_BUTTON_TITLE = 'Route Apple CTA';
process.env.MOBILE_SUB_STRIPE_SUBTITLE = 'Route Stripe subtitle';
process.env.STRIPE_SECRET_KEY = 'sk_test_route_should_not_leak';

const response = await GET(
  new Request('https://snap-ortho.com/api/mobile/config?platform=ios&appVersion=1.0')
);
const payload = await response.json();

assert.equal(response.status, 200);
assert.equal(payload.brobotSubscription.planName, 'BroBot Unlimited');
assert.equal(payload.brobotSubscription.apple.buttonTitle, 'Route Apple CTA');
assert.equal(payload.brobotSubscription.stripe.subtitle, 'Route Stripe subtitle');
assert.equal(payload.brobotSubscription.restore.buttonTitle, 'Restore Purchases');
assert.equal(payload.brobotSubscription.legal.termsTitle, 'Terms of Use');
assert.equal(JSON.stringify(payload).includes('sk_test_route_should_not_leak'), false);

console.log('mobile config route subscription tests passed');
