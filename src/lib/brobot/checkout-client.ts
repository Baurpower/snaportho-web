'use client';

import {
  currentAttribution,
  trackProductEvent,
} from '@/lib/analytics/product-events-client';

export type WebsiteBroBotCheckoutParams = {
  interval: 'month' | 'year';
  isAuthenticated: boolean;
  returnTo?: string;
  checkoutSource: string;
  campaign?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmTerm?: string | null;
  utmContent?: string | null;
  gclid?: string | null;
  gbraid?: string | null;
  wbraid?: string | null;
};

export async function createWebsiteBroBotCheckout(params: WebsiteBroBotCheckoutParams) {
  const stored = currentAttribution();
  const attribution = {
    source: params.utmSource ?? stored.source,
    medium: params.utmMedium ?? stored.medium,
    campaign: params.utmCampaign ?? params.campaign ?? stored.campaign,
    utmTerm: params.utmTerm ?? stored.utmTerm,
    utmContent: params.utmContent ?? stored.utmContent,
    gclid: params.gclid ?? stored.gclid,
    gbraid: params.gbraid ?? stored.gbraid,
    wbraid: params.wbraid ?? stored.wbraid,
    branchClickId: stored.branchClickId,
  };
  trackProductEvent({
    eventName: 'brobot_checkout_started',
    surface: params.checkoutSource,
    productArea: 'billing',
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    branchClickId: attribution.branchClickId,
    properties: { interval: params.interval, trial_requested: true },
  });
  const endpoint = params.isAuthenticated
    ? '/api/billing/checkout'
    : '/api/billing/checkout/guest';

  const body = {
    interval: params.interval,
    returnTo: params.returnTo,
    source: params.checkoutSource,
    checkoutSource: params.checkoutSource,
    trialRequested: true,
    campaign: attribution.campaign,
    utm_source: attribution.source,
    utm_medium: attribution.medium,
    utm_campaign: attribution.campaign,
    utm_term: attribution.utmTerm,
    utm_content: attribution.utmContent,
    gclid: attribution.gclid,
    gbraid: attribution.gbraid,
    wbraid: attribution.wbraid,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const parsed = await response.json();

  if (!response.ok && parsed?.error) {
    throw new Error(parsed.error);
  }

  return parsed as {
    url?: string;
    portalUrl?: string;
    error?: string;
    alreadySubscribed?: boolean;
  };
}
