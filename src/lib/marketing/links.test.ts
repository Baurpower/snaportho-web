import assert from 'node:assert/strict';
import { isMarketingAppPath, campaignWebUrl, isBrobotCampaignEntry, marketingActionUrl } from './links';
import { CAMPAIGN_STEPS } from './types';
import { CAMPAIGN_CONFIG } from './segments';
import { renderMarketingEmail } from './templates';
import { verifyMarketingDestinations } from './link-preflight';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';
process.env.MARKETING_PREFERENCES_SECRET = 'test-secret-for-marketing-links-only-123456';
process.env.MARKETING_POSTAL_ADDRESS = 'Test postal address';

for (const step of CAMPAIGN_STEPS) {
  const action = new URL(marketingActionUrl(step, 'https://snap-ortho.com'));
  assert.equal(action.searchParams.get('utm_content'), step);
  assert.equal(action.searchParams.get('utm_campaign'), CAMPAIGN_CONFIG[step].campaignKey);
  if (step === 'profile_completion_1') {
    assert.equal(action.pathname, '/app/account/profile');
    assert.equal(campaignWebUrl(action).pathname, '/account/profile');
  } else if (step === 'conversion_1') {
    assert.equal(action.pathname, '/app/brobot/pricing');
    assert.equal(campaignWebUrl(action).pathname, '/brobot/pricing');
  } else {
    assert.equal(action.pathname, '/app/brobot/chat');
    action.searchParams.set('redirectTo', 'https://attacker.example');
    const fallback = campaignWebUrl(action);
    assert.equal(fallback.origin, action.origin);
    assert.equal(fallback.pathname, '/brobot/chat');
    assert.equal(fallback.searchParams.has('redirectTo'), false);
    assert.equal(fallback.searchParams.get('utm_content'), step);
    assert.equal(isBrobotCampaignEntry(Object.fromEntries(fallback.searchParams)), true);
  }

  const rendered = renderMarketingEmail({
    userId: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com', firstName: '<Becca>', campaignStep: step,
    ...CAMPAIGN_CONFIG[step],
  });
  const expected = marketingActionUrl(step, 'https://snap-ortho.com');
  assert.ok(rendered.html.includes(expected.replaceAll('&', '&amp;')));
  assert.ok(rendered.text.includes(expected));
  assert.ok(rendered.html.includes(campaignWebUrl(new URL(expected)).toString().replaceAll('&', '&amp;')));
  assert.ok(rendered.html.includes('Continue on the website'));
  assert.equal(isMarketingAppPath(action.pathname), true);
  assert.ok(rendered.html.includes('Hi &lt;Becca&gt;,'));
  assert.ok(!rendered.html.includes('/work/profile'));
}
assert.equal(isBrobotCampaignEntry({}), false);
assert.equal(isBrobotCampaignEntry({ utm_source: 'resend', utm_medium: 'email', utm_campaign: 'unknown' }), false);

assert.equal(campaignWebUrl(new URL('https://snap-ortho.com/app/brobot/guest')).pathname, '/brobot/chat');
assert.equal(isMarketingAppPath('/app/admin'), false);
assert.equal(isMarketingAppPath('/app/account/profile/other'), false);
assert.throws(() => campaignWebUrl(new URL('https://snap-ortho.com/app/unknown')));

const readyFetch: typeof fetch = async (input) => new Response(null, {
  status: 307, headers: { location: campaignWebUrl(new URL(String(input))).href },
});
await verifyMarketingDestinations('https://snap-ortho.com', readyFetch);
await assert.rejects(() => verifyMarketingDestinations('https://snap-ortho.com', async () => new Response(null, { status: 404 })), /not ready/);
await assert.rejects(() => verifyMarketingDestinations('https://snap-ortho.com', async () => new Response(null, { status: 307, headers: { location: '/auth/sign-in' } })), /not ready/);
console.log('Campaign destinations, web fallback, attribution, rendered links, and send preflight passed.');
