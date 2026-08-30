import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';

// @ts-expect-error Node's type-stripping runner requires the runtime extension.
import { getCheckoutSuccessUrl } from './app-url.ts';

const root = process.cwd();

function readSource(relativePath: string) {
  const path = join(root, relativePath);
  return readFileSync(existsSync(path) ? path : `${path}.ts`, 'utf8');
}

const checkoutSuccess = getCheckoutSuccessUrl();
assert.ok(checkoutSuccess.includes('/checkout/success'));
assert.ok(checkoutSuccess.includes('session_id=%7BCHECKOUT_SESSION_ID%7D'));

const brobotConfig = readSource('src/lib/config/brobot');
assert.ok(brobotConfig.includes("PAID_PLAN_CODE: 'unlimited_brobot'"));
assert.ok(brobotConfig.includes('BILLING_SUCCESS_URL: getBillingSuccessUrl()'));

const billingCheckoutRoute = readSource('src/app/api/billing/checkout/route');
assert.ok(billingCheckoutRoute.includes('getCheckoutSuccessUrl'));
assert.ok(!billingCheckoutRoute.includes('brobot/chat?success'));
assert.ok(!billingCheckoutRoute.includes('account/billing?success'));

const guestCheckoutRoute = readSource('src/app/api/billing/checkout/guest/route');
assert.ok(guestCheckoutRoute.includes('createGuestBroBotCheckoutSession'));

const stripeLib = readSource('src/lib/stripe');
assert.ok(stripeLib.includes('success_url: successUrl'));
assert.ok(stripeLib.includes('options.customSuccessUrl ?? getCheckoutSuccessUrl()'));
assert.ok(!stripeLib.includes('brobot/chat?success'));
assert.ok(!stripeLib.includes('/welcome?checkout_session_id'));

const checkoutClient = readSource('src/lib/brobot/checkout-client');
assert.ok(checkoutClient.includes("'/api/billing/checkout'"));
assert.ok(checkoutClient.includes("'/api/billing/checkout/guest'"));

const mobileRoute = readSource('src/app/api/mobile/stripe/create-checkout-session/route');
assert.ok(mobileRoute.includes("const MOBILE_SUCCESS_URL = 'snaportho://subscription/success'"));
assert.ok(!mobileRoute.includes('getCheckoutSuccessUrl'));
assert.ok(!mobileRoute.includes('/checkout/success'));

const mobileGuestRoute = readSource('src/app/api/mobile/stripe/create-guest-checkout-session/route');
assert.ok(mobileGuestRoute.includes('createGuestBroBotCheckoutSession'));
assert.ok(mobileGuestRoute.includes('checkout_session_id={CHECKOUT_SESSION_ID}'));

const mobileClaimRoute = readSource('src/app/api/mobile/stripe/claim-pending-subscription/route');
assert.ok(mobileClaimRoute.includes('getMobileBearerUser'));
assert.ok(mobileClaimRoute.includes('checkoutSessionId: checkoutSessionId || null'));
assert.ok(mobileClaimRoute.includes('claimPendingBroBotSubscriptionForUser(user.id, user.email'));

console.log('web-stripe-checkout-success-url audit tests passed');
