'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function AccountDropdown() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await signOut();
    router.replace('/auth/sign-in');
  };

  useEffect(() => {
    let isMounted = true;

    const fetchName = async () => {
      if (!user?.id) {
        if (isMounted) setFullName(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error('Error fetching full_name:', error);
        setFullName(null);
      } else {
        setFullName(data?.full_name || null);
      }
    };

    fetchName();

    return () => {
      isMounted = false;
    };
  }, [user, supabase]);

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
            type="button"
            onClick={handleLogout}
            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 text-red-600"
          >
            Log Out
          </button>
        </div>
      )}
    </div>
  );
}