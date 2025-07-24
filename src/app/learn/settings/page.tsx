'use client';

import { useAuth } from '@/context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import ProfileForm, { UserProfile } from '@/app/onboarding/profileform';

export default function LearnProfileSettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error loading profile:', error);
      } else {
        setProfile(data as UserProfile);
      }

      setLoading(false);
    };

    fetchProfile();
  }, [user]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user)
    return (
      <p className="p-6 text-center text-midnight/80">
        Please sign in to view your Learn profile.
      </p>
    );

  if (loading)
    return (
      <p className="p-6 text-center text-midnight/80">Loading profile...</p>
    );

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold text-navy">Edit Your Learn Profile</h1>

      <ProfileForm initialValues={profile} mode="update" />

      <button
        onClick={handleSignOut}
        className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
      >
        Log Out
      </button>
    </main>
  );
}
