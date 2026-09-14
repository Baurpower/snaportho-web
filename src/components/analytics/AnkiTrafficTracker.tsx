'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackProductEvent } from '@/lib/analytics/product-events-client';

export default function AnkiTrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname !== '/anki') return;
    trackProductEvent({
      eventName: 'anki_landing_viewed',
      surface: 'web:/anki',
      productArea: 'anki',
    });
  }, [pathname]);

  return null;
}
