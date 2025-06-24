'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import confetti from 'canvas-confetti';
import { useSearchParams } from 'next/navigation';

function getTier(amount: number): string {
  if (amount >= 10000) return '💎 Platinum';
  if (amount >= 5000) return '🥇 Gold';
  if (amount >= 2000) return '🥈 Silver';
  return '🥉 Bronze';
}

export default function ClientThankYou() {
  const searchParams = useSearchParams();
  const rawAmount = searchParams?.get('amount');
  const amount = parseInt(rawAmount ?? '0', 10);
  const tier = getTier(amount);

  useEffect(() => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });

    if (typeof window !== 'undefined' && window.branch && amount > 0) {
      window.branch.track('Donation Completed', {
        amount,
        tier,
        source: 'Web Checkout',
        timestamp: new Date().toISOString(),
      });
    }
  }, [amount, tier]);

  return (
    <main className="min-h-screen bg-cream text-midnight flex flex-col items-center justify-center px-6 py-20 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-xl space-y-6 max-w-2xl w-full">
        <h1 className="text-5xl font-extrabold text-green-700">🎉 Thank You!</h1>
        <p className="text-lg text-midnight/90">
          You just joined the <span className="font-bold text-navy">{tier} Tier</span> — and it truly means the world to us.
        </p>
        <p className="text-base text-midnight/80">
          SnapOrtho was born out of a simple idea: there must be a more efficient way to learn and master orthopaedic concepts. Thanks to you, we can keep pushing that idea forward.
        </p>
        <blockquote className="italic text-midnight/70 border-l-4 border-sky pl-4">
          &ldquo;This platform was never meant to be a business — it was just my way of helping others avoid the confusion I once felt. Seeing others believe in this mission is the greatest reward.&rdquo;
          <br />
          <span className="not-italic font-semibold block mt-2">– Alex Baur, Founder</span>
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
