import { campaignWebUrl, isMarketingAppPath, marketingActionUrl } from './links';
import type { CampaignStep } from './types';

export async function verifyMarketingDestinations(base: string, request: typeof fetch = fetch) {
  for (const step of ['activation_1', 'profile_completion_1', 'conversion_1'] as CampaignStep[]) {
    const action = new URL(marketingActionUrl(step, base));
    const expected = campaignWebUrl(action);
    const response = await request(action, { redirect: 'manual', signal: AbortSignal.timeout(15_000) });
    const location = response.headers.get('location');
    const actual = location ? new URL(location, action) : null;
    const redirects = [301, 302, 303, 307, 308].includes(response.status);
    const correctFallback = redirects && actual?.href === expected.href;
    const profileSignIn = action.pathname === '/account/profile' && redirects &&
      actual?.origin === action.origin && actual.pathname === '/auth/sign-in' &&
      actual.searchParams.get('redirectTo') === action.pathname + action.search;
    const ready = isMarketingAppPath(action.pathname)
      ? correctFallback
      : response.status === 200 || correctFallback || profileSignIn;
    if (!ready) {
      throw new Error(`Campaign link is not ready: ${action.pathname} returned ${response.status}. Deploy the website fallback before sending tests.`);
    }
  }
}
