'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function OnboardingCompletePage() {
  const router = useRouter();

  // Optional: auto-redirect to Learn after delay
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/learn');
    }, 4000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="max-w-lg w-full bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
        <h1 className="text-3xl font-bold text-navy">You’re All Set!</h1>
        <p className="text-midnight/80 text-lg">
          Thanks for completing your profile. SnapOrtho is ready to help you learn smarter, faster,
          and with more confidence.
        </p>
        <p className="text-midnight/70 text-sm">
          You’ll be redirected shortly. If not, click below to begin learning.
        </p>
        <Link
          href="/learn"
          className="inline-block px-6 py-3 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Go to Learn Home
        </Link>
      </div>
    </main>
  );
}
