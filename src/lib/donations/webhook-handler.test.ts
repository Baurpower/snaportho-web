/**
 * Donation webhook handler scenarios (self-contained — no Next/Supabase imports).
 *
 * Run: npm run donations:test
 */

import assert from 'node:assert/strict';
import type Stripe from 'stripe';

type DonationWebhookResult =
  | { status: 200; body: { received: true; duplicate?: true; inserted?: true } }
  | { status: 400; body: { error: string } };

async function handleDonationStripeWebhook(
  params: { body: string; signature: string | null; secret: string },
  deps: {
    constructEvent: (body: string, signature: string, secret: string) => Stripe.Event;
    getExistingDonationByStripeEventId: (id: string) => Promise<{ id: string } | null>;
    getExistingDonationByPaymentIntentId: (id: string) => Promise<{ id: string } | null>;
    insertDonation: (params: Record<string, unknown>) => Promise<void>;
  }
): Promise<DonationWebhookResult> {
  if (!params.signature) {
    return { status: 400, body: { error: 'Missing signature' } };
  }

  let event: Stripe.Event;
  try {
    event = deps.constructEvent(params.body, params.signature, params.secret);
  } catch {
    return { status: 400, body: { error: 'Invalid signature' } };
  }

  if (event.type !== 'payment_intent.succeeded') {
    return { status: 200, body: { received: true } };
  }

  const existingByEvent = await deps.getExistingDonationByStripeEventId(event.id);
  if (existingByEvent) {
    return { status: 200, body: { received: true, duplicate: true } };
  }

  const paymentIntent = event.data.object as Stripe.PaymentIntent;
  const existingByIntent = await deps.getExistingDonationByPaymentIntentId(paymentIntent.id);
  if (existingByIntent) {
    return { status: 200, body: { received: true, duplicate: true } };
  }

  await deps.insertDonation({
    stripePaymentIntentId: paymentIntent.id,
    stripeEventId: event.id,
    amountCents: paymentIntent.amount,
  });

  return { status: 200, body: { received: true, inserted: true } };
}

const sampleEvent = {
  id: 'evt_donation_1',
  type: 'payment_intent.succeeded',
  data: {
    object: {
      id: 'pi_donation_1',
      amount: 500,
      status: 'succeeded',
    },
  },
} as Stripe.Event;

let inserted = 0;

const duplicate = await handleDonationStripeWebhook(
  { body: '{}', signature: 'sig', secret: 'whsec_test' },
  {
    constructEvent: () => sampleEvent,
    async getExistingDonationByStripeEventId() {
      return { id: 'existing' };
    },
    async getExistingDonationByPaymentIntentId() {
      return null;
    },
    async insertDonation() {
      inserted += 1;
    },
  }
);

assert.equal(duplicate.status, 200);
assert.equal(duplicate.body.duplicate, true);
assert.equal(inserted, 0);

const invalidSignature = await handleDonationStripeWebhook(
  { body: '{}', signature: 'sig', secret: 'whsec_test' },
  {
    constructEvent() {
      throw new Error('bad signature');
    },
    async getExistingDonationByStripeEventId() {
      return null;
    },
    async getExistingDonationByPaymentIntentId() {
      return null;
    },
    async insertDonation() {
      inserted += 1;
    },
  }
);

assert.equal(invalidSignature.status, 400);

const success = await handleDonationStripeWebhook(
  { body: '{}', signature: 'sig', secret: 'whsec_test' },
  {
    constructEvent: () => sampleEvent,
    async getExistingDonationByStripeEventId() {
      return null;
    },
    async getExistingDonationByPaymentIntentId() {
      return null;
    },
    async insertDonation(params) {
      inserted += 1;
      assert.equal(params.stripePaymentIntentId, 'pi_donation_1');
      assert.equal(params.stripeEventId, 'evt_donation_1');
      assert.equal(params.amountCents, 500);
    },
  }
);

assert.equal(success.status, 200);
assert.equal(success.body.inserted, true);
assert.equal(inserted, 1);

console.log('donation webhook handler tests passed');