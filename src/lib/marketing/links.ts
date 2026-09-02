import { CAMPAIGN_CONFIG } from './segments';
import type { CampaignStep } from './types';

export const BROBOT_CAMPAIGN_APP_PATH = '/app/brobot/chat';
export const PROFILE_CAMPAIGN_APP_PATH = '/app/account/profile';
export const PRICING_CAMPAIGN_APP_PATH = '/app/brobot/pricing';

const WEB_DESTINATIONS: Record<string, string> = {
  [BROBOT_CAMPAIGN_APP_PATH]: '/brobot/chat',
  [PROFILE_CAMPAIGN_APP_PATH]: '/account/profile',
  [PRICING_CAMPAIGN_APP_PATH]: '/brobot/pricing',
  // Preserve emails sent before explicit Chat routing was added.
  '/app/brobot/guest': '/brobot/chat',
};

export function isMarketingAppPath(pathname: string): boolean {
  return Object.hasOwn(WEB_DESTINATIONS, pathname);
}

export function isBrobotCampaignEntry(params: { utm_source?: string; utm_medium?: string; utm_campaign?: string }): boolean {
  return params.utm_source === 'resend' && params.utm_medium === 'email' &&
    Object.values(CAMPAIGN_CONFIG).some((config) => config.campaignKey === params.utm_campaign);
}

export function marketingActionUrl(step: CampaignStep, base: string): string {
  const path = step === 'profile_completion_1'
    ? PROFILE_CAMPAIGN_APP_PATH
    : step === 'conversion_1'
      ? PRICING_CAMPAIGN_APP_PATH
      : BROBOT_CAMPAIGN_APP_PATH;
  const url = new URL(path, base);
  url.searchParams.set('utm_source', 'resend');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', CAMPAIGN_CONFIG[step].campaignKey);
  url.searchParams.set('utm_content', step);
  return url.toString();
}

export function campaignWebUrl(incoming: URL): URL {
  if (!isMarketingAppPath(incoming.pathname)) throw new Error('Unknown campaign destination');
  const destination = new URL(WEB_DESTINATIONS[incoming.pathname], incoming.origin);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = incoming.searchParams.get(key);
    if (value) destination.searchParams.set(key, value);
  }
  return destination;
}
