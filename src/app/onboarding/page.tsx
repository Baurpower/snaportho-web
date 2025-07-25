// src/app/onboarding/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import ProfileForm from './profileform';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkProfile() {
      // 1) Ensure user is signed in
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/auth/sign-in');
        return;
      }

      // 2) Look up their profile
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (error) {
        console.error('Profile lookup error:', error);
        // Optionally show an error state here
        setLoading(false);
        return;
      }

      // 3) If they already have a profile, go to complete page
      if (profile) {
        router.replace('/onboarding/complete');
      } else {
        // No profile yet → render the form
        setLoading(false);
      }
    }

    checkProfile();
  }, [router]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading…</p>
      </div>
    );
  }

  // First‑time user: show the ProfileForm
  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <ProfileForm />
    </main>
  );
}
