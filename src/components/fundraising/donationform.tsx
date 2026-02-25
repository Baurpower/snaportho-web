'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CardNumberElement,
  CardExpiryElement,
  CardCvcElement,
  useElements,
  useStripe,
} from '@stripe/react-stripe-js';
import { useRouter } from 'next/navigation';

const tiers = [
  { label: '🥉 Bronze', amount: 500 },
  { label: '🥈 Silver', amount: 5000 },
  { label: '🥇 Gold', amount: 10000 },
  { label: '💎 Platinum', amount: 50000 },
];

const ADJ = ['Silly','Brave','Sweet','Sexy','Fierce','Bold','Bright','Slick','Gorgeous','Sharp','Humble','Solid','Tasty','Focused','Clever'];
const NOUN = ['Suture','Scalpel','Mallet','Bone','Drill','Frog','Hammer','Viking','Falcon','Lion','Bison','Cat','Corpse','Nimbus','Voyager','Daisy'];

const MIN_CENTS = 100;      // $1
const MAX_CENTS = 500_000;  // $5,000

function randomCodename() {
  const a = ADJ[Math.floor(Math.random() * ADJ.length)];
  const n = NOUN[Math.floor(Math.random() * NOUN.length)];
  const num = Math.floor(Math.random() * 100); // 0–99
  const twoDigit = num.toString().padStart(2, '0');
  return `${a} ${n} ${twoDigit}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function dollarsToCents(input: string) {
  const normalized = input.replace(/[^\d.]/g, '');
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  return Math.round(num * 100);
}

export default function DonationForm() {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();

  const [amount, setAmount] = useState(1500);
  const [billingName, setBillingName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [anonName, setAnonName] = useState('');

  useEffect(() => {
    if (anonymous && !anonName) setAnonName(randomCodename());
  }, [anonymous, anonName]);

  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<number | null>(null);

  // Track completion per element (since we're splitting fields)
  const [numComplete, setNumComplete] = useState(false);
  const [expComplete, setExpComplete] = useState(false);
  const [cvcComplete, setCvcComplete] = useState(false);

  const [errorText, setErrorText] = useState<string | null>(null);

  const inFlightRef = useRef(false);
  const attemptKeyRef = useRef<string | null>(null);

  function getAttemptKey() {
    if (!attemptKeyRef.current) attemptKeyRef.current = crypto.randomUUID();
    return attemptKeyRef.current;
  }

  useEffect(() => {
    attemptKeyRef.current = null;
  }, [amount, email, billingName, displayName, anonymous, anonName, message]);

  const publicName = useMemo(() => {
    if (anonymous) return anonName;
    const trimmed = displayName.trim();
    return trimmed.length ? trimmed : billingName.trim();
  }, [anonymous, anonName, displayName, billingName]);

  const regenAnon = () => setAnonName(randomCodename());

  const handleTierClick = (value: number) => {
    setAmount(value);
    setSelectedTier(value);
    setErrorText(null);
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cents = dollarsToCents(e.target.value);
    if (cents == null) return;
    setAmount(clamp(cents, MIN_CENTS, MAX_CENTS));
    setSelectedTier(null);
    setErrorText(null);
  };

  const cardComplete = numComplete && expComplete && cvcComplete;

  const canSubmit =
    !!stripe &&
    !!elements &&
    !loading &&
    !inFlightRef.current &&
    billingName.trim().length > 0 &&
    email.trim().length > 0 &&
    amount >= MIN_CENTS &&
    amount <= MAX_CENTS &&
    cardComplete;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    if (inFlightRef.current) return;
    inFlightRef.current = true;

    setLoading(true);
    setErrorText(null);

    try {
      const cleanBilling = billingName.trim();
      const cleanEmail = email.trim();
      const cleanMessage = message.trim();

      if (!cleanBilling) throw new Error('Please enter your billing name.');
      if (!cleanEmail || !cleanEmail.includes('@')) throw new Error('Please enter a valid email.');
      if (!Number.isInteger(amount) || amount < MIN_CENTS || amount > MAX_CENTS) {
        throw new Error('Please enter a valid donation amount.');
      }

      const cardNumberEl = elements.getElement(CardNumberElement);
      if (!cardNumberEl) throw new Error('Card number element not found.');

      const idempotencyKey = getAttemptKey();

      const res = await fetch('/api/create-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          billingName: cleanBilling,
          publicName,
          anonymous,
          email: cleanEmail,
          message: cleanMessage,
          idempotencyKey,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || 'Failed to create payment intent.');

      const clientSecret: string | undefined = data?.clientSecret;
      if (!clientSecret) throw new Error('Missing client secret from server.');

      // IMPORTANT: pass CardNumberElement here; Stripe uses the combined card data across elements
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardNumberEl,
          billing_details: { name: cleanBilling, email: cleanEmail },
        },
        return_url: `${window.location.origin}/fundraising/thankyou`,
      });

      if (error) throw new Error(error.message || 'Payment failed.');
      if (!paymentIntent) throw new Error('No payment intent returned.');

      if (paymentIntent.status === 'succeeded' || paymentIntent.status === 'processing') {
        router.replace(`/fundraising/thankyou?amount=${amount}`);
        return;
      }

      throw new Error(`Payment not completed (status: ${paymentIntent.status}).`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error. Please try again.';
      console.error('Donation failed:', msg);
      setErrorText(msg);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  };

  const elementOptions = {
    style: { base: { fontSize: '16px' } },
  } as const;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorText && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorText}
        </div>
      )}

      {/* Identity */}
      <section className="rounded-2xl border border-midnight/10 bg-white/70 p-4 sm:p-5">
        <div className="text-sm font-semibold text-midnight">Your info</div>

        <div className="mt-1 text-xs text-midnight/60">
          <span className="text-red-600">*</span> Required fields
        </div>

        <div className="mt-3 grid grid-cols-1 gap-4">
          <div>
            <label className="block text-sm font-semibold text-midnight">
              Name <span className="text-red-600">*</span>
            </label>
            <input
              type="text"
              value={billingName}
              onChange={(e) => setBillingName(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-midnight/10 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky/30"
              autoComplete="name"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-midnight">
              Email address <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1 w-full rounded-xl border border-midnight/10 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky/30"
              autoComplete="email"
              inputMode="email"
            />
          </div>
        </div>
      </section>

      {/* Display name / anonymous */}
      <section className="rounded-2xl border border-midnight/10 bg-white/70 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-midnight">Public display name</div>
            <div className="mt-0.5 text-xs text-midnight/60">Choose what shows on the donor list.</div>
          </div>

          <label className="inline-flex items-center gap-2 text-sm font-semibold text-midnight shrink-0">
            <input
              type="checkbox"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              className="h-4 w-4"
            />
            Anonymous
          </label>
        </div>

        {!anonymous ? (
          <div className="mt-3">
            <input
              type="text"
              placeholder="Display name (optional)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full rounded-xl border border-midnight/10 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky/30"
            />
            <div className="mt-2 text-xs text-midnight/60">
              Preview: <span className="font-semibold text-midnight">{publicName || '—'}</span>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-midnight/10 bg-white px-4 py-3">
            <div className="min-w-0">
              <div className="text-xs text-midnight/60">Anonymous codename</div>
              <div className="mt-0.5 font-semibold text-midnight truncate">{anonName}</div>
            </div>
            <button
              type="button"
              onClick={regenAnon}
              disabled={loading}
              className="shrink-0 rounded-full px-4 py-2 text-sm font-semibold bg-white ring-1 ring-midnight/10 hover:ring-midnight/20 disabled:opacity-50"
            >
              New
            </button>
          </div>
        )}
      </section>

      {/* Amount */}
      <section className="rounded-2xl border border-midnight/10 bg-white/70 p-4 sm:p-5">
        <div className="text-sm font-semibold text-midnight">Amount</div>

        <div className="mt-3 -mx-4 px-4 overflow-x-auto">
          <div className="flex gap-2 min-w-max pb-1">
            {tiers.map((tier) => (
              <button
                key={tier.amount}
                type="button"
                onClick={() => handleTierClick(tier.amount)}
                className={`whitespace-nowrap px-4 py-2.5 rounded-full border text-sm font-semibold transition ${
                  selectedTier === tier.amount
                    ? 'bg-sky text-white border-sky'
                    : 'bg-white text-midnight border-sky/40 hover:border-sky'
                }`}
              >
                {tier.label} · ${tier.amount / 100}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-midnight/70">Custom amount (USD)</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-midnight/10 bg-white px-4 py-2.5 focus-within:ring-2 focus-within:ring-sky/30">
            <span className="text-midnight/60 font-semibold">$</span>
            <input
              type="number"
              min={1}
              step="0.01"
              value={(amount / 100).toFixed(2)}
              onChange={handleCustomAmountChange}
              className="w-full bg-transparent text-base outline-none"
              placeholder="25.00"
              inputMode="decimal"
            />
          </div>
          <div className="mt-2 text-[11px] text-midnight/55">Min $1 · Max $5,000</div>
        </div>
      </section>

      {/* Message */}
      <section className="rounded-2xl border border-midnight/10 bg-white/70 p-4 sm:p-5">
        <div className="text-sm font-semibold text-midnight">Message (optional)</div>
        <textarea
          placeholder="Leave a note for the team"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-3 w-full rounded-xl border border-midnight/10 bg-white px-4 py-3 text-base outline-none focus:ring-2 focus:ring-sky/30"
        />
      </section>

      {/* Payment - split fields */}
      <section className="rounded-2xl border border-midnight/10 bg-white/70 p-4 sm:p-5">
        <div className="text-sm font-semibold text-midnight">Payment</div>

        {/* Card number (full width) */}
        <div className="mt-3">
          <label className="block text-xs font-semibold text-midnight/70">Card number</label>
          <div className="mt-2 rounded-xl border border-midnight/10 bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-sky/30">
            <CardNumberElement
              onChange={(e) => setNumComplete(!!e.complete)}
              options={elementOptions}
            />
          </div>
        </div>

        {/* Exp + CVC (mobile-friendly) */}
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-midnight/70">Expiration</label>
            <div className="mt-2 rounded-xl border border-midnight/10 bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-sky/30">
              <CardExpiryElement
                onChange={(e) => setExpComplete(!!e.complete)}
                options={elementOptions}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-midnight/70">CVC</label>
            <div className="mt-2 rounded-xl border border-midnight/10 bg-white px-3 py-3 focus-within:ring-2 focus-within:ring-sky/30">
              <CardCvcElement
                onChange={(e) => setCvcComplete(!!e.complete)}
                options={elementOptions}
              />
            </div>
          </div>
        </div>

        <div className="mt-2 text-xs text-midnight/60">Secure checkout via Stripe.</div>
      </section>

      {/* Single submit button (mobile + desktop) */}
      <button
        disabled={!canSubmit}
        className="w-full rounded-xl bg-green-600 text-white py-3.5 text-base font-semibold disabled:opacity-50"
      >
        {loading ? 'Processing…' : `Donate $${(amount / 100).toFixed(2)}`}
      </button>
    </form>
  );
}