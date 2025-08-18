import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { amount, name, email, message } = req.body;

  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Minimum donation is $1.00' });
  }

  try {
    // 1. Create a Stripe PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { name, email, message },
    });

    // 2. Return client secret to frontend
    return res.status(200).json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({ error: 'Stripe failed to create payment intent' });
  }
}
