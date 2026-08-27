/**
 * Win-back emailer for lapsed / at-risk BroBot subscribers.
 *
 * Audience ("lapsed + at-risk"): a user whose subscription no longer grants
 * access AND whose most recent coverage (current_period_end) is already in the
 * past, with a status that indicates a real lapse or a stalled recovery
 * (canceled / expired / unpaid / past_due / billing_retry / grace), or a
 * scheduled cancel that has already taken effect. Providers: Stripe + Apple,
 * each with a provider-appropriate call to action.
 *
 * Safety / correctness:
 *   - Idempotent: skips users already emailed about *this* lapse (see
 *     public.lifecycle_emails) and honors public.lifecycle_email_optouts.
 *   - --dry-run prints the selection and writes nothing.
 *   - --limit N caps sends per run.
 *
 * Usage:
 *   node --experimental-strip-types scripts/winback-lapsed-subscribers.ts [--dry-run] [--limit N] [--cooldown-days N]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { createClient } from '@supabase/supabase-js';

import { sendWorkspaceNotificationEmail } from '../src/lib/workspace/notifications/email.ts';

const YEARLY_PRICE_LABEL = '$29.99';
const YEARLY_SAVINGS_LABEL = 'saves you $5.89 versus paying monthly';

const KIND = 'winback_lapsed';
const PLAN_CODE = 'unlimited_brobot';

// Statuses that, once the paid period has ended, mean "did not renew" /
// stalled recovery worth a win-back nudge.
const LAPSED_STATUSES = new Set([
  'canceled',
  'expired',
  'unpaid',
  'past_due',
  'billing_retry',
  'grace',
]);

type SubscriptionRow = {
  id: string | null;
  user_id: string | null;
  provider: string | null;
  environment: string | null;
  status: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean | null;
  canceled_at: string | null;
  updated_at: string | null;
};

type Candidate = {
  userId: string;
  row: SubscriptionRow;
  periodEnd: number; // ms
};

function loadDotEnvLocal() {
  const path = join(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    process.env[key] = rawValue.replace(/^["']|["']$/g, '');
  }
}

function parseArgs(argv: string[]) {
  const args = { dryRun: false, preview: false, limit: Infinity, cooldownDays: 180 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--preview') { args.preview = true; args.dryRun = true; }
    else if (arg === '--limit') args.limit = Number(argv[(i += 1)]);
    else if (arg === '--cooldown-days') args.cooldownDays = Number(argv[(i += 1)]);
  }
  if (!Number.isFinite(args.limit) && args.limit !== Infinity) args.limit = Infinity;
  return args;
}

function toMs(value: string | null | undefined) {
  if (!value) return NaN;
  const ts = new Date(value).getTime();
  return Number.isFinite(ts) ? ts : NaN;
}

function isFuture(value: string | null | undefined, now: number) {
  const ts = toMs(value);
  return Number.isFinite(ts) && ts > now;
}

// Mirrors scripts/subscriptions-health.ts rowGrantsAccess.
function rowGrantsAccess(row: SubscriptionRow, now: number) {
  if (!isFuture(row.current_period_end, now)) return false;
  if (row.status === 'active' || row.status === 'trialing') return true;
  if (row.provider === 'apple' && (row.status === 'grace' || row.status === 'billing_retry')) return true;
  return false;
}

function isLapsedRow(row: SubscriptionRow, now: number) {
  // Caller already guarantees the user is NOT currently entitled by any row, so
  // period-end timing is not required here. Payment-failure states
  // (past_due / unpaid / billing_retry) routinely carry a *future*
  // current_period_end while Stripe retries the card, yet access is revoked —
  // those are prime win-back targets and must not be gated on "period ended".
  if (row.status && LAPSED_STATUSES.has(row.status)) return true;
  // Scheduled cancel: only once it has actually taken effect (period ended).
  if (row.cancel_at_period_end) {
    const periodEnd = toMs(row.current_period_end);
    return Number.isFinite(periodEnd) && periodEnd <= now;
  }
  return false;
}

type Reason = 'payment_failure' | 'canceled';

type Cta = { url: string; label: string };

const PAYMENT_FAILURE_STATUSES = new Set(['past_due', 'unpaid', 'billing_retry']);

// Why did this row stop granting access? Drives which email we send.
function classifyReason(row: SubscriptionRow): Reason {
  if (row.status && PAYMENT_FAILURE_STATUSES.has(row.status)) return 'payment_failure';
  return 'canceled'; // canceled / expired / effective cancel_at_period_end
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

type Highlight = { headline: string; detail: string };

type EmailContent = {
  subject: string;
  title: string;
  paragraphs: string[];
  highlight: Highlight | null;
  primary: Cta;
  secondary: Cta | null;
};

function buildContent(reason: Reason, provider: string | null, appUrl: string): EmailContent {
  const base = appUrl.replace(/\/$/, '');
  const annualUrl = `${base}/brobot/pricing#plans`;

  if (reason === 'payment_failure') {
    const opener =
      provider === 'apple'
        ? "Apple couldn't process your latest payment, so your Unlimited BroBot access is paused."
        : "Your latest payment didn't go through, so your Unlimited BroBot access is paused.";
    const retry =
      provider === 'apple'
        ? 'Apple retries automatically once your billing details are current.'
        : "We'll retry the charge as soon as your card is updated.";
    return {
      subject: 'Action needed: your BroBot payment did not go through',
      title: "Let's fix your payment",
      paragraphs: [
        opener,
        'Update your payment method and your subscription picks right back up. Nothing to set up again, and all your history and settings are waiting for you.',
        retry,
      ],
      primary:
        provider === 'apple'
          ? { url: 'https://apps.apple.com/account/billing', label: 'Update payment method in the App Store' }
          : { url: `${base}/account/billing`, label: 'Update your payment method' },
      highlight: null,
      secondary: null,
    };
  }

  // Win-back for a real cancellation, with the annual value promoted in a
  // dedicated highlighted callout.
  const annualHighlight: Highlight = {
    headline: `Your best deal: a full year for ${YEARLY_PRICE_LABEL}`,
    detail: `That comes out to under $2.50 a month, and ${YEARLY_SAVINGS_LABEL}.`,
  };
  const winbackParagraphs = [
    'Your Unlimited BroBot subscription ended and you no longer have full access.',
    'Reactivate anytime and pick up right where you left off. All your history and settings are still here.',
  ];

  if (provider === 'apple') {
    return {
      subject: 'Come back to Unlimited BroBot',
      title: 'Come back to Unlimited BroBot',
      paragraphs: winbackParagraphs,
      highlight: annualHighlight,
      primary: { url: 'https://apps.apple.com/account/subscriptions', label: 'Resubscribe in the App Store' },
      secondary: { url: annualUrl, label: `Get a year for ${YEARLY_PRICE_LABEL}` },
    };
  }

  return {
    subject: 'Come back to Unlimited BroBot',
    title: 'Come back to Unlimited BroBot',
    paragraphs: winbackParagraphs,
    highlight: annualHighlight,
    primary: { url: annualUrl, label: `Get a year for ${YEARLY_PRICE_LABEL}` },
    secondary: { url: annualUrl, label: 'Prefer monthly? See all plans' },
  };
}

function renderHtml(content: EmailContent, unsubscribeUrl: string) {
  const paragraphs = content.paragraphs
    .map(
      (p) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#334155;">${escapeHtml(p)}</p>`,
    )
    .join('');

  const button = (cta: Cta, primary: boolean) =>
    `<a href="${escapeHtml(cta.url)}" style="display:inline-block;border-radius:9999px;${
      primary
        ? 'background:#0f172a;color:#ffffff;'
        : 'background:#ffffff;color:#0f172a;border:1px solid #cbd5e1;'
    }text-decoration:none;font-weight:700;padding:12px 18px;font-size:14px;">${escapeHtml(cta.label)}</a>`;

  const highlight = content.highlight
    ? `<div style="margin:4px 0 24px;padding:16px 18px;background:#ecfdf5;border:1px solid #6ee7b7;border-radius:14px;">
        <p style="margin:0 0 4px;font-size:16px;font-weight:800;color:#047857;">${escapeHtml(content.highlight.headline)}</p>
        <p style="margin:0;font-size:14px;line-height:1.6;color:#065f46;">${escapeHtml(content.highlight.detail)}</p>
      </div>`
    : '';

  const secondary = content.secondary
    ? `<div style="margin-top:12px;">${button(content.secondary, false)}</div>`
    : '';

  return `
    <div style="font-family: Arial, sans-serif; background: #f8fafc; padding: 24px; color: #0f172a;">
      <div style="max-width: 560px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px; padding: 32px;">
        <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #0369a1;">
          SnapOrtho BroBot
        </p>
        <h1 style="margin: 0 0 16px; font-size: 24px; line-height: 1.2; color: #0f172a;">
          ${escapeHtml(content.title)}
        </h1>
        ${paragraphs}
        ${highlight}
        <div style="margin-top: 8px;">
          ${button(content.primary, true)}
        </div>
        ${secondary}
      </div>
      <div style="max-width:560px;margin:12px auto 0;font-family:Arial,sans-serif;font-size:11px;color:#94a3b8;text-align:center;">
        <a href="${escapeHtml(unsubscribeUrl)}" style="color:#94a3b8;">Unsubscribe</a>
      </div>
    </div>
  `;
}

function buildEmail(params: {
  to: string;
  reason: Reason;
  provider: string | null;
  appUrl: string;
  supportEmail: string;
}) {
  const content = buildContent(params.reason, params.provider, params.appUrl);
  const unsubscribe = `mailto:${params.supportEmail}?subject=Unsubscribe%20from%20SnapOrtho%20emails`;

  const text = [
    'Hi,',
    '',
    ...content.paragraphs.flatMap((p) => [p, '']),
    ...(content.highlight
      ? [`${content.highlight.headline}`, content.highlight.detail, '']
      : []),
    `${content.primary.label}: ${content.primary.url}`,
    ...(content.secondary ? [`${content.secondary.label}: ${content.secondary.url}`] : []),
    '',
    `Unsubscribe from these emails: ${unsubscribe}`,
    'The SnapOrtho Team',
  ].join('\n');

  const html = renderHtml(content, unsubscribe);

  return { to: params.to, subject: content.subject, text, html };
}

async function main() {
  loadDotEnvLocal();
  const args = parseArgs(process.argv.slice(2));
  const now = Date.now();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? 'https://snap-ortho.com';
  const supportEmail = (process.env.NOTIFICATION_FROM_EMAIL ?? 'support@snap-ortho.com')
    .match(/<([^>]+)>/)?.[1] ?? 'support@snap-ortho.com';

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // 1. Pull all BroBot subscription rows.
  const { data, error } = await supabase
    .from('subscriptions')
    .select(
      'id, user_id, provider, environment, status, current_period_end, cancel_at_period_end, canceled_at, updated_at',
    )
    .eq('plan_code', PLAN_CODE)
    .order('updated_at', { ascending: false })
    .limit(10000);

  if (error) throw new Error(`subscriptions query failed: ${error.message}`);
  const rows = (data ?? []) as SubscriptionRow[];

  // 2. Group by user; drop anyone currently entitled by ANY row.
  const byUser = new Map<string, SubscriptionRow[]>();
  for (const row of rows) {
    if (!row.user_id) continue;
    const list = byUser.get(row.user_id) ?? [];
    list.push(row);
    byUser.set(row.user_id, list);
  }

  const candidates: Candidate[] = [];
  for (const [userId, userRows] of byUser.entries()) {
    if (userRows.some((row) => rowGrantsAccess(row, now))) continue; // still entitled
    const lapsed = userRows.filter((row) => isLapsedRow(row, now));
    if (lapsed.length === 0) continue;
    // Anchor on the most recent coverage.
    const row = lapsed.reduce((best, r) =>
      toMs(r.current_period_end) > toMs(best.current_period_end) ? r : best,
    );
    candidates.push({ userId, row, periodEnd: toMs(row.current_period_end) });
  }

  // 3. Suppression + prior-send lookups (batched).
  const userIds = candidates.map((c) => c.userId);
  const [{ data: optoutData, error: optoutErr }, { data: sentData, error: sentErr }] = await Promise.all([
    supabase
      .from('lifecycle_email_optouts')
      .select('user_id, kind')
      .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
    supabase
      .from('lifecycle_emails')
      .select('user_id, period_end_at_send, sent_at')
      .eq('kind', KIND)
      .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000']),
  ]);

  // Fail loud: without these tables idempotency/suppression is unenforceable
  // and we would re-spam on every run. Do not fail open.
  if (optoutErr) throw new Error(`lifecycle_email_optouts query failed (run the migration?): ${optoutErr.message}`);
  if (sentErr) throw new Error(`lifecycle_emails query failed (run the migration?): ${sentErr.message}`);

  const optedOut = new Set(
    (optoutData ?? [])
      .filter((o: { kind: string | null }) => o.kind === null || o.kind === KIND)
      .map((o: { user_id: string }) => o.user_id),
  );
  const priorSends = new Map<string, { periodEnd: number; sentAt: number }[]>();
  for (const s of (sentData ?? []) as { user_id: string; period_end_at_send: string | null; sent_at: string }[]) {
    const list = priorSends.get(s.user_id) ?? [];
    list.push({ periodEnd: toMs(s.period_end_at_send), sentAt: toMs(s.sent_at) });
    priorSends.set(s.user_id, list);
  }

  const cooldownMs = args.cooldownDays * 24 * 60 * 60 * 1000;
  function alreadyHandled(c: Candidate) {
    const sends = priorSends.get(c.userId);
    if (!sends) return false;
    return sends.some(
      (s) =>
        // emailed about this lapse (same-or-later coverage) …
        (Number.isFinite(s.periodEnd) && s.periodEnd >= c.periodEnd) ||
        // … or within the cooldown window regardless.
        (Number.isFinite(s.sentAt) && now - s.sentAt < cooldownMs),
    );
  }

  // 4. Resolve emails from auth.users.
  const emailByUser = new Map<string, string>();
  let page = 1;
  for (;;) {
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });
    if (usersError) throw new Error(`listUsers failed: ${usersError.message}`);
    const users = usersData?.users ?? [];
    for (const u of users) if (u.email) emailByUser.set(u.id, u.email);
    if (users.length < 1000) break;
    page += 1;
  }

  // 5. Filter to sendable and act.
  const sendable = candidates
    .filter((c) => !optedOut.has(c.userId))
    .filter((c) => !alreadyHandled(c))
    .filter((c) => emailByUser.has(c.userId));

  const skippedNoEmail = candidates.filter((c) => !emailByUser.has(c.userId)).length;

  console.log(
    `[winback] ${candidates.length} lapsed/at-risk candidate(s); ` +
      `${sendable.length} sendable after suppression/idempotency ` +
      `(opted-out=${candidates.filter((c) => optedOut.has(c.userId)).length}, ` +
      `already-handled=${candidates.filter((c) => alreadyHandled(c)).length}, ` +
      `no-email=${skippedNoEmail})`,
  );

  let sent = 0;
  let failed = 0;
  for (const c of sendable) {
    if (sent >= args.limit) break;
    const email = emailByUser.get(c.userId)!;
    const reason = classifyReason(c.row);
    const label = `${email} [${reason}] provider=${c.row.provider ?? '?'} status=${c.row.status ?? '?'} periodEnd=${c.row.current_period_end ?? '?'}`;

    if (args.preview) {
      const msg = buildEmail({ to: email, reason, provider: c.row.provider, appUrl, supportEmail });
      const file = join(process.cwd(), `winback-preview-${reason}-${c.row.provider ?? 'unknown'}.html`);
      writeFileSync(file, msg.html, 'utf8');
      console.log(`\n──────── ${label}`);
      console.log(`  Subject: ${msg.subject}`);
      console.log(msg.text.split('\n').map((l) => `  | ${l}`).join('\n'));
      console.log(`  HTML → ${file}`);
      sent += 1;
      continue;
    }

    if (args.dryRun) {
      console.log(`  [dry-run] would email ${label}`);
      sent += 1;
      continue;
    }

    try {
      await sendWorkspaceNotificationEmail(
        buildEmail({ to: email, reason, provider: c.row.provider, appUrl, supportEmail }),
      );
      const { error: logError } = await supabase.from('lifecycle_emails').insert({
        user_id: c.userId,
        email,
        kind: KIND,
        subscription_id: c.row.id,
        provider: c.row.provider,
        status_at_send: c.row.status,
        period_end_at_send: c.row.current_period_end,
        metadata: { reason },
      });
      if (logError) {
        // Sent but not logged — surface loudly so we don't silently re-send.
        console.error(`  ⚠ sent to ${email} but failed to log: ${logError.message}`);
      }
      console.log(`  ✓ emailed ${label}`);
      sent += 1;
    } catch (err) {
      failed += 1;
      console.error(`  ✗ failed ${label}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log(
    `[winback] done. ${args.dryRun ? 'would-send' : 'sent'}=${sent}, failed=${failed}${
      sent >= args.limit ? ' (limit reached)' : ''
    }`,
  );
  if (failed > 0 && !args.dryRun) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
