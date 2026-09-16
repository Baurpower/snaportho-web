import { marketingActionUrl, marketingWebUrl, marketingFeatureUrl } from './links';
import { getAppBaseUrl } from '@/lib/config/app-url';
import { createMarketingPreferenceToken } from './preferences-token';
import type { CampaignStep, MarketingEmail, MarketingRecipient } from './types';

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

const COPY: Record<CampaignStep, { subject: string; title: string; paragraphs: string[]; cta: string }> = {
  activation_1: { subject: 'A quick way to review before your next case', title: 'Start with one question', paragraphs: ['Preparing for a case? Ask BroBot to walk you through the approach.', 'Try: “What anatomy should I review before a posterior approach to the hip?”', 'Open BroBot and try a question before signing in.'], cta: 'Open BroBot' },
  activation_2: { subject: 'Three ways to use BroBot this week', title: 'A useful starting point for BroBot', paragraphs: ['Review an approach before a case.', 'Quiz yourself on a classification.', 'Ask for a concise explanation of a difficult orthopedic concept.'], cta: 'Open BroBot' },
  activation_3: { subject: 'A quick anatomy question to try', title: 'Review one thing before your next case', paragraphs: ['Try asking BroBot: “Which nerves are at risk in a posterior approach to the hip?”', 'Use the answer to focus your anatomy review before the case.'], cta: 'Open BroBot' },
  habit_1: { subject: 'BroBot can do more than answer questions', title: 'Keep learning with BroBot', paragraphs: ['Use BroBot for case preparation, anatomy and surgical approaches, exam review, and focused follow-up questions.'], cta: 'Open BroBot' },
  habit_2: { subject: 'Turn a topic into a quick quiz', title: 'Test what you remember', paragraphs: ['Pick a topic you recently studied and ask BroBot to quiz you.', 'Try: “Give me three quiz questions on the Garden classification of femoral neck fractures, with the answers at the end.”', 'Try answering before you read the explanations.'], cta: 'Open BroBot' },
  conversion_1: { subject: 'Keep using BroBot without the limit', title: 'Unlock Unlimited BroBot', paragraphs: ['Want more time for case prep and follow-up questions?', 'Unlimited BroBot removes the free daily question limit.', 'See the available plans and pricing in SnapOrtho.'], cta: 'View Unlimited plans' },
  profile_completion_1: { subject: 'Finish setting up your SnapOrtho account', title: 'Add your graduation year to SnapOrtho', paragraphs: ['Your SnapOrtho account is missing a couple of details. Adding your graduation year and training level lets us match content to your level of training.', 'It takes about 30 seconds — just two fields.', 'While you’re there: we’ve shipped a lot lately — an expanded Anki deck, CasePrep case summaries, and new surgical-approach walkthroughs in BroBot. Worth a look after you update your profile.'], cta: 'Add my graduation year' },
  profile_grad_year_1: { subject: 'A note for med students', title: 'Keep up the good work', paragraphs: [], cta: 'Update my profile' },
  reengagement_1: { subject: 'Something from rounds you want to review?', title: 'Start with a question from today', paragraphs: ['Bring BroBot a term, classification, or approach you want to understand better.', 'Try: “Explain the Weber ankle fracture classification in simple terms.”', 'You can try a question before signing in.'], cta: 'Open BroBot' },
};

