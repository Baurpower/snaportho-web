// src/app/brobot/brobotpagewrapper.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import BroBotWelcome from './brobotwelcome';
import BroBotMember from './brobotmember';

export default function BroBotPageWrapper() {
  const { user, loading } = useAuth();
  const [firstVisit, setFirstVisit] = useState(false);

  // Once user is known, check if they've seen the welcome
  useEffect(() => {
    if (user) {
      const key = `brobotWelcomeSeen_${user.id}`;
      const seen = localStorage.getItem(key);
      if (!seen) {
        setFirstVisit(true);
        localStorage.setItem(key, 'true');
      }
    }
  }, [user]);

  if (loading) {
    return <BroBotLoadingState />;
  }

  // 1) not signed in -> always show welcome
  if (!user) {
    return <BroBotWelcome />;
  }

  // 2) signed in & first visit → show welcome once
  if (firstVisit) {
    return <BroBotWelcome />;
  }

  // 3) signed in & not first visit → member UI
  return <BroBotMember />;
}

function BroBotLoadingState() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#fefcf7] to-[#f5f2e8] px-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-sm font-medium text-slate-600 shadow-sm">
        Loading BroBot...
      </div>
    </main>
  );
}
