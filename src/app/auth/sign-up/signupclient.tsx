// src/app/auth/sign‑up/SignUpClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../../../context/AuthContext';
import { supabase } from '@/lib/supabaseClient';

interface Props {
  redirectTo: string;
}

export default function SignUpClient({ redirectTo }: Props) {
  const router = useRouter();
  const { signUp, user } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  // If already signed in, redirect
  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // check existing
    const { data: existing, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .limit(1);

    if (fetchErr) {
      console.error('Lookup error:', fetchErr);
      setMessage('Something went wrong. Please try again.');
      return;
    }

    if (existing?.length) {
      setMessage(
        'An account with that email already exists. Please sign in or reset your password.'
      );
      return;
    }

    // sign up
    const { error } = await signUp(email, password);
    if (error) setMessage(error.message);
    else router.replace(redirectTo);
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Create Your SnapOrtho Account
      </h2>

      {message && (
        <p className="mb-4 text-center text-sm text-midnight/70">{message}</p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          required
          placeholder="Create password"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          type="submit"
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Create Account
        </button>
      </form>

      <p className="mt-4 text-center text-sm text-midnight/70">
        Already have an account?{' '}
        <Link
          href={`/auth/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`}
          className="text-sky hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}