// A short, personal note from the founder for the profile-completion campaign.
// Written to read like a real email, not marketing copy.
function renderFounderProfileEmail(args: { firstName: string | null; actionUrl: string; brobotUrl: string; ankiUrl: string; unsubscribeUrl: string; postalAddress: string }): MarketingEmail {
  const { firstName, actionUrl, brobotUrl, ankiUrl, unsubscribeUrl, postalAddress } = args;
  const link = escapeHtml(actionUrl);
  const intro = `It's been a while since you created your SnapOrtho account. Your profile hasn't been filled out yet, and I'd love for you to see what we've built since then.`;
  const profilePrompt = `When you have a moment, add your training level and graduation year so your profile is ready for what's next.`;
  const whatsNew = `BroBot now has new CasePrep and orthopaedic Chat experiences. We also have an Anki add-on with a growing orthopaedic deck. Come take a look.`;
  const hi = firstName ? `Hi ${escapeHtml(firstName)},` : 'Hi,';
  const p = (html: string, extra = '') => `<p style="margin:0 0 16px;line-height:1.6;color:#1f2937;font-size:16px${extra}">${html}</p>`;
  const outlineBtn = (href: string, label: string) => `<a href="${escapeHtml(href)}" style="display:inline-block;background:#fff;color:#0f172a;text-decoration:none;border:1px solid #0f172a;border-radius:8px;padding:10px 16px;font-weight:600;font-size:14px;margin:0 8px 8px 0">${label}</a>`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f6f7f9;padding:24px 16px"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #eceef1;border-radius:12px;overflow:hidden">`
    + `<div style="background:#0f172a;padding:16px 24px"><span style="color:#fff;font-size:17px;font-weight:700;letter-spacing:.02em">SnapOrtho</span></div>`
    + `<div style="padding:24px">`
    + p(hi)
    + p(escapeHtml(intro))
    + p(escapeHtml(whatsNew))
    + `<p style="margin:20px 0"><a href="${escapeHtml(brobotUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;padding:11px 20px;font-weight:600;font-size:15px">Open BroBot</a></p>`
    + `<p style="margin:0 0 20px">${outlineBtn(ankiUrl, 'Explore the Anki add-on')}</p>`
    + p(escapeHtml(profilePrompt))
    + `<p style="margin:0 0 20px"><a href="${link}" style="color:#0f172a;font-weight:600">Update my profile</a></p>`
    + p(`Thanks for being here.`)
    + `<p style="margin:0;line-height:1.4;color:#1f2937;font-size:16px">Alex<br><span style="color:#6b7280;font-size:14px">Founder, SnapOrtho</span></p>`
    + `</div>`
    + `<div style="padding:14px 24px;border-top:1px solid #eceef1;font-size:11px;color:#9ca3af;line-height:1.5">SnapOrtho, ${escapeHtml(postalAddress)}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe or manage email preferences</a></div>`
    + `</div></div>`;
  const text = [
    firstName ? `Hi ${firstName},` : 'Hi,',
    '',
    intro,
    '',
    whatsNew,
    '',
    `Open BroBot: ${brobotUrl}`,
    `Explore the Anki add-on: ${ankiUrl}`,
    '',
    profilePrompt,
    `Update my profile: ${actionUrl}`,
    '',
    'Thanks for being here.',
    '',
    'Alex',
    'Founder, SnapOrtho',
    '',
    `Unsubscribe or manage email preferences: ${unsubscribeUrl}`,
    `SnapOrtho, ${postalAddress}`,
  ].join('\n');
  return { subject: 'See what’s new in SnapOrtho', html, text };
}

function renderMedicalStudentEmail(args: { firstName: string | null; actionUrl: string; unsubscribeUrl: string; postalAddress: string }): MarketingEmail {
  const { firstName, actionUrl, unsubscribeUrl, postalAddress } = args;
  const greeting = firstName ? `Hi ${firstName},` : 'Hi,';
  const intro = `I saw that you listed yourself as an MD/DO student on SnapOrtho. Keep up the good work — med school is no joke.`;
  const ask = `I realized we don't have your graduation year yet. It's just one field to add. Once you save it, I'll take you straight to a page where you can try the new BroBot or download the SnapOrtho Anki add-on.`;
  const closing = `Hope one of them helps with your next case, rotation, or study session.`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;background:#f6f7f9;padding:24px 16px"><div style="max-width:520px;margin:auto;background:#fff;border:1px solid #eceef1;border-radius:12px;overflow:hidden">`
    + `<div style="background:#0f172a;padding:16px 24px"><span style="color:#fff;font-size:17px;font-weight:700">SnapOrtho</span></div>`
    + `<div style="padding:24px;color:#1f2937;font-size:16px;line-height:1.6">`
    + `<p style="margin:0 0 16px">${escapeHtml(greeting)}</p>`
    + `<p style="margin:0 0 16px">${escapeHtml(intro)}</p>`
    + `<p style="margin:0 0 20px">${escapeHtml(ask)}</p>`
    + `<p style="margin:0 0 20px"><a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;border-radius:8px;padding:11px 20px;font-weight:600">Add my graduation year</a></p>`
    + `<p style="margin:0 0 16px">${escapeHtml(closing)}</p>`
    + `<p style="margin:0">Alex<br><span style="color:#6b7280;font-size:14px">Founder, SnapOrtho</span></p>`
    + `</div><div style="padding:14px 24px;border-top:1px solid #eceef1;font-size:11px;color:#9ca3af;line-height:1.5">SnapOrtho, ${escapeHtml(postalAddress)}<br><a href="${escapeHtml(unsubscribeUrl)}" style="color:#9ca3af">Unsubscribe or manage email preferences</a></div></div></div>`;
  const text = [greeting, '', intro, '', ask, '', `Add my graduation year: ${actionUrl}`, '', closing, '', 'Alex', 'Founder, SnapOrtho', '', `Unsubscribe or manage email preferences: ${unsubscribeUrl}`, `SnapOrtho, ${postalAddress}`].join('\n');
  return { subject: 'A quick note for med students', html, text };
}

