// src/app/auth/delete-account/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DeleteAccountPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg]           = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  const handleDelete = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);

    try {
      const res = await fetch('/api/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        // try parse an error message, otherwise throw generic
        const { error } = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(error ?? `Server returned status ${res.status}`);
      }

      // Always attempt to sign out
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        console.warn('supabase.auth.signOut failed (already signed out?):', signOutErr);
      }

      setMsg('✅ Account deleted and signed out. Redirecting to home…');
      router.replace('/');
    } catch (err: unknown) {
      const e = err instanceof Error ? err : new Error('Unknown error');
      console.error('Account deletion error:', e);
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-16 p-6 bg-white rounded-2xl shadow-lg">
      <h2 className="text-2xl font-semibold mb-4 text-center text-red-600">
        Delete Account
      </h2>

      {msg && (
        <p className={`text-center ${loading ? 'text-gray-700' : 'text-red-600'}`}>
          {msg}
        </p>
      )}

      <form onSubmit={handleDelete} className="space-y-4">
        <input
          type="email"
          required
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400"
        />
        <input
          type="password"
          required
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-4 py-2 rounded-lg border focus:ring-2 focus:ring-red-400"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-red-600 text-white rounded-full font-medium hover:bg-red-700 transition"
        >
          {loading ? 'Deleting…' : 'Delete My Account'}
        </button>
      </form>
    </div>
  );
}
