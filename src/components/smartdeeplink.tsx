'use client';

import React from 'react';

const APP_STORE_URL = "https://apps.apple.com/app/id6742800145";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.snaportho.app";
const DESKTOP_URL = "/mobile-app";

type Props = {
  deepLink: string;              // e.g. "snaportho://practice"
  className?: string;
  children: React.ReactNode;
  fallbackDelayMs?: number;      // how long to wait before falling back
};

function getPlatform() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || '') : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0;

  const isAndroid = /Android/i.test(ua);

  // iOS detection (covers most iPhones/iPads)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // iPadOS 13+ sometimes reports as "MacIntel" but has touch points
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;

  const isAppleMobile = isIOS || isIPadOS;

  // Desktop = not Android and not AppleMobile
  const isDesktop = !isAndroid && !isAppleMobile;

  return { isAndroid, isAppleMobile, isDesktop };
}

export default function SmartDeepLink({
  deepLink,
  className,
  children,
  fallbackDelayMs = 900,
}: Props) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const { isAndroid, isDesktop } = getPlatform();

    // On desktop: don’t try custom scheme, send to your landing page (or store)
    if (isDesktop) {
      window.location.href = DESKTOP_URL || APP_STORE_URL;
      return;
    }

    // Mobile fallback store URL
    const storeUrl = isAndroid ? PLAY_STORE_URL : APP_STORE_URL;

    // Mobile: try deep link, then fallback if not installed
    const start = Date.now();
    let didHide = false;

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') didHide = true;
    };

    document.addEventListener('visibilitychange', onVisibility);

    // Attempt open
    window.location.href = deepLink;

    // Fallback to store if it didn't open
    window.setTimeout(() => {
      document.removeEventListener('visibilitychange', onVisibility);

      const elapsed = Date.now() - start;
      if (!didHide && elapsed >= 250) {
        window.location.href = storeUrl;
      }
    }, fallbackDelayMs);
  };

  return (
    <a href={deepLink} onClick={onClick} className={className}>
      {children}
    </a>
  );
}