import { NextResponse } from 'next/server';

import { getStripe } from '@/lib/stripe';
import { handleDonationStripeWebhook } from '@/lib/donations/webhook-handler';
import {
  getExistingDonationByPaymentIntentId,
  getExistingDonationByStripeEventId,
  insertDonation,
} from '@/lib/donations/store';

const donationWebhookSecret =
  process.env.STRIPE_DONATION_WEBHOOK_SECRET ?? process.env.STRIPE_WEBHOOK_SECRET_DONATIONS ?? '';

export async function POST(request: Request) {
  if (!donationWebhookSecret) {
    console.error('[stripe/donation-webhook] missing STRIPE_DONATION_WEBHOOK_SECRET');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const stripe = getStripe();

  const result = await handleDonationStripeWebhook(
    { body, signature, secret: donationWebhookSecret },
    {
      constructEvent: (rawBody, sig, secret) => stripe.webhooks.constructEvent(rawBody, sig, secret),
      getExistingDonationByStripeEventId,
      getExistingDonationByPaymentIntentId,
      insertDonation,
    }
  );

  return NextResponse.json(result.body, { status: result.status });
}