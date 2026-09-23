import assert from 'node:assert/strict';

import { GET } from './route.ts';

process.env.MOBILE_SUB_APPLE_BUTTON_TITLE = 'Route Apple CTA';
process.env.MOBILE_SUB_STRIPE_SUBTITLE = 'Route Stripe subtitle';
process.env.STRIPE_SECRET_KEY = 'sk_test_route_should_not_leak';
process.env.IOS_MIN_SUPPORTED_VERSION = '1.60';
process.env.ANDROID_MIN_SUPPORTED_VERSION = '1.10';
process.env.ANDROID_RECOMMENDED_VERSION = '1.12';
process.env.ANDROID_LATEST_VERSION = '1.12';

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

const androidResponse = await GET(
  new Request('https://snap-ortho.com/api/mobile/config?platform=android&appVersion=1.12')
);
const androidPayload = await androidResponse.json();

assert.equal(androidResponse.status, 200);
assert.equal(androidPayload.minSupportedVersion, '1.10');
assert.equal(androidPayload.recommendedVersion, '1.12');
assert.equal(androidPayload.forceUpdateRequired, false);
assert.equal(androidPayload.softUpdateAvailable, false);
assert.equal(
  androidPayload.appStoreUrl,
  'https://play.google.com/store/apps/details?id=com.snaportho.app'
);

const oldAndroidResponse = await GET(
  new Request('https://snap-ortho.com/api/mobile/config?platform=android&appVersion=1.9')
);
const oldAndroidPayload = await oldAndroidResponse.json();
assert.equal(oldAndroidPayload.forceUpdateRequired, true);

console.log('mobile config route subscription tests passed');
