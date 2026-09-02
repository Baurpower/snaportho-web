import type { MarketingEmail, MarketingRecipient } from './types';

export async function sendMarketingEmail(params: { recipient: MarketingRecipient; email: MarketingEmail; unsubscribeUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MARKETING_FROM_EMAIL?.trim();
  if (!apiKey || !from) throw new Error('RESEND_API_KEY and MARKETING_FROM_EMAIL are required');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': `${params.recipient.userId}:${params.recipient.campaignKey}:${params.recipient.campaignStep}:${params.recipient.templateVersion}`,
    },
    body: JSON.stringify({
      from,
      to: [params.recipient.email],
      subject: params.email.subject,
      html: params.email.html,
      text: params.email.text,
      headers: {
        'List-Unsubscribe': `<${params.unsubscribeUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
      tags: [
        { name: 'campaign', value: params.recipient.campaignKey },
        { name: 'step', value: params.recipient.campaignStep },
        { name: 'topic', value: params.recipient.topic },
      ],
    }),
  });
  const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
  if (!response.ok || !body.id) throw new Error(body.message ?? `Resend failed with ${response.status}`);
  return { id: body.id };
}
