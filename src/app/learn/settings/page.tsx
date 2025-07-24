'use client';

import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useProfile } from '../../hooks/useprofile';
import ProfileForm from '@/app/onboarding/profileform';
import { useState } from 'react';
import Link from 'next/link';

export default function LearnProfileSettingsPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { profile, loading } = useProfile(user?.id);
  const [editing, setEditing] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (!user) {
    return (
      <p className="p-6 text-center text-midnight/80">
        Please sign in to view your Learn profile.
      </p>
    );
  }

  if (loading) {
    return (
      <p className="p-6 text-center text-midnight/80">Loading profile...</p>
    );
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-12 space-y-10">
      <h1 className="text-3xl font-bold text-navy mb-4">My Account</h1>

      {!editing ? (
        <div className="space-y-6">
          <div>
            <p className="text-sm text-gray-500">Full Name</p>
            <p className="text-lg font-medium">{profile.full_name || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email</p>
            <p className="text-lg font-medium">{user.email}</p>
          </div>

          <div className="grid gap-4">
            <button
              onClick={() => setEditing(true)}
              className="w-full py-2 bg-sky text-white rounded-full font-medium hover:bg-sky/90 transition"
            >
              Update Profile
            </button>

            <Link
              href="/auth/update-password"
              className="w-full text-center py-2 border border-slate-300 rounded-full font-medium hover:bg-slate-100 transition"
            >
              Update Password
            </Link>

            <Link
              href="/auth/delete-account"
              className="w-full text-center py-2 border border-red-500 text-red-600 rounded-full font-medium hover:bg-red-50 transition"
            >
              Delete Account
            </Link>

            <button
              onClick={handleSignOut}
              className="w-full py-2 bg-midnight text-white rounded-full font-medium hover:bg-midnight/90 transition"
            >
              Log Out
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <ProfileForm initialValues={profile} mode="update" />
          <button
            onClick={() => setEditing(false)}
            className="w-full py-2 text-sky-600 hover:underline text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </main>
  );
}
