'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
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
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/auth/sign-in');
        return;
      }

      Promise.all([
        // 1) Query training history
        supabase
          .from('user_training_history')
          .select('id, role, institution, graduation_date')
          .eq('user_id', session.user.id),
        // 2) Query user profile
        supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle(),
      ])
        .then(([histRes, profRes]) => {
          // histRes.data is any[], so cast it:
          const rows = (histRes.data ?? []) as TrainingRow[];

          if (histRes.error || profRes.error) {
            console.error(histRes.error || profRes.error);
            return;
          }

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
    });
  }, [router, supabase]);

  if (loading || !profile) {
    return <p className="text-center py-20">Loading profile…</p>;
  }

  return (
    <main className="max-w-2xl mx-auto py-12 px-4">
      <ProfileForm initialValues={profile} mode="update" />
    </main>
  );
}
