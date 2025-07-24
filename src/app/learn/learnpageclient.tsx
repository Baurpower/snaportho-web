// src/app/learn/LearnPageClient.tsx
'use client';

import { useAuth } from '../../context/AuthContext';
import { useEffect } from 'react';
import LearnMember from './learnmember';
import LearnNonMember from './learnnonmember';

declare global {
  interface Window {
    twq?: (type: "config" | "event", id: string, params?: Record<string, unknown>) => void;
  }
}

const TW_EVENT_ID = "tw-q0hm1-q0h07";

export default function LearnPageClient() {
  const { user } = useAuth();

  useEffect(() => {
    if (!user || sessionStorage.getItem("twqFired")) return;

    const fireConversion = () => {
      if (typeof window.twq === "function") {
        window.twq("event", TW_EVENT_ID, { status: "completed" });
        sessionStorage.setItem("twqFired", "true");
        return true;
      }
      return false;
    };

    if (!fireConversion()) {
      const poll = setInterval(() => {
        if (fireConversion()) clearInterval(poll);
      }, 300);
      setTimeout(() => clearInterval(poll), 3000);
    }
  }, [user]);

  return user ? <LearnMember /> : <LearnNonMember />;
}
