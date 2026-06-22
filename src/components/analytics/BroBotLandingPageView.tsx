'use client';

import { useEffect } from 'react';

import { trackBroBotLandingPageView } from '@/lib/analytics/googleAds';

export default function BroBotLandingPageView() {
  useEffect(() => {
    trackBroBotLandingPageView();
  }, []);

  return null;
}
