// src/app/auth/sign-up/SignUpClient.tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

export default function SignUpClient() {
  const [email, setEmail]                 = useState('');
  const [password, setPassword]           = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage]             = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    // 1) Validate passwords match
    if (password !== confirmPassword) {
      setMessage("Passwords don’t match.");
      return;
    }

    // 2) Optional: prevent duplicate profiles
    const { data: existing, error: lookupErr } = await supabase
      .from('user_profiles')
      .select('user_id')
      .eq('email', email)
      .limit(1);

    if (lookupErr) {
      console.error('Lookup error:', lookupErr);
      setMessage('Something went wrong. Please try again.');
      return;
    }
    if (existing?.length) {
      setMessage(
        'An account with that email already exists. Please sign in or reset your password.'
      );
      return;
    }

    // 3) Trigger Supabase magic-link email
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      console.error('Sign-up error:', signUpError);
      setMessage(signUpError.message);
    } else {
      setMessage(
        '✅ Check your inbox for a confirmation link to finish creating your account.'
      );
    }
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
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />

        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create password"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />

        <input
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm password"
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
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
        <Link href="/auth/sign-in" className="text-sky hover:underline">
          Sign In
        </Link>
      </p>
    </div>
  );
}
