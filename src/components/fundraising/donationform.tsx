'use client';

import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';

const tiers = [
  { label: '🥉 Bronze', amount: 500 },
  { label: '🥈 Silver', amount: 5000 },
  { label: '🥇 Gold', amount: 10000 },
  { label: '💎 Platinum', amount: 50000 },
];

export default function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [amount, setAmount] = useState(1500);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  const handleTierClick = (value: number) => {
    setAmount(value);
    setSelectedTier(value);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value) * 100;
    setAmount(val);
    setSelectedTier(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, name, email, message }),
      });

      const { clientSecret } = await res.json();

      const { error, paymentIntent } = await stripe!.confirmCardPayment(clientSecret, {
        payment_method: {
          card: elements!.getElement(CardElement)!,
          billing_details: { name, email },
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      await fetch('https://api.snap-ortho.com/log-donation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          message,
          amount,
          stripe_id: paymentIntent.id,
          join_circle: false,
        }),
      });

      router.push(`/fundraising/thankyou?amount=${amount}`);
    } catch (err) {
      const e = err as Error;
      console.error('Donation failed:', e.message);
      alert(`Error: ${e.message || 'Unknown error. Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2"
        />
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border rounded-lg px-4 py-2"
        />
      </div>

      <textarea
        placeholder="Optional message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={3}
        className="w-full border rounded-lg px-4 py-2"
      />

      {/* Tier Selector */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-midnight">Select a tier:</label>
        <div className="flex flex-wrap gap-3">
          {tiers.map((tier) => (
            <button
              key={tier.amount}
              type="button"
              onClick={() => handleTierClick(tier.amount)}
              className={`px-4 py-2 rounded-full border font-medium transition ${
                selectedTier === tier.amount
                  ? 'bg-sky text-white border-sky'
                  : 'bg-white text-midnight border-sky/40 hover:border-sky'
              }`}
            >
              {tier.label} – ${tier.amount / 100}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Amount */}
      <div>
        <label className="block text-sm font-semibold text-midnight mt-4">Or enter custom amount ($):</label>
        <input
          type="number"
          min={1}
          value={amount / 100}
          onChange={handleCustomAmountChange}
          className="w-full border rounded-lg px-4 py-2 mt-1"
          placeholder="Enter custom amount"
          required
        />
      </div>

      <CardElement className="p-4 border rounded-lg" />

      <button
        disabled={!stripe || loading}
        className="w-full bg-green-600 text-white py-3 rounded-lg disabled:opacity-50"
      >
        {loading ? 'Processing…' : `Donate $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}
