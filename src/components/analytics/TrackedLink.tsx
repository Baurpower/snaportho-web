'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import {
  trackLandingStartTrialClick,
  trackLandingCtaConversion,
  trackPricingClick,
  trackTryBroBotFreeClick,
} from '@/lib/analytics/googleAds';

type TrackedLinkProps = ComponentProps<typeof Link> & {
  trackingEvent?:
    | 'brobot_landing_cta'
    | 'try_brobot_free_click'
    | 'pricing_click'
    | 'landing_start_trial_click';
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
        if (trackingEvent === 'try_brobot_free_click') {
          trackTryBroBotFreeClick();
        } else if (trackingEvent === 'pricing_click') {
          trackPricingClick();
        } else if (trackingEvent === 'landing_start_trial_click') {
          trackLandingStartTrialClick();
        } else if (trackingEvent === 'brobot_landing_cta') {
          trackLandingCtaConversion();
        }
        onClick?.(event);
      }}
    />
  );
}
