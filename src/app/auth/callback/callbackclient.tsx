// src/app/auth/callback/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finalizeSignIn() {
      // Supabase Auth Helpers will already have picked up
      // the access_token & set the cookie/localStorage for you.
      const {
        data: { session },
        error: sessionErr,
      } = await supabase.auth.getSession();

      if (sessionErr) {
        console.error('Error fetching session:', sessionErr);
        setError('Authentication failed. Please sign in again.');
        setLoading(false);
        return;
      }

      if (session) {
        // Signed in! Send them into onboarding
        router.replace('/onboarding');
      } else {
        // No session—send back to sign‑in
        router.replace('/auth/sign-in');
      }
    }

    finalizeSignIn();
  }, [router]);

  if (loading && !error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Finalizing your sign‑in…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-red-600">{error}</p>
    </div>
  );
}
