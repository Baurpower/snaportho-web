'use client';

import { useState } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// ───────────────────────────────────────────────────────────
// 1) Stripe instance (frontend) – publishable key only
// ───────────────────────────────────────────────────────────
const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!
);

// ───────────────────────────────────────────────────────────
// 2) Wrapper exported as default
// ───────────────────────────────────────────────────────────
export default function DonationFormWrapper() {
  return (
    <Elements
      stripe={stripePromise}
      options={{ appearance: { theme: 'night', labels: 'floating' } }}
    >
      <DonationForm />
    </Elements>
  );
}

// ───────────────────────────────────────────────────────────
// 3) Inner form (client component)
// ───────────────────────────────────────────────────────────
function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();

  // form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [amount, setAmount] = useState(1500); // cents
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);

  const presets = [500, 1500, 5000]; // $5 / $15 / $50

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);

    // 1. hit our API route to make a PaymentIntent
    const res = await fetch('/api/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, name, email, message }),
    });

    const { clientSecret, error: apiError } = await res.json();
    if (apiError) {
      alert(apiError);
      setLoading(false);
      return;
    }

    // 2. confirm card payment
    const { error } = await stripe.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements.getElement(CardElement)!,
        billing_details: { name, email },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      window.location.href = '/fundraising?thankyou=1';
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-lg mx-auto">
      {/* Name / Email */}
      <input
        type="text"
        placeholder="Your name"
        className="w-full border px-3 py-2 rounded"
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="email"
        placeholder="Email receipt to"
        className="w-full border px-3 py-2 rounded"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      {/* Optional message */}
      <textarea
        placeholder="Leave a message (optional)"
        className="w-full border px-3 py-2 rounded"
        rows={3}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      {/* Amount selector */}
      <div className="flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => {
              setAmount(p);
              setCustom('');
            }}
            className={`px-4 py-2 rounded-full ${
              amount === p
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            ${p / 100}
          </button>
        ))}

        <input
          type="number"
          min={1}
          placeholder="Custom"
          className="w-24 border px-2 py-2 rounded"
          value={custom}
          onChange={(e) => {
            setCustom(e.target.value);
            const val = Number(e.target.value);
            if (val > 0) setAmount(val * 100);
          }}
        />
      </div>

      {/* Card element */}
      <CardElement className="p-4 border rounded-lg bg-white" />

      {/* Submit */}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-green-600 text-white py-3 rounded-lg disabled:opacity-50 hover:bg-green-700 transition"
      >
        {loading ? 'Processing…' : `Donate $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}
