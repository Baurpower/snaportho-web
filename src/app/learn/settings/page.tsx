'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useProfile } from '../../hooks/useprofile';
import ProfileForm from '@/app/onboarding/profileform';

export default function LearnProfileSettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const { profile, loading } = useProfile(user?.id);

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
