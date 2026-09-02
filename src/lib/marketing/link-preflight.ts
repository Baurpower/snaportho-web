import { campaignWebUrl, marketingActionUrl } from './links';
import type { CampaignStep } from './types';

export async function verifyMarketingDestinations(base: string, request: typeof fetch = fetch) {
  for (const step of ['activation_1', 'profile_completion_1', 'conversion_1'] as CampaignStep[]) {
    const action = new URL(marketingActionUrl(step, base));
    const expected = campaignWebUrl(action);
    const response = await request(action, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const location = response.headers.get('location');
    const actual = location ? new URL(location, action) : null;
    if (![301, 302, 303, 307, 308].includes(response.status) || actual?.href !== expected.href) {
      throw new Error(`Campaign link is not ready: ${action.pathname} returned ${response.status}. Deploy the website fallback before sending tests.`);
    }
  }
}
