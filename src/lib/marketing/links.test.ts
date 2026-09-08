import assert from 'node:assert/strict';
import { BRANCH_CAMPAIGN_STEPS, isMarketingAppPath, campaignWebUrl, isBrobotCampaignEntry, marketingActionUrl, marketingWebUrl } from './links';
import { CAMPAIGN_STEPS } from './types';
import { CAMPAIGN_CONFIG } from './segments';
import { renderMarketingEmail } from './templates';
import { verifyMarketingDestinations } from './link-preflight';

process.env.NEXT_PUBLIC_SITE_URL = 'https://snap-ortho.com';
process.env.MARKETING_PREFERENCES_SECRET = 'test-secret-for-marketing-links-only-123456';
process.env.MARKETING_POSTAL_ADDRESS = 'Test postal address';
for (const step of BRANCH_CAMPAIGN_STEPS) {
  process.env[`MARKETING_BRANCH_${step.toUpperCase()}_URL`] = `https://kcyz1.test.app.link/${step}`;
}

for (const step of CAMPAIGN_STEPS) {
  const action = new URL(marketingActionUrl(step, 'https://snap-ortho.com'));
  const web = new URL(marketingWebUrl(step, 'https://snap-ortho.com'));
  assert.equal(web.searchParams.get('utm_content'), step);
  assert.equal(web.searchParams.get('utm_campaign'), CAMPAIGN_CONFIG[step].campaignKey);
  assert.equal(web.searchParams.get('utm_source'), BRANCH_CAMPAIGN_STEPS.includes(step as (typeof BRANCH_CAMPAIGN_STEPS)[number]) ? 'branch' : 'resend');

  if (BRANCH_CAMPAIGN_STEPS.includes(step as (typeof BRANCH_CAMPAIGN_STEPS)[number])) {
    assert.equal(action.hostname, 'kcyz1.test.app.link');
    assert.equal(web.pathname, '/brobot/chat');
    assert.equal(isBrobotCampaignEntry(Object.fromEntries(web.searchParams)), true);
  } else if (step === 'profile_completion_1') {
    assert.equal(action.pathname, '/account/profile');
    assert.equal(web.pathname, '/account/profile');
  } else {
    assert.equal(action.pathname, '/brobot/pricing');
    assert.equal(web.pathname, '/brobot/pricing');
  }

  const rendered = renderMarketingEmail({
    userId: '00000000-0000-0000-0000-000000000000',
    email: 'test@example.com', firstName: '<Becca>', campaignStep: step,
    ...CAMPAIGN_CONFIG[step],
  });
  assert.ok(rendered.html.includes(action.toString().replaceAll('&', '&amp;')));
  assert.ok(rendered.text.includes(action.toString()));
  assert.ok(rendered.html.includes(web.toString().replaceAll('&', '&amp;')));
  assert.ok(!action.toString().includes('test@example.com'));
  assert.ok(!action.toString().includes('00000000-0000-0000-0000-000000000000'));
  assert.ok(rendered.html.includes(step === 'profile_completion_1' || step === 'conversion_1' ? 'Continue on the website' : 'Open Chat on the website'));
  assert.ok(!rendered.html.includes('/app/brobot/chat?'));
  assert.ok(!rendered.html.includes('/app/account/profile?'));
  assert.ok(!rendered.html.includes('/app/brobot/pricing?'));
  assert.ok(rendered.html.includes('Hi &lt;Becca&gt;,'));
  assert.ok(!rendered.html.includes('/work/profile'));
}

assert.equal(isBrobotCampaignEntry({}), false);
assert.equal(isBrobotCampaignEntry({ utm_source: 'resend', utm_medium: 'email', utm_campaign: 'unknown' }), false);
assert.equal(campaignWebUrl(new URL('https://snap-ortho.com/app/brobot/guest')).pathname, '/brobot/chat');
assert.equal(isMarketingAppPath('/app/admin'), false);
assert.equal(isMarketingAppPath('/app/account/profile/other'), false);
assert.throws(() => campaignWebUrl(new URL('https://snap-ortho.com/app/unknown')));

const readyFetch: typeof fetch = async (input) => {
  const url = new URL(String(input));
  if (url.hostname.endsWith('.app.link')) {
    const step = url.pathname.slice(1) as (typeof CAMPAIGN_STEPS)[number];
    return new Response(null, {status: 302, headers: {location: marketingWebUrl(step, 'https://snap-ortho.com')}});
  }
  return isMarketingAppPath(url.pathname)
    ? new Response(null, {status: 307, headers: {location: campaignWebUrl(url).href}})
    : new Response(null, {status: 200});
};
await verifyMarketingDestinations('https://snap-ortho.com', readyFetch);
await assert.rejects(() => verifyMarketingDestinations('https://snap-ortho.com', async () => new Response(null, { status: 404 })), /not ready/);
console.log('Branch campaign links, direct web fallbacks, attribution, rendering, privacy, and preflight passed.');
