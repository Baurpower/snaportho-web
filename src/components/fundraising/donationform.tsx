'use client';

import { useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';

const tiers = [
  { label: '🥉 Bronze', amount: 500 },
  { label: '🥈 Silver', amount: 2000 },
  { label: '🥇 Gold', amount: 5000 },
  { label: '💎 Platinum', amount: 10000 },
];

export default function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();

  const [amount, setAmount] = useState(1500); // default = $15
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
    setSelectedTier(null); // clear tier selection if custom typed
  };

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
      window.location.href = '/fundraising?thankyou=1';
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

      {/* Preset Tiers */}
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

      {/* Custom input */}
      <input
        type="number"
        min={1}
        value={amount / 100}
        onChange={handleCustomAmountChange}
        className="w-full border rounded-lg px-4 py-2"
        placeholder="Enter custom amount"
        required
      />

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
