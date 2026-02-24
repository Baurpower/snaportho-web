import type { NextApiRequest, NextApiResponse } from "next";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

function cleanString(v: unknown, maxLen: number) {
  const s = String(v ?? "").trim();
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const amount = Number(req.body.amount);
    if (!Number.isInteger(amount) || amount < 100 || amount > 500_000) {
      return res.status(400).json({ error: "Invalid amount (must be 100–500000 cents)." });
    }

    const email = cleanString(req.body.email, 200);
    if (!email || !email.includes("@")) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    const billingName = cleanString(req.body.billingName, 200);
    const displayName = cleanString(req.body.publicName, 200);
    const message = cleanString(req.body.message, 500);
    const anonymous = !!req.body.anonymous;

    // Optional: client-provided idempotency key (recommended), else server generates one
    const idempotencyKey = cleanString(req.body.idempotencyKey, 200) || crypto.randomUUID();

    const pi = await stripe.paymentIntents.create(
      {
        amount,
        currency: "usd",

        // ✅ ensures Stripe can send receipts to the email the user entered
        receipt_email: email,

        // ✅ keep donor fields for your webhook/DB insert
        metadata: {
          billing_name: billingName,
          display_name: displayName,
          anonymous: anonymous ? "true" : "false",
          email,
          message,
        },
      },
      { idempotencyKey }
    );

    if (!pi.client_secret) {
      return res.status(500).json({ error: "Stripe did not return a client secret." });
    }

    return res.status(200).json({ clientSecret: pi.client_secret });
  } catch (err: unknown) {
  console.error("Stripe error:", err);

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Stripe failed to create payment intent";

  return res.status(500).json({ error: message });
}
}