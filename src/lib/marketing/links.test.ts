import assert from 'node:assert/strict';
import { brobotCampaignWebUrl, isBrobotCampaignEntry, marketingActionUrl } from './links';
import { CAMPAIGN_STEPS } from './types';
import { CAMPAIGN_CONFIG } from './segments';
import { renderMarketingEmail } from './templates';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';
process.env.MARKETING_PREFERENCES_SECRET = 'test-secret-for-marketing-links-only-123456';
process.env.MARKETING_POSTAL_ADDRESS = 'Test postal address';

for (const step of CAMPAIGN_STEPS) {
  const action = new URL(marketingActionUrl(step, 'https://snap-ortho.com'));
  assert.equal(action.searchParams.get('utm_content'), step);
  assert.equal(action.searchParams.get('utm_campaign'), CAMPAIGN_CONFIG[step].campaignKey);
  if (step === 'profile_completion_1') {
    assert.equal(action.pathname, '/account/profile');
  } else if (step === 'conversion_1') {
    assert.equal(action.pathname, '/brobot/pricing');
  } else {
    assert.equal(action.pathname, '/app/brobot/guest');
    action.searchParams.set('redirectTo', 'https://attacker.example');
    const fallback = brobotCampaignWebUrl(action);
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
  assert.ok(rendered.html.includes('Hi &lt;Becca&gt;,'));
  assert.ok(!rendered.html.includes('/work/profile'));
}
assert.equal(isBrobotCampaignEntry({}), false);
assert.equal(isBrobotCampaignEntry({ utm_source: 'resend', utm_medium: 'email', utm_campaign: 'unknown' }), false);
console.log('Campaign destinations, web fallback, attribution, and rendered links passed.');
