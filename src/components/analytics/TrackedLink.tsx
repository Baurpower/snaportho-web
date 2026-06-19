'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import { trackLandingCtaConversion } from '@/lib/analytics/googleAds';

type TrackedLinkProps = ComponentProps<typeof Link> & {
  trackingEvent?: 'brobot_landing_cta';
};

export default function TrackedLink({
  trackingEvent = 'brobot_landing_cta',
  onClick,
  ...props
}: TrackedLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        if (trackingEvent === 'brobot_landing_cta') {
          trackLandingCtaConversion();
        }
        onClick?.(event);
      }}
    />
  );
}
