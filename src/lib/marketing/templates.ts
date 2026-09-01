import { getAppBaseUrl } from '@/lib/config/app-url';
import { createMarketingPreferenceToken } from './preferences-token';
import type { CampaignStep, MarketingEmail, MarketingRecipient } from './types';

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const COPY: Record<CampaignStep, { subject: string; title: string; paragraphs: string[]; cta: string; path: string }> = {
  activation_1: { subject: 'Your orthopedic AI assistant is ready', title: 'Try BroBot before your next case', paragraphs: ['BroBot is SnapOrtho’s orthopedic learning assistant.', 'Use it to review an approach, prepare for a case, study a classification, or clarify a difficult concept.', 'Try asking: “Prep me for a posterior total hip approach.”'], cta: 'Ask BroBot', path: '/brobot?utm_source=resend&utm_medium=email&utm_campaign=brobot_activation_v1&utm_content=activation_1' },
  activation_2: { subject: 'Three ways to use BroBot this week', title: 'A useful starting point for BroBot', paragraphs: ['Review an approach before a case.', 'Quiz yourself on a classification.', 'Ask for a concise explanation of a difficult orthopedic concept.'], cta: 'Try a question', path: '/brobot?utm_source=resend&utm_medium=email&utm_campaign=brobot_activation_v1&utm_content=activation_2' },
  activation_3: { subject: 'A BroBot prompt for your next case', title: 'One prompt to try', paragraphs: ['Open BroBot and ask it to prepare a focused anatomy, approach, and pitfalls review for your next case.'], cta: 'Open BroBot', path: '/brobot?utm_source=resend&utm_medium=email&utm_campaign=brobot_activation_v1&utm_content=activation_3' },
  habit_1: { subject: 'BroBot can do more than answer questions', title: 'Keep learning with BroBot', paragraphs: ['Use BroBot for case preparation, anatomy and surgical approaches, exam review, and focused follow-up questions.'], cta: 'Continue with BroBot', path: '/brobot?utm_source=resend&utm_medium=email&utm_campaign=brobot_habit_v1&utm_content=habit_1' },
  habit_2: { subject: 'What are you working on this week?', title: 'Bring this week’s orthopedic questions', paragraphs: ['Ask BroBot about the case, topic, classification, or approach you are reviewing this week.'], cta: 'Ask BroBot', path: '/brobot?utm_source=resend&utm_medium=email&utm_campaign=brobot_habit_v1&utm_content=habit_2' },
  conversion_1: { subject: 'Keep using BroBot without the limit', title: 'Unlock Unlimited BroBot', paragraphs: ['You’ve already used BroBot for orthopedic learning.', 'Unlimited BroBot lets you keep asking questions, preparing for cases, and reviewing difficult topics without stopping at the free limit.', 'A full year is $29.99—less than $2.50 per month.'], cta: 'Unlock Unlimited BroBot', path: '/brobot/pricing?utm_source=resend&utm_medium=email&utm_campaign=brobot_conversion_v1&utm_content=conversion_1' },
  profile_completion_1: { subject: 'Make SnapOrtho more relevant to your training', title: 'Personalize your SnapOrtho experience', paragraphs: ['Tell us your training level and orthopedic interests so SnapOrtho can show more relevant learning tools and BroBot starting points.'], cta: 'Complete my profile', path: '/work/profile?utm_source=resend&utm_medium=email&utm_campaign=profile_completion_v1' },
  reengagement_1: { subject: 'Come back to BroBot', title: 'Bring BroBot your next orthopedic question', paragraphs: ['Pick up where you left off with a case, approach, classification, or exam-review question.'], cta: 'Return to BroBot', path: '/brobot?utm_source=resend&utm_medium=email&utm_campaign=brobot_reengagement_v1' },
};

export function renderMarketingEmail(recipient: MarketingRecipient): MarketingEmail & { unsubscribeUrl: string } {
  const copy = COPY[recipient.campaignStep];
  const base = getAppBaseUrl();
  const token = createMarketingPreferenceToken({ userId: recipient.userId, email: recipient.email, topic: recipient.topic });
  const unsubscribeUrl = `${base}/api/email/preferences?token=${encodeURIComponent(token)}`;
  const actionUrl = new URL(copy.path, base).toString();
  const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'Add MARKETING_POSTAL_ADDRESS before sending');
  if (!postalAddress) throw new Error('MARKETING_POSTAL_ADDRESS is required in production');
  const greeting = recipient.firstName ? `Hi ${escapeHtml(recipient.firstName)},` : 'Hi,';
  const paragraphs = copy.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.65;color:#334155">${escapeHtml(p)}</p>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px"><p style="color:#0369a1;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">SnapOrtho BroBot</p><h1 style="color:#0f172a;font-size:24px">${escapeHtml(copy.title)}</h1><p style="color:#334155">${greeting}</p>${paragraphs}<a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:700">${escapeHtml(copy.cta)}</a></div><p style="max-width:560px;margin:12px auto;text-align:center;font-size:11px;color:#64748b">SnapOrtho · MyOrtho Solutions LLC · ${escapeHtml(postalAddress)} · <a href="${escapeHtml(unsubscribeUrl)}">Manage email preferences or unsubscribe</a></p></div>`;
  const text = [`${recipient.firstName ? `Hi ${recipient.firstName}` : 'Hi'},`, '', ...copy.paragraphs, '', `${copy.cta}: ${actionUrl}`, '', `Manage preferences or unsubscribe: ${unsubscribeUrl}`, `SnapOrtho · MyOrtho Solutions LLC · ${postalAddress}`].join('\n');
  return { subject: copy.subject, html, text, unsubscribeUrl };
}
