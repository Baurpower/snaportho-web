// src/app/brobot/brobotpagewrapper.tsx
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import BroBotWelcome from './brobotwelcome';
import BroBotMember from './brobotmember';

export default function BroBotPageWrapper() {
  const { user } = useAuth();
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

  // 1) not signed in → always show welcome
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
