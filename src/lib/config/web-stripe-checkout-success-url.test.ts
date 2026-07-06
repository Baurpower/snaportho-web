import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';

import { getCheckoutSuccessUrl } from './app-url';

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), 'utf8');
}

const checkoutSuccess = getCheckoutSuccessUrl();
assert.ok(checkoutSuccess.includes('/checkout/success'));
assert.ok(checkoutSuccess.includes('session_id=%7BCHECKOUT_SESSION_ID%7D'));

const brobotConfig = readSource('src/lib/config/brobot.ts');
assert.ok(brobotConfig.includes("PAID_PLAN_CODE: 'unlimited_brobot'"));
assert.ok(brobotConfig.includes('BILLING_SUCCESS_URL: getBillingSuccessUrl()'));

const billingCheckoutRoute = readSource('src/app/api/billing/checkout/route.ts');
assert.ok(billingCheckoutRoute.includes('getCheckoutSuccessUrl'));
assert.ok(!billingCheckoutRoute.includes('brobot/chat?success'));
assert.ok(!billingCheckoutRoute.includes('account/billing?success'));

const guestCheckoutRoute = readSource('src/app/api/billing/checkout/guest/route.ts');
assert.ok(guestCheckoutRoute.includes('createGuestBroBotCheckoutSession'));

const stripeLib = readSource('src/lib/stripe.ts');
assert.ok(stripeLib.includes('success_url: getCheckoutSuccessUrl()'));
assert.ok(stripeLib.includes('customSuccessUrl || BROBOT_CONFIG.BILLING_SUCCESS_URL'));
assert.ok(!stripeLib.includes('brobot/chat?success'));
assert.ok(!stripeLib.includes('/welcome?checkout_session_id'));

const checkoutClient = readSource('src/lib/brobot/checkout-client.ts');
assert.ok(checkoutClient.includes("'/api/billing/checkout'"));
assert.ok(checkoutClient.includes("'/api/billing/checkout/guest'"));

const mobileRoute = readSource('src/app/api/mobile/stripe/create-checkout-session/route.ts');
assert.ok(mobileRoute.includes("const MOBILE_SUCCESS_URL = 'snaportho://subscription/success'"));
assert.ok(!mobileRoute.includes('getCheckoutSuccessUrl'));
assert.ok(!mobileRoute.includes('/checkout/success'));

console.log('web-stripe-checkout-success-url audit tests passed');