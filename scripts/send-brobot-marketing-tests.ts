import { CAMPAIGN_STEPS, type MarketingRecipient } from '../src/lib/marketing/types';
import { CAMPAIGN_CONFIG } from '../src/lib/marketing/segments';
import { renderMarketingEmail } from '../src/lib/marketing/templates';
import { sendMarketingEmail } from '../src/lib/marketing/resend';
import { getAppBaseUrl } from '../src/lib/config/app-url';
import { verifyMarketingDestinations } from '../src/lib/marketing/link-preflight';

function argument(name: string) {
  return process.argv.slice(2).find((value) => value.startsWith(`--${name}=`))?.slice(name.length + 3);
}

async function main() {
  const to = argument('to')?.trim().toLowerCase();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) throw new Error('A valid --to=email address is required');
  if (argument('confirm') !== 'SEND-MARKETING-TESTS') throw new Error('Pass --confirm=SEND-MARKETING-TESTS');
  await verifyMarketingDestinations(getAppBaseUrl());
  const runId = `test-${Date.now()}`;
  const results: { step: string; id: string }[] = [];

  for (const campaignStep of CAMPAIGN_STEPS) {
    const config = CAMPAIGN_CONFIG[campaignStep];
    const recipient: MarketingRecipient = {
      userId: '00000000-0000-0000-0000-000000000000',
      email: to,
      firstName: 'Becca',
      campaignStep,
      campaignKey: `test_${config.campaignKey}`,
      topic: config.topic,
      templateVersion: runId,
    };
    const rendered = renderMarketingEmail(recipient);
    rendered.subject = `[TEST: ${campaignStep}] ${rendered.subject}`;
    const sent = await sendMarketingEmail({ recipient, email: rendered, unsubscribeUrl: rendered.unsubscribeUrl });
    results.push({ step: campaignStep, id: sent.id });
    console.log(JSON.stringify({ step: campaignStep, id: sent.id, status: 'sent' }));
    // Space requests to avoid Resend's per-second rate limit.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log(JSON.stringify({ recipient: to, sent: results.length, results }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
