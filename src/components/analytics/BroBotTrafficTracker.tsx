'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackProductEvent } from '@/lib/analytics/product-events-client';

export default function BroBotTrafficTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const event = pathname === '/brobot/pricing'
      ? 'brobot_pricing_viewed'
      : ['/brobot', '/brobot/chat', '/brobot/basic'].includes(pathname)
        ? 'brobot_opened'
        : pathname.startsWith('/brobot/landing')
          ? 'brobot_landing_viewed'
          : null;
    if (!event) return;
    trackProductEvent({ eventName: event, surface: `web:${pathname}` });
  }, [pathname]);

  return null;
}
