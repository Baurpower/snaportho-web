'use client';

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
};

export async function createWebsiteBroBotCheckout(params: WebsiteBroBotCheckoutParams) {
  const endpoint = params.isAuthenticated
    ? '/api/billing/checkout'
    : '/api/billing/checkout/guest';

  const body = params.isAuthenticated
    ? {
        interval: params.interval,
        returnTo: params.returnTo,
        trialRequested: true,
        checkoutSource: params.checkoutSource,
      }
    : {
        interval: params.interval,
        source: params.checkoutSource,
        checkoutSource: params.checkoutSource,
        trialRequested: true,
        campaign: params.campaign ?? null,
        utm_source: params.utmSource ?? null,
        utm_medium: params.utmMedium ?? null,
        utm_campaign: params.utmCampaign ?? null,
        utm_term: params.utmTerm ?? null,
        utm_content: params.utmContent ?? null,
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