export function renderMarketingEmail(recipient: MarketingRecipient): MarketingEmail & { unsubscribeUrl: string } {
  const copy = COPY[recipient.campaignStep];
  const base = getAppBaseUrl();
  const token = createMarketingPreferenceToken({ userId: recipient.userId, email: recipient.email, topic: recipient.topic });
  const unsubscribeUrl = `${base}/api/email/preferences?token=${encodeURIComponent(token)}`;
  const actionUrl = marketingActionUrl(recipient.campaignStep, base);
  const webUrl = marketingWebUrl(recipient.campaignStep, base);
  if (recipient.campaignStep === 'profile_grad_year_1') {
    const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'Add MARKETING_POSTAL_ADDRESS before sending');
    if (!postalAddress) throw new Error('MARKETING_POSTAL_ADDRESS is required in production');
    return { ...renderMedicalStudentEmail({ firstName: recipient.firstName, actionUrl, unsubscribeUrl, postalAddress }), unsubscribeUrl };
  }
  if (recipient.campaignStep === 'profile_completion_1') {
    const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'Add MARKETING_POSTAL_ADDRESS before sending');
    if (!postalAddress) throw new Error('MARKETING_POSTAL_ADDRESS is required in production');
    const brobotUrl = marketingFeatureUrl('brobot', base, { campaignKey: recipient.campaignKey, content: 'brobot_chat' });
    const ankiUrl = marketingFeatureUrl('anki', base, { campaignKey: recipient.campaignKey, content: 'anki_addon' });
    return { ...renderFounderProfileEmail({ firstName: recipient.firstName, actionUrl, brobotUrl, ankiUrl, unsubscribeUrl, postalAddress }), unsubscribeUrl };
  }
  const webLinkLabel = new URL(webUrl).pathname === '/brobot/chat' ? 'Open Chat on the website' : 'Continue on the website';
  const postalAddress = process.env.MARKETING_POSTAL_ADDRESS?.trim() || (process.env.NODE_ENV === 'production' ? '' : 'Add MARKETING_POSTAL_ADDRESS before sending');
  if (!postalAddress) throw new Error('MARKETING_POSTAL_ADDRESS is required in production');
  const greeting = recipient.firstName ? `Hi ${escapeHtml(recipient.firstName)},` : 'Hi,';
  const paragraphs = copy.paragraphs.map((p) => `<p style="margin:0 0 16px;line-height:1.65;color:#334155">${escapeHtml(p)}</p>`).join('');
  const html = `<div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px"><div style="max-width:560px;margin:auto;background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px"><p style="color:#0369a1;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">SnapOrtho BroBot</p><h1 style="color:#0f172a;font-size:24px">${escapeHtml(copy.title)}</h1><p style="color:#334155">${greeting}</p>${paragraphs}<a href="${escapeHtml(actionUrl)}" style="display:inline-block;background:#0f172a;color:#fff;text-decoration:none;border-radius:999px;padding:12px 18px;font-weight:700">${escapeHtml(copy.cta)}</a><p style="margin:18px 0 0;font-size:13px;color:#64748b">Prefer your browser? <a href="${escapeHtml(webUrl)}" style="color:#0369a1">${webLinkLabel}</a>.</p></div><p style="max-width:560px;margin:12px auto;text-align:center;font-size:11px;color:#64748b">SnapOrtho · MyOrtho Solutions LLC · ${escapeHtml(postalAddress)} · <a href="${escapeHtml(unsubscribeUrl)}">Manage email preferences or unsubscribe</a></p></div>`;
  const text = [`${recipient.firstName ? `Hi ${recipient.firstName}` : 'Hi'},`, '', ...copy.paragraphs, '', `${copy.cta}: ${actionUrl}`, `${webLinkLabel}: ${webUrl}`, '', `Manage preferences or unsubscribe: ${unsubscribeUrl}`, `SnapOrtho · MyOrtho Solutions LLC · ${postalAddress}`].join('\n');
  return { subject: copy.subject, html, text, unsubscribeUrl };
}
