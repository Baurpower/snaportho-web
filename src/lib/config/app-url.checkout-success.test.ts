import assert from 'node:assert/strict';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';

import { getBillingSuccessUrl, getCheckoutSuccessUrl } from './app-url';

const checkoutSuccess = getCheckoutSuccessUrl();
assert.match(checkoutSuccess, /^https:\/\/snap-ortho\.com\/checkout\/success\?/);
assert.ok(checkoutSuccess.includes('session_id=%7BCHECKOUT_SESSION_ID%7D'));

const withReturn = getCheckoutSuccessUrl({ returnTo: '/brobot/chat' });
assert.ok(withReturn.includes('return_to=%2Fbrobot%2Fchat'));

assert.equal(getBillingSuccessUrl(), checkoutSuccess);

console.log('app-url checkout success tests passed');