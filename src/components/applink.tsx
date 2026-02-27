'use client';

import React from 'react';
import Link from 'next/link';
import SmartDeepLink from './smartdeeplink';

type Props = {
  href: string;
  className?: string;
  children: React.ReactNode;
  fallbackDelayMs?: number;
};

function isDeepLink(href: string) {
  return href.startsWith('snaportho://');
}

export default function AppLink({ href, className, children, fallbackDelayMs }: Props) {
  if (isDeepLink(href)) {
    return (
      <SmartDeepLink deepLink={href} className={className} fallbackDelayMs={fallbackDelayMs}>
        {children}
      </SmartDeepLink>
    );
  }

  // Normal web route
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}