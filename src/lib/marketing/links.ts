import { CAMPAIGN_CONFIG } from './segments';
import type { CampaignStep } from './types';

// This route is already understood by the iOS app. The website handles it
// when the app is not installed or the email client opens an embedded browser.
export const BROBOT_CAMPAIGN_APP_PATH = '/app/brobot/guest';

export function isBrobotCampaignEntry(params: { utm_source?: string; utm_medium?: string; utm_campaign?: string }): boolean {
  return params.utm_source === 'resend' && params.utm_medium === 'email' &&
    Object.values(CAMPAIGN_CONFIG).some((config) => config.campaignKey === params.utm_campaign);
}

export function marketingActionUrl(step: CampaignStep, base: string): string {
  const path = step === 'profile_completion_1'
    ? '/account/profile'
    : step === 'conversion_1'
      ? '/brobot/pricing'
      : BROBOT_CAMPAIGN_APP_PATH;
  const url = new URL(path, base);
  url.searchParams.set('utm_source', 'resend');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', CAMPAIGN_CONFIG[step].campaignKey);
  url.searchParams.set('utm_content', step);
  return url.toString();
}

export function brobotCampaignWebUrl(incoming: URL): URL {
  const destination = new URL('/brobot/chat', incoming.origin);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = incoming.searchParams.get(key);
    if (value) destination.searchParams.set(key, value);
  }
  return destination;
}
