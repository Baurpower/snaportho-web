'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import dynamic from 'next/dynamic';
import type { UserProfile } from '@/components/profileform';

interface TrainingRow {
  id: string;
  role: string;
  institution: string;
  graduation_date: string;
}

const ProfileForm = dynamic(
  () => import('@/components/profileform'),
  { ssr: false }
);

export default function EditProfilePage() {
  const router = useRouter();
  const { user } = useAuth(); // get the logged-in user from context
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1) Redirect if not signed in
    if (!user) {
      router.replace('/auth/sign-in');
      return;
    }

    // 2) Load profile + training history in parallel
    Promise.all([
      supabase
        .from('user_training_history')
        .select('id, role, institution, graduation_date')
        .eq('user_id', user.id),
      supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])
      .then(([histRes, profRes]) => {
        if (histRes.error || profRes.error) {
          console.error(histRes.error || profRes.error);
          return;
        }

        // cast history rows to your interface
        const rows = (histRes.data ?? []) as TrainingRow[];
        const initialValues: UserProfile = {
          ...profRes.data!,
          training_history: rows.map((r) => ({
            id: r.id,
            label: r.role,
            institution: r.institution,
            graduation_date: r.graduation_date,
          })),
        };
        setProfile(initialValues);
      })
      .finally(() => setLoading(false));
  }, [user, router]);

  if (loading || !profile) {
    return <p className="text-center py-20">Loading profile…</p>;
  }

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <ProfileForm initialValues={profile} mode="update" />
    </main>
  );
}
