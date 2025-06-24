import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { Pool } from 'pg';

// Stripe (single declaration!)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// Postgres pool
const pool = new Pool({
  host: process.env.POSTGRES_HOST!,
  user: process.env.POSTGRES_USER!,
  password: process.env.POSTGRES_PASSWORD!,
  database: process.env.POSTGRES_DB!,
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { amount, name, email, message } = req.body;
  if (!amount || amount < 100) {
    return res.status(400).json({ error: 'Minimum donation is $1.00' });
  }

  try {
    // 1. create PaymentIntent
    const pi = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: { name, email, message },
    });

    // 2. log to DB
    await pool.query(
      `INSERT INTO donations (name, email, message, amount, stripe_id, status)
       VALUES ($1,$2,$3,$4,$5,'pending')`,
      [name, email, message, amount, pi.id],
    );

    // 3. return client secret
    return res.status(200).json({ clientSecret: pi.client_secret });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
}
