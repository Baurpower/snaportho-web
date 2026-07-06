import type Stripe from 'stripe';

import {
  getExistingDonationByPaymentIntentId,
  getExistingDonationByStripeEventId,
  insertDonation,
  parseDonationMetadata,
} from './store';

export type DonationWebhookDeps = {
  constructEvent: (body: string, signature: string, secret: string) => Stripe.Event;
  getExistingDonationByStripeEventId: typeof getExistingDonationByStripeEventId;
  getExistingDonationByPaymentIntentId: typeof getExistingDonationByPaymentIntentId;
  insertDonation: typeof insertDonation;
};

export type DonationWebhookResult =
  | { status: 200; body: { received: true; duplicate?: true; inserted?: true } }
  | { status: 400; body: { error: string } }
  | { status: 500; body: { error: string } };

export async function handleDonationStripeWebhook(
  params: {
    body: string;
    signature: string | null;
    secret: string;
  },
  deps: DonationWebhookDeps
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
  if (paymentIntent.status && paymentIntent.status !== 'succeeded') {
    return { status: 200, body: { received: true } };
  }

  const existingByIntent = await deps.getExistingDonationByPaymentIntentId(paymentIntent.id);
  if (existingByIntent) {
    return { status: 200, body: { received: true, duplicate: true } };
  }

  const metadata = parseDonationMetadata(paymentIntent.metadata);
  const email = metadata.email || paymentIntent.receipt_email?.trim() || '';
  if (!email) {
    console.warn('[stripe/donation-webhook] missing email; skipping insert', {
      payment_intent_id: paymentIntent.id,
      stripe_event_id: event.id,
    });
    return { status: 200, body: { received: true } };
  }

  await deps.insertDonation({
    billingName: metadata.billingName,
    displayName: metadata.displayName,
    anonymous: metadata.anonymous,
    email,
    message: metadata.message,
    amountCents: paymentIntent.amount,
    stripePaymentIntentId: paymentIntent.id,
    stripeEventId: event.id,
  });

  console.log('[stripe/donation-webhook] donation_inserted', {
    stripe_event_id: event.id,
    payment_intent_id: paymentIntent.id,
    amount_cents: paymentIntent.amount,
  });

  return { status: 200, body: { received: true, inserted: true } };
}