'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AccountDropdown() {
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchName = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching full_name:', error);
      } else {
        setFullName(data?.full_name || null);
      }
    };
    fetchName();
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  return (
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
            <p className="font-medium text-navy">
              Signed in as {fullName ?? user.email}
            </p>
          </div>
          <hr className="border-slate-200" />
          <Link
            href="/learn/settings"
            className="block px-4 py-2 text-sm hover:bg-slate-100 text-midnight/90"
          >
            Profile
          </Link>
          <button
            onClick={signOut}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-red-600"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}
