'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function finalizeSignIn() {
      const authCode = searchParams?.get('token'); 

      if (!authCode) {
        setError('Missing auth code.');
        setLoading(false);
        return;
      }

      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(authCode);

      if (exchangeError) {
        console.error('Session exchange failed:', exchangeError.message);
        setError('Authentication failed. Please try again.');
        setLoading(false);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) {
        console.error('No session found after exchange:', sessionError);
        setError('Session not found. Please sign in again.');
        setLoading(false);
        return;
      }

      router.replace('/onboarding');
    }

    finalizeSignIn();
  }, [router, searchParams]);

  if (loading && !error) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Finalizing your sign-in…</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <p className="text-red-600">{error}</p>
    </div>
  );
}
