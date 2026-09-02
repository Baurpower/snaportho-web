import { marketingActionUrl } from './links';
import { getAppBaseUrl } from '@/lib/config/app-url';
import { createMarketingPreferenceToken } from './preferences-token';
import type { CampaignStep, MarketingEmail, MarketingRecipient } from './types';

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const COPY: Record<CampaignStep, { subject: string; title: string; paragraphs: string[]; cta: string }> = {
  activation_1: { subject: 'A quick way to review before your next case', title: 'Start with one question', paragraphs: ['Preparing for a case? Ask BroBot to walk you through the approach.', 'Try: “What anatomy should I review before a posterior approach to the hip?”', 'Open BroBot and try a question before signing in.'], cta: 'Ask BroBot' },
  activation_2: { subject: 'Three ways to use BroBot this week', title: 'A useful starting point for BroBot', paragraphs: ['Review an approach before a case.', 'Quiz yourself on a classification.', 'Ask for a concise explanation of a difficult orthopedic concept.'], cta: 'Try a question' },
  activation_3: { subject: 'A quick anatomy question to try', title: 'Review one thing before your next case', paragraphs: ['Try asking BroBot: “Which nerves are at risk in a posterior approach to the hip?”', 'Then ask a follow-up about anything you want to understand better.'], cta: 'Open BroBot' },
  habit_1: { subject: 'BroBot can do more than answer questions', title: 'Keep learning with BroBot', paragraphs: ['Use BroBot for case preparation, anatomy and surgical approaches, exam review, and focused follow-up questions.'], cta: 'Continue with BroBot' },
  habit_2: { subject: 'Turn a topic into a quick quiz', title: 'Test what you remember', paragraphs: ['Pick a topic you recently studied and ask BroBot to quiz you.', 'Try: “Quiz me on the Garden classification of femoral neck fractures. Ask one question at a time.”', 'Answer in your own words, then ask BroBot to explain anything you missed.'], cta: 'Ask BroBot' },
  conversion_1: { subject: 'Keep using BroBot without the limit', title: 'Unlock Unlimited BroBot', paragraphs: ['Want more time for case prep and follow-up questions?', 'Unlimited BroBot removes the free daily question limit.', 'A full year is $29.99.'], cta: 'Unlock Unlimited BroBot' },
  profile_completion_1: { subject: 'Make SnapOrtho more relevant to your training', title: 'Personalize your SnapOrtho experience', paragraphs: ['Tell us your training level and orthopedic interests so SnapOrtho can show more relevant learning tools and BroBot starting points.'], cta: 'Complete my profile' },
  reengagement_1: { subject: 'Something from rounds you want to review?', title: 'Start with a question from today', paragraphs: ['Bring BroBot a term, classification, or approach you want to understand better.', 'Try: “Explain the Weber ankle fracture classification in simple terms.”', 'You can try a question before signing in.'], cta: 'Return to BroBot' },
};

export function renderMarketingEmail(recipient: MarketingRecipient): MarketingEmail & { unsubscribeUrl: string } {
  const copy = COPY[recipient.campaignStep];
  const base = getAppBaseUrl();
  const token = createMarketingPreferenceToken({ userId: recipient.userId, email: recipient.email, topic: recipient.topic });
  const unsubscribeUrl = `${base}/api/email/preferences?token=${encodeURIComponent(token)}`;
  const actionUrl = marketingActionUrl(recipient.campaignStep, base);
  const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'Add MARKETING_POSTAL_ADDRESS before sending');
  if (!postalAddress) throw new Error('MARKETING_POSTAL_ADDRESS is required in production');
  const greeting = recipient.firstName ? `Hi ${escapeHtml(recipient.firstName)},` : 'Hi,';
  const paragraphs = copy.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.65;color:#334155">${escapeHtml(p)}</p>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px"><p style="color:#0369a1;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">SnapOrtho BroBot</p><h1 style="color:#0f172a;font-size:24px">${escapeHtml(copy.title)}</h1><p style="color:#334155">${greeting}</p>${paragraphs}<a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:700">${escapeHtml(copy.cta)}</a></div><p style="max-width:560px;margin:12px auto;text-align:center;font-size:11px;color:#64748b">SnapOrtho · MyOrtho Solutions LLC · ${escapeHtml(postalAddress)} · <a href="${escapeHtml(unsubscribeUrl)}">Manage email preferences or unsubscribe</a></p></div>`;
  const text = [`${recipient.firstName ? `Hi ${recipient.firstName}` : 'Hi'},`, '', ...copy.paragraphs, '', `${copy.cta}: ${actionUrl}`, '', `Manage preferences or unsubscribe: ${unsubscribeUrl}`, `SnapOrtho · MyOrtho Solutions LLC · ${postalAddress}`].join('\n');
  return { subject: copy.subject, html, text, unsubscribeUrl };
}
