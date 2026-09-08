import { CAMPAIGN_CONFIG } from './segments';
import type { CampaignStep } from './types';

export const BROBOT_CAMPAIGN_APP_PATH = '/app/brobot/guest';
export const PROFILE_CAMPAIGN_WEB_PATH = '/account/profile';
export const PRICING_CAMPAIGN_WEB_PATH = '/brobot/pricing';

export const BRANCH_CAMPAIGN_STEPS = [
  'activation_1', 'activation_2', 'activation_3',
  'habit_1', 'habit_2', 'reengagement_1',
] as const satisfies readonly CampaignStep[];

const BRANCH_ENV_KEYS: Partial<Record<CampaignStep, string>> = {
  activation_1: 'MARKETING_BRANCH_ACTIVATION_1_URL',
  activation_2: 'MARKETING_BRANCH_ACTIVATION_2_URL',
  activation_3: 'MARKETING_BRANCH_ACTIVATION_3_URL',
  habit_1: 'MARKETING_BRANCH_HABIT_1_URL',
  habit_2: 'MARKETING_BRANCH_HABIT_2_URL',
  reengagement_1: 'MARKETING_BRANCH_REENGAGEMENT_1_URL',
};

const APPROVED_BRANCH_HOSTS = new Set([
  'kcyz1.app.link',
  'kcyz1-alternate.app.link',
  'kcyz1.test.app.link',
]);

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
  return (params.utm_source === 'resend' || params.utm_source === 'branch') && params.utm_medium === 'email' &&
    Object.values(CAMPAIGN_CONFIG).some((config) => config.campaignKey === params.utm_campaign);
}

export function marketingWebUrl(step: CampaignStep, base: string): string {
  const path = step === 'profile_completion_1'
    ? PROFILE_CAMPAIGN_WEB_PATH
    : step === 'conversion_1'
      ? PRICING_CAMPAIGN_WEB_PATH
      : '/brobot/chat';
  const url = new URL(path, base);
  url.searchParams.set('utm_source', BRANCH_CAMPAIGN_STEPS.includes(step as (typeof BRANCH_CAMPAIGN_STEPS)[number]) ? 'branch' : 'resend');
  url.searchParams.set('utm_medium', 'email');
  url.searchParams.set('utm_campaign', CAMPAIGN_CONFIG[step].campaignKey);
  url.searchParams.set('utm_content', step);
  return url.toString();
}

export function configuredBranchUrl(step: CampaignStep): string | null {
  const key = BRANCH_ENV_KEYS[step];
  if (!key) return null;
  const value = process.env[key]?.trim();
  if (!value) return null;
  const url = new URL(value);
  if (url.protocol !== 'https:' || !APPROVED_BRANCH_HOSTS.has(url.hostname)) {
    throw new Error(`${key} must use an approved SnapOrtho Branch HTTPS domain`);
  }
  return url.toString();
}

export function marketingActionUrl(step: CampaignStep, base: string): string {
  const branchUrl = configuredBranchUrl(step);
  if (branchUrl) return branchUrl;
  if (BRANCH_CAMPAIGN_STEPS.includes(step as (typeof BRANCH_CAMPAIGN_STEPS)[number]) &&
      (process.env.NODE_ENV === 'production' || process.env.BROBOT_MARKETING_SEND_ENABLED === 'true')) {
    throw new Error(`Missing Branch link for ${step}`);
  }
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
