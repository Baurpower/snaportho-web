'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import AccountDropdown from '@/components/accountdropdown';

export default function LearnMember() {
  const { user } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const checkUserProfile = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!data && !error) {
        setShowPopup(true);
      }
    };

    checkUserProfile();
  }, [user]);

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      {/* Popup */}
      {showPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full space-y-4 text-center">
            <h2 className="text-xl font-semibold text-navy">
              New Feature: User Profiles
            </h2>
            <p className="text-midnight/80">
              We’ve added personalized profiles! Set yours up now to get the best
              SnapOrtho experience.
            </p>
            <Link
              href="/learn/settings"
              className="inline-block px-6 py-2 bg-sky text-white rounded-full font-semibold hover:bg-sky/90 transition"
            >
              Create My Profile
            </Link>
            <button
              className="block w-full text-sm text-midnight/60 mt-2 hover:underline"
              onClick={() => setShowPopup(false)}
            >
              Maybe later
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-navy">Learn Home</h1>
        <AccountDropdown />
      </div>

      {/* Intro */}
      <section className="bg-white p-8 md:p-10 rounded-2xl shadow-lg space-y-6">
        <h2 className="text-2xl md:text-3xl font-semibold text-navy">
          Welcome to SnapOrtho’s Learning Library
        </h2>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re building a comprehensive library of high-quality orthopaedics video
          tutorials, designed to take you from basics all the way to mastery.
        </p>
        <p className="text-base md:text-lg text-midnight/80 leading-relaxed">
          We’re kicking things off with our first series on{' '}
          <strong>Trauma</strong>. Stay tuned as we add more subspecialties, cases,
          and expert walkthroughs!
        </p>
      </section>

      {/* Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Link
          href="/learn/modules/trauma"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 1: Trauma</h3>
          <p className="text-sm text-midnight/70">
            Get started with orthopaedic trauma.
          </p>
        </Link>
        <Link
          href="/learn/modules/oncology"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 2: Oncology</h3>
          <p className="text-sm text-midnight/70">
            Review oncology before board exams.
          </p>
        </Link>
      </div>
    </main>
  );
}