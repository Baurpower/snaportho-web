'use client';

import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

type EntitlementStatus = {
  unlimited: boolean;
  source: string;
};

export default function AccountDropdown() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const supabase = useMemo(() => createClient(), []);

  const [menuOpen, setMenuOpen] = useState(false);
  const [fullName, setFullName] = useState<string | null>(null);
  const [entitlementStatus, setEntitlementStatus] = useState<EntitlementStatus | null>(null);
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

  // Fetch minimal BroBot entitlement status for menu (one small call per session)
  useEffect(() => {
    let isMounted = true;

    const fetchEntitlement = async () => {
      if (!user?.id) {
        if (isMounted) setEntitlementStatus(null);
        return;
      }

      try {
        const res = await fetch('/api/me/entitlements', {
          cache: 'no-store',
          credentials: 'include',
        });
        const body = await res.json();
        if (body.data?.aiAccess) {
          if (isMounted) {
            setEntitlementStatus({
              unlimited: body.data.aiAccess.unlimited,
              source: body.data.source,
            });
          }
        }
      } catch {
        if (isMounted) setEntitlementStatus(null);
      }
    };

    fetchEntitlement();

    return () => {
      isMounted = false;
    };
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
            href="/account/billing"
            className="block px-4 py-2 text-sm hover:bg-slate-100 text-midnight/90 font-medium"
          >
            Billing &amp; Subscription
          </Link>

          {entitlementStatus && (
            <div className="px-4 py-1 text-xs text-midnight/60">
              {entitlementStatus.unlimited ? (
                <span className="inline-block rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-700 text-[10px] font-medium">Unlimited BroBot</span>
              ) : (
                <span className="text-amber-600">Free BroBot</span>
              )}
            </div>
          )}

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
