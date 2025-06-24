'use client';

import { useState, useEffect } from 'react';
import {
  Elements,
  CardElement,
  useStripe,
  useElements,
  PaymentRequestButtonElement,
} from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function DonatePage() {
  return (
    <Elements stripe={stripePromise} options={{ appearance: { theme: 'night' } }}>
      <DonationForm />
    </Elements>
  );
}

function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [amount, setAmount] = useState(1500);
  const [custom, setCustom] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const [canUseWallet, setCanUseWallet] = useState(false);
  const preset = [500, 1500, 5000];

  useEffect(() => {
    if (!stripe) return;
    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: 'SnapOrtho Donation', amount },
      requestPayerEmail: true,
    });
    pr.canMakePayment().then(res => {
      if (res) setCanUseWallet(true);
    });
  }, [stripe, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const res = await fetch('/api/create-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, name, email, message }),
    });
    const { clientSecret } = await res.json();

    const { error } = await stripe!.confirmCardPayment(clientSecret, {
      payment_method: {
        card: elements!.getElement(CardElement)!,
        billing_details: { name, email },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      window.location.href = '/donate?thankyou=1';
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-lg mx-auto space-y-6 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-semibold text-center">Support SnapOrtho</h2>

      {/* Name, Email */}
      <input
        type="text"
        placeholder="Your name"
        value={name}
        onChange={e => setName(e.target.value)}
        required
        className="w-full border px-3 py-2 rounded"
      />
      <input
        type="email"
        placeholder="Your email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        required
        className="w-full border px-3 py-2 rounded"
      />

      {/* Optional message */}
      <textarea
        placeholder="Leave a message (optional)"
        value={message}
        onChange={e => setMessage(e.target.value)}
        className="w-full border px-3 py-2 rounded"
        rows={3}
      />

      {/* Amount selection */}
      <div className="flex gap-2">
        {preset.map(p => (
          <button
            type="button"
            key={p}
            onClick={() => { setAmount(p); setCustom(''); }}
            className={`px-4 py-2 rounded-lg ${amount === p ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            ${p / 100}
          </button>
        ))}
        <input
          type="number"
          placeholder="Custom"
          value={custom}
          onChange={e => {
            const val = Number(e.target.value);
            setCustom(e.target.value);
            if (!isNaN(val) && val > 0) setAmount(val * 100);
          }}
          className="w-24 border px-2 rounded"
        />
      </div>

      {/* Stripe card */}
      <CardElement className="p-4 border rounded-lg bg-white" />

      <button
        type="submit"
        disabled={loading || !stripe}
        className="w-full bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
      >
        {loading ? 'Processing…' : `Donate $${(amount / 100).toFixed(2)}`}
      </button>

      {/* Payment request button (Apple/Google Pay) */}
      {canUseWallet && (
        <PaymentRequestButtonElement options={{ paymentRequest: stripe!.paymentRequest({
          country: 'US',
          currency: 'usd',
          total: { label: 'SnapOrtho Donation', amount },
          requestPayerEmail: true,
        }) }} />
      )}

      <p className="text-sm text-gray-500 text-center">100% of your donation supports development and education.</p>
    </form>
  );
}
