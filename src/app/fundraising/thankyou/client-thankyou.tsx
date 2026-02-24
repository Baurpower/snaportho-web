'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'next/navigation';


function getTierCents(amountCents: number): string {
  if (amountCents >= 50_000) return '💎 Platinum';
  if (amountCents >= 10_000) return '🥇 Gold';
  if (amountCents >= 5_000) return '🥈 Silver';
  return '🥉 Bronze';
}

export default function ClientThankYou() {
  const searchParams = useSearchParams();

  const [amount, setAmount] = useState<number>(0);
  const [status, setStatus] = useState<string>('');
  const [loaded, setLoaded] = useState(false);

  const paymentIntentId = searchParams?.get('payment_intent');
  const fallbackAmount = parseInt(searchParams?.get('amount') ?? '0', 10);

  const tier = useMemo(
    () => getTierCents(amount || fallbackAmount),
    [amount, fallbackAmount]
  );

  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  }, []);

  useEffect(() => {
    async function load() {
      try {
        if (!paymentIntentId) {
          setAmount(fallbackAmount);
          setStatus(fallbackAmount > 0 ? 'succeeded' : '');
          setLoaded(true);
          return;
        }

        const res = await fetch(
          `/api/payment-intent-status?pi=${encodeURIComponent(paymentIntentId)}`
        );
        const data: unknown = await res.json();

        // Narrow `data` safely
        const obj = (data && typeof data === 'object') ? (data as Record<string, unknown>) : {};
        const errorMsg = typeof obj.error === 'string' ? obj.error : null;

        if (!res.ok) throw new Error(errorMsg || 'Failed to load payment status');

        const amt = typeof obj.amount === 'number' ? obj.amount : Number(obj.amount);
        const st = typeof obj.status === 'string' ? obj.status : '';

        setAmount(Number.isFinite(amt) ? amt : 0);
        setStatus(st);
      } catch {
        // If something fails, fall back gracefully
        setAmount(fallbackAmount);
        setStatus(fallbackAmount > 0 ? 'succeeded' : '');
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, [paymentIntentId, fallbackAmount]);

  useEffect(() => {
    const amt = amount || fallbackAmount;
    if (!loaded) return;

    if (typeof window !== 'undefined' && window.branch && amt > 0) {
      window.branch.track('Donation Completed', {
        amount: amt, // cents
        tier,
        source: 'Web Checkout',
        timestamp: new Date().toISOString(),
        status: status || 'unknown',
        payment_intent: paymentIntentId || '',
      });
    }
  }, [amount, fallbackAmount, tier, loaded, status, paymentIntentId]);

  const displayAmount = ((amount || fallbackAmount) / 100).toFixed(2);

  return (
    <main className="min-h-screen bg-cream text-midnight flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl space-y-6 max-w-2xl w-full">
        <h1 className="text-5xl font-extrabold text-green-700">🎉 Thank You!</h1>

        <p className="text-lg text-midnight/90">
          {loaded && (amount || fallbackAmount) > 0 ? (
            <>
              Donation received:{' '}
              <span className="font-bold text-navy">${displayAmount}</span>
              <br />
              You just joined the{' '}
              <span className="font-bold text-navy">{tier} Tier</span> — and it
              truly means the world to us.
            </>
          ) : (
            <>
              We’re confirming your donation…
              <br />
              If you just completed verification, this page should update shortly.
            </>
          )}
        </p>

        <p className="text-base text-midnight/80">
          SnapOrtho was born out of a simple idea: there must be a more efficient
          way to learn and master orthopaedic concepts. Thanks to you, we can keep
          pushing that idea forward.
        </p>

        <blockquote className="italic text-midnight/70 border-l-4 border-sky pl-4">
          &ldquo;This platform was never meant to be a business. It is my way of
          helping others avoid the confusion I once felt. Seeing others believe
          in this mission is the greatest reward.&rdquo;
          <br />
          <span className="not-italic font-semibold block mt-2">
            – Alex Baur, Founder
          </span>
        </blockquote>

        <div className="pt-6">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-sky text-white font-semibold rounded-full shadow hover:bg-sky/90 transition"
          >
            Return to SnapOrtho
          </Link>
        </div>
      </div>
    </main>
  );
}