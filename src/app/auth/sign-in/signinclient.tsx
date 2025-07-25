// src/app/auth/sign-in/SignInClient.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';

interface Props {
  redirectTo: string;
}

export default function SignInClient({ redirectTo }: Props) {
  const router = useRouter();
  const { user, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // If already signed in, redirect
  useEffect(() => {
    if (user) router.replace(redirectTo);
  }, [user, redirectTo, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const { error } = await signIn(email, password);
    if (error) {
      setErrorMsg(error.message);
    } else {
      router.replace(redirectTo);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-navy">
        Sign In
      </h2>

      {errorMsg && (
        <div className="mb-4 text-sm text-red-600 text-center">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-sky"
        />
        <button
          type="submit"
          className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
        >
          Sign In
        </button>
      </form>

      <div className="mt-4 flex justify-between text-sm">
        <Link href="/auth/password-reset" className="text-sky hover:underline">
          Forgot Password?
        </Link>
        <span>
          Don’t have an account?{' '}
          <Link
            href={`/auth/sign-up?redirectTo=${encodeURIComponent(redirectTo)}`}
            className="text-sky hover:underline"
          >
            Sign Up
          </Link>
        </span>
      </div>
    </div>
  );
}
