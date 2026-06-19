// src/components/BroBotWelcome.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { safeRedirectPath } from '@/lib/auth/redirects';

export default function BroBotWelcome() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const getCurrentPath = () =>
    safeRedirectPath(
      typeof window !== 'undefined'
        ? `${window.location.pathname}${window.location.search}`
        : '/brobot',
      '/brobot'
    );

  // If already signed in elsewhere in the app, go straight to BroBot
  useEffect(() => {
    if (!loading && user) {
      router.replace('/brobot');
    }
  }, [loading, user, router]);

  const handleLogin = () => {
    const params = new URLSearchParams({ redirectTo: getCurrentPath(), intent: 'brobot' });
    router.push(`/auth/sign-in?${params.toString()}`);
  };

  const handleSignUp = () => {
    const params = new URLSearchParams({ redirectTo: getCurrentPath(), intent: 'brobot' });
    router.push(`/auth/sign-up?${params.toString()}`);
  };

  const handleGuest = () => {
    router.push('/brobot/basic');
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] px-6">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
          Loading BroBot...
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] px-6">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg text-center space-y-6">
        <h1 className="text-3xl font-bold">Welcome to BroBot</h1>
        <p className="text-gray-700">
          Log in or sign up to save your sessions and get personalized features,
          or continue as a guest without an account.
        </p>

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleGuest}
            className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            Continue as Guest
          </button>

          {!user && (
            <>
              <button
                onClick={handleLogin}
                className="w-full px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-lg hover:bg-teal-50 transition"
              >
                Log In
              </button>
              <button
                onClick={handleSignUp}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition"
              >
                Sign Up
              </button>
            </>
          )}

          {user && (
            <button
              onClick={() => router.push('/brobot')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Continue to BroBot
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
