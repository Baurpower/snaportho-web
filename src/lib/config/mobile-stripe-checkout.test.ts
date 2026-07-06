import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';

import { getCheckoutSuccessUrl } from './app-url';

const mobileRoutePath = join(
  process.cwd(),
  'src/app/api/mobile/stripe/create-checkout-session/route.ts'
);
const mobileRouteSource = readFileSync(mobileRoutePath, 'utf8');

assert.ok(mobileRouteSource.includes("const MOBILE_SUCCESS_URL = 'snaportho://subscription/success'"));
assert.ok(mobileRouteSource.includes('MOBILE_SUCCESS_URL'));
assert.ok(!mobileRouteSource.includes('getCheckoutSuccessUrl'));
assert.ok(!mobileRouteSource.includes('/checkout/success'));

const webSuccess = getCheckoutSuccessUrl();
assert.ok(webSuccess.includes('/checkout/success'));
assert.ok(webSuccess.includes('session_id'));
assert.ok(!webSuccess.startsWith('snaportho://'));

console.log('mobile-stripe-checkout redirect tests passed');