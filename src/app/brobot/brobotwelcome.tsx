// src/components/BroBotWelcome.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function BroBotWelcome() {
  const router = useRouter();
  const { user } = useAuth();

  // If they’re already signed in, go to /brobot
  useEffect(() => {
    if (user) {
      router.replace('/brobot');
    }
  }, [user, router]);

  const handleLogin = () => {
    router.push('/auth/sign-in?redirectTo=/brobot');
  };

  const handleSignUp = () => {
    router.push('/auth/sign-up?redirectTo=/brobot');
  };

  // Guests go into the free BroBot experience
  const handleGuest = () => {
    localStorage.setItem('brobotGuestClicked', 'true');
    router.push('/brobot/basic');
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] px-6">
      <div className="max-w-md bg-white p-8 rounded-2xl shadow-lg text-center space-y-6">
        <h1 className="text-3xl font-bold">Welcome to BroBot</h1>
        <p className="text-gray-700">
          Log in or sign up to save your sessions and unlock member features,
          or continue as a guest.
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
              className="w-full px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
            >
              Continue to BroBot
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
