import { CAMPAIGN_CONFIG } from './segments';
import type { CampaignStep } from './types';

export const BROBOT_CAMPAIGN_APP_PATH = '/app/brobot/guest';
export const PROFILE_CAMPAIGN_WEB_PATH = '/account/profile';
export const PRICING_CAMPAIGN_WEB_PATH = '/brobot/pricing';

const WEB_DESTINATIONS: Record<string, string> = {
  [BROBOT_CAMPAIGN_APP_PATH]: '/brobot/chat',
  [PROFILE_CAMPAIGN_WEB_PATH]: '/account/profile',
  [PRICING_CAMPAIGN_WEB_PATH]: '/brobot/pricing',
  // Retain browser fallbacks for earlier test emails, but never generate
  // these unsupported native routes in new messages.
  '/app/brobot/chat': '/brobot/chat',
  '/app/account/profile': '/account/profile',
  '/app/brobot/pricing': '/brobot/pricing',
};

export function isMarketingAppPath(pathname: string): boolean {
  return pathname.startsWith('/app/') && Object.hasOwn(WEB_DESTINATIONS, pathname);
}

export function isBrobotCampaignEntry(params: { utm_source?: string; utm_medium?: string; utm_campaign?: string }): boolean {
  return params.utm_source === 'resend' && params.utm_medium === 'email' &&
    Object.values(CAMPAIGN_CONFIG).some((config) => config.campaignKey === params.utm_campaign);
}

export function marketingActionUrl(step: CampaignStep, base: string): string {
  const path = step === 'profile_completion_1'
    ? PROFILE_CAMPAIGN_WEB_PATH
    : step === 'conversion_1'
      ? PRICING_CAMPAIGN_WEB_PATH
      : BROBOT_CAMPAIGN_APP_PATH;
  const url = new URL(path, base);
  url.searchParams.set('utm_source', 'resend');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', CAMPAIGN_CONFIG[step].campaignKey);
  url.searchParams.set('utm_content', step);
  return url.toString();
}

export function campaignWebUrl(incoming: URL): URL {
  if (!Object.hasOwn(WEB_DESTINATIONS, incoming.pathname)) throw new Error('Unknown campaign destination');
  const destination = new URL(WEB_DESTINATIONS[incoming.pathname], incoming.origin);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content']) {
    const value = incoming.searchParams.get(key);
    if (value) destination.searchParams.set(key, value);
  }
  return destination;
}
