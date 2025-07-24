'use client';

import Link from 'next/link';
import { useAuth } from '../../context/AuthContext';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient'; // this is the pre-configured client

export default function LearnMember() {
  const { user } = useAuth();

  const [fullName, setFullName] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Fetch full_name from user_profiles table
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setFullName(data.full_name);
      }
    };

    fetchUserProfile();
  }, [user]);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <main className="max-w-4xl mx-auto px-6 pt-24 pb-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold text-navy">Learn Home</h1>

        {/* Account Dropdown */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            className="text-sm px-4 py-2 bg-sky text-white rounded-full hover:bg-sky/90 transition"
          >
            Account
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white shadow-lg rounded-xl overflow-hidden z-10 border border-slate-200">
              <div className="px-4 py-3 text-sm text-midnight/80">
                {fullName ? (
                  <p className="font-medium text-navy">Signed in as {fullName}</p>
                ) : (
                  <p className="italic text-gray-500">Loading profile...</p>
                )}
              </div>
              <hr className="border-slate-200" />
              <Link
                href="/learn/settings"
                className="block px-4 py-2 text-sm hover:bg-slate-100 text-midnight/90"
              >
                Profile Settings
              </Link>
              <Link
                href="/auth/update-password"
                className="block px-4 py-2 text-sm hover:bg-slate-100 text-midnight/90"
              >
                Update Password
              </Link>
              <Link
                href="/auth/delete-account"
                className="block px-4 py-2 text-sm hover:bg-slate-100 text-red-600"
              >
                Delete Account
              </Link>
            </div>
          )}
        </div>
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
          We’re kicking things off with our first series on <strong>Trauma</strong>.
          Stay tuned as we add more subspecialties, cases, and expert walkthroughs!
        </p>
      </section>

      {/* Modules */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
        <Link
          href="/learn/modules/trauma"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 1: Trauma</h3>
          <p className="text-sm text-midnight/70">Get started with orthopaedic trauma.</p>
        </Link>
        <Link
          href="/learn/modules/oncology"
          className="block p-6 bg-white rounded-2xl shadow hover:shadow-lg transition"
        >
          <h3 className="text-xl font-semibold mb-1">Module 2: Oncology</h3>
          <p className="text-sm text-midnight/70">Review oncology before board exams.</p>
        </Link>
      </div>
    </main>
  );
}
