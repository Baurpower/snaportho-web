'use client';

import React from 'react';

const APP_STORE_URL = 'https://apps.apple.com/app/id6742800145';
const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.snaportho.app';
const DESKTOP_URL = '/mobile-app';

type Props = React.PropsWithChildren<{
  deepLink: string;              // e.g. snaportho://brobot
  className?: string;
  fallbackUrl?: string;          // optional override (otherwise store URL chosen by platform)
  fallbackDelayMs?: number;      // default ~1200ms
}>;

function getPlatform() {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator.platform || '') : '';
  const maxTouchPoints = typeof navigator !== 'undefined' ? (navigator.maxTouchPoints || 0) : 0;

  const isAndroid = /Android/i.test(ua);

  // iOS detection (covers iPhone/iPad/iPod)
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  // iPadOS 13+ can report as MacIntel but has touch
  const isIPadOS = platform === 'MacIntel' && maxTouchPoints > 1;

  const isAppleMobile = isIOS || isIPadOS;

  // Desktop = not Android and not Apple mobile
  const isDesktop = !isAndroid && !isAppleMobile;

  return { isAndroid, isAppleMobile, isDesktop };
}

export default function SmartDeepLink({
  deepLink,
  className,
  children,
  fallbackUrl,
  fallbackDelayMs = 1200,
}: Props) {
  const onClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const { isAndroid, isDesktop } = getPlatform();

    // Desktop: don't try custom scheme; send to landing page
    if (isDesktop) {
      window.location.href = DESKTOP_URL;
      return;
    }

    // Choose store URL by platform (unless overridden)
    const storeUrl = fallbackUrl ?? (isAndroid ? PLAY_STORE_URL : APP_STORE_URL);

    let didHide = false;
    const start = Date.now();

    const cleanup = () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onHide);
      window.removeEventListener('blur', onBlur);
    };

    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        didHide = true;
        cleanup();
      }
    };

    const onHide = () => {
      didHide = true;
      cleanup();
    };

    const onBlur = () => {
      didHide = true;
      cleanup();
    };

    // If the app opens, Safari typically becomes hidden / pagehide / blur
    document.addEventListener('visibilitychange', onVis, { passive: true });
    window.addEventListener('pagehide', onHide, { passive: true });
    window.addEventListener('blur', onBlur, { passive: true });

    const timer = window.setTimeout(() => {
      cleanup();

      // ✅ If we actually backgrounded, assume app opened; don't fallback
      if (didHide) return;

      // ✅ Guard against ultra-fast weirdness
      if (Date.now() - start < 600) return;

      window.location.href = storeUrl;
    }, fallbackDelayMs);

    // Try to open the app
    window.location.href = deepLink;

    // Safety: if page is going away, clear timer
    window.addEventListener(
      'pagehide',
      () => window.clearTimeout(timer),
      { once: true }
    );
  };

  return (
    <a href={deepLink} onClick={onClick} className={className}>
      {children}
    </a>
  );
}