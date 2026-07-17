'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

import { useAuth } from '@/context/AuthContext';
import { useBroBotEntitlement } from '@/hooks/useBroBotEntitlement';
import { trackGoogleAdsEvent } from '@/lib/analytics/googleAds';
import {
  BROBOT_HOME_POPUP_CAMPAIGN,
  BROBOT_HOME_POPUP_STORAGE_KEY,
  getBroBotPopupEntitlementTier,
  getBroBotPopupInfoDestination,
  getBroBotPopupPrimaryDestination,
  isBroBotPopupDismissed,
} from '@/lib/brobot/home-popup';

const FOCUSABLE_SELECTOR =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function deviceCategory() {
  return window.matchMedia('(max-width: 639px)').matches ? 'mobile' : 'desktop';
}

export default function BroBotHomePopup() {
  const { user, loading: authLoading } = useAuth();
  const entitlement = useBroBotEntitlement('brobot_home_popup');
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const impressionTrackedRef = useRef(false);

  const authState = user ? 'authenticated' : 'guest';
  const entitlementTier = getBroBotPopupEntitlementTier({
    authState,
    isUnlimited: entitlement.isUnlimited,
    entitlementLoaded: !entitlement.loading,
  });
  const primaryDestination = getBroBotPopupPrimaryDestination();
  const infoDestination = getBroBotPopupInfoDestination();

  const metadata = useCallback(
    (destinationCategory: 'brobot_workspace' | 'brobot_info' | 'dismissed') => ({
      authentication_state: authState,
      entitlement_tier: entitlementTier,
      device_category: deviceCategory(),
      campaign_version: BROBOT_HOME_POPUP_CAMPAIGN,
      destination_category: destinationCategory,
    }),
    [authState, entitlementTier]
  );

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(
        BROBOT_HOME_POPUP_STORAGE_KEY,
        BROBOT_HOME_POPUP_CAMPAIGN
      );
    } catch {
      // Best-effort persistence.
    }
    trackGoogleAdsEvent('brobot_home_popup_dismiss', metadata('dismissed'));
    setOpen(false);
    window.requestAnimationFrame(() => previousFocusRef.current?.focus());
  }, [metadata]);

  useEffect(() => {
    if (authLoading) return;

    let dismissed = false;
    try {
      dismissed = isBroBotPopupDismissed(
        window.localStorage.getItem(BROBOT_HOME_POPUP_STORAGE_KEY)
      );
    } catch {
      // Storage may be unavailable; the popup can still be dismissed for this render.
    }

    if (!dismissed) {
      previousFocusRef.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }
  }, [authLoading]);

  useEffect(() => {
    if (!open || impressionTrackedRef.current) return;
    if (authState === 'authenticated' && entitlement.loading) return;
    impressionTrackedRef.current = true;
    trackGoogleAdsEvent('brobot_home_popup_impression', metadata('brobot_workspace'));
  }, [authState, entitlement.loading, metadata, open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = dialogRef.current;
    const firstFocusable = dialog?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    firstFocusable?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        dismiss();
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;

      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [dismiss, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 px-4 py-5 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) dismiss();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="brobot-popup-title"
        aria-describedby="brobot-popup-description"
        className="relative max-h-[calc(100dvh-2.5rem)] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#090b1a] text-white shadow-2xl"
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(20,184,166,0.28),transparent_38%),radial-gradient(circle_at_90%_90%,rgba(126,184,255,0.18),transparent_36%)]" />
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/15 bg-white/10 p-2 text-white/80 transition hover:bg-white/20 hover:text-white focus:outline-none focus:ring-2 focus:ring-teal-300"
          aria-label="Dismiss BroBot promotion"
        >
          <XMarkIcon className="h-5 w-5" aria-hidden="true" />
        </button>

        <div className="relative p-6 sm:p-9">
          <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-white/10 shadow-lg">
            <Image src="/brologo.png" alt="" width={48} height={48} className="h-12 w-12 object-contain" />
          </div>
          <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-teal-300">
            Orthopaedics, on demand
          </p>
          <h2 id="brobot-popup-title" className="mt-2 text-3xl font-extrabold sm:text-4xl">
            Meet BroBot
          </h2>
          <p id="brobot-popup-description" className="mt-4 text-base leading-7 text-white/75 sm:text-lg">
            Get fast, clinically focused help for the OR, clinic, consults, OITE studying, and orthopaedic research.
          </p>

          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link
              href={primaryDestination}
              onClick={() =>
                trackGoogleAdsEvent(
                  'brobot_home_popup_primary_click',
                  metadata('brobot_workspace')
                )
              }
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full bg-teal-500 px-6 py-3 font-semibold text-slate-950 transition hover:bg-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-200"
            >
              Try BroBot
            </Link>
            <Link
              href={infoDestination}
              onClick={() =>
                trackGoogleAdsEvent(
                  'brobot_home_popup_learn_more_click',
                  metadata('brobot_info')
                )
              }
              className="inline-flex min-h-12 flex-1 items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-3 font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-white/70"
            >
              Learn More
            </Link>
          </div>
          <p className="mt-4 text-center text-xs text-white/50 sm:text-left">
            Guest access and a free daily quota are available.
          </p>
        </div>
      </div>
    </div>
  );
}
