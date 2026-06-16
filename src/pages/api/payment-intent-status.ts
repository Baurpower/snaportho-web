import type { NextApiRequest, NextApiResponse } from "next";
import { getStripe } from "@/lib/stripe";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const pi = String(req.query.pi || "").trim();

  if (!pi.startsWith("pi_")) {
    return res.status(400).json({ error: "Missing/invalid payment_intent id" });
  }

  try {
    const stripe = getStripe();
    const intent = await stripe.paymentIntents.retrieve(pi);

    return res.status(200).json({
      status: intent.status,
      amount: intent.amount,
      currency: intent.currency,
      receipt_email: intent.receipt_email,
      metadata: intent.metadata ?? {},
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : typeof err === "string"
          ? err
          : "Failed to retrieve payment intent";

    return res.status(500).json({ error: message });
  }
}
