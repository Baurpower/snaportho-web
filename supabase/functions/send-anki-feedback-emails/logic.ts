// Pure, runtime-agnostic core of the send-anki-feedback-emails Edge Function.
//
// This module intentionally avoids Deno and remote imports so the same code
// can be executed under Node for tests. `index.ts` provides the Deno entry
// point plus the real Supabase/Resend adapters.

export const FEEDBACK_SUBJECT = 'SnapOrtho Anki feedback';

export const DEFAULT_FROM_EMAIL = 'Alex from SnapOrtho <alexbaur@snap-ortho.com>';
export const DEFAULT_REPLY_TO = 'alexbaur@snap-ortho.com';

export const DEFAULT_BATCH_LIMIT = 25;
export const MAX_BATCH_LIMIT = 100;

/** Stable Resend idempotency key: one per user for this one-time email. */
export function idempotencyKeyFor(userId: string): string {
  return `anki-beta-feedback:${userId}`;
}

/** A row returned by the claim_anki_feedback_batch() RPC. */
export type ClaimedRow = {
  id: string;
  user_id: string;
  device_linked_at: string;
  scheduled_for: string;
  sent_at: string | null;
  resend_email_id: string | null;
  status: string;
  attempt_count: number;
  profile_email: string | null;
  auth_email: string | null;
  full_name: string | null;
};

export type DbClient = {
  claimBatch(limit: number, dryRun: boolean, userIds: string[] | null): Promise<ClaimedRow[]>;
  markSent(id: string, resendId: string): Promise<void>;
  /**
   * Record a failure. When the provider already accepted the send but the
   * success could not be recorded, pass resendId so a later run finalizes
   * the row without re-sending.
   */
  markFailed(id: string, error: string, resendId?: string | null): Promise<void>;
};

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text: string;
  idempotencyKey: string;
};

export type BatchStats = {
  eligible: number;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  recovered: number;
  dryRun: boolean;
};

export function isUsableEmail(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * Prefer the profile's preferred email, fall back to the auth email.
 * Returns null when neither is syntactically valid.
 */
export function resolveRecipientEmail(
  profileEmail: string | null,
  authEmail: string | null,
): string | null {
  if (typeof profileEmail === 'string' && isUsableEmail(profileEmail)) {
    return profileEmail.trim();
  }
  if (typeof authEmail === 'string' && isUsableEmail(authEmail)) {
    return authEmail.trim();
  }
  return null;
}

/**
 * Derive a first name from the profile full_name. Returns null when there is
 * no usable name so the caller falls back to "Hi there,".
 */
export function firstNameFromFullName(fullName: string | null): string | null {
  if (typeof fullName !== 'string') return null;
  const token = fullName.trim().split(/\s+/)[0] ?? '';
  if (!token) return null;
  if (token.length > 50) return null;
  if (!/\p{L}/u.test(token)) return null;
  return token;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function renderFeedbackEmail(firstName: string | null): {
  subject: string;
  html: string;
  text: string;
} {
  const greeting = firstName ? `Hi ${firstName},` : 'Hi there,';
  const subject = FEEDBACK_SUBJECT;
  const paragraphs = [
    'Thank you for downloading the SnapOrtho Anki add-on! We’re really excited about this project and have put a lot of time into developing it.',
    'It’s still in beta, so we know it’s not perfect. We’d really appreciate any positive or negative feedback.',
    'Feel free to email or text me anytime.',
  ];
  const signatureLines = ['Alex', '(916) 521-0352', 'alexbaur@snap-ortho.com'];

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    ...paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`),
    `<p>${signatureLines.map((line) => escapeHtml(line)).join('<br>')}</p>`,
  ].join('\n');

  const text = [greeting, '', ...paragraphs, '', ...signatureLines].join('\n');

  return { subject, html, text };
}

function truncateError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 500);
}

export function normalizeBatchLimit(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  if (!Number.isFinite(parsed)) return DEFAULT_BATCH_LIMIT;
  return Math.min(MAX_BATCH_LIMIT, Math.max(1, Math.floor(parsed)));
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const MAX_MANUAL_USER_IDS = 25;

/**
 * Validate the optional manual-test user filter. Accepts an array (JSON
 * body) or a comma-separated string (query param). Returns null when absent
 * or empty, meaning "all due users" (the cron default).
 */
export function parseUserIdsFilter(value: unknown): string[] | null {
  if (value === undefined || value === null) return null;
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const ids = raw.map((entry) => String(entry).trim()).filter((entry) => entry.length > 0);
  if (ids.length === 0) return null;
  if (ids.length > MAX_MANUAL_USER_IDS) {
    throw new Error(`user_ids: at most ${MAX_MANUAL_USER_IDS} ids per manual run`);
  }
  for (const id of ids) {
    if (!UUID_RE.test(id)) throw new Error(`user_ids: invalid uuid: ${id}`);
  }
  return ids;
}

/**
 * Run one batch: claim due rows, send via Resend, finalize each row.
 * Never throws for per-row failures; only a failed claim itself throws.
 */
export async function runFeedbackBatch(args: {
  db: DbClient;
  sendEmail: (input: SendEmailInput) => Promise<{ id: string }>;
  batchLimit?: unknown;
  dryRun?: boolean;
  userIds?: string[] | null;
  log?: (message: string, detail?: Record<string, unknown>) => void;
}): Promise<BatchStats> {
  const { db, sendEmail, dryRun = false } = args;
  const log = args.log ?? (() => {});
  const limit = normalizeBatchLimit(args.batchLimit);

  const claimed = await db.claimBatch(limit, dryRun, args.userIds ?? null);
  const stats: BatchStats = {
    eligible: claimed.length,
    attempted: dryRun ? 0 : claimed.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    recovered: 0,
    dryRun,
  };

  if (dryRun) {
    log('feedback batch dry-run', { eligible: stats.eligible });
    return stats;
  }

  for (const row of claimed) {
    // Crash recovery first: a previous attempt reached Resend and stored the
    // provider id but died before marking sent. Finalize without re-sending
    // (no recipient address needed since nothing is sent here).
    if (row.resend_email_id) {
      try {
        await db.markSent(row.id, row.resend_email_id);
        stats.sent += 1;
        stats.recovered += 1;
      } catch (error) {
        log('finalize recovered row failed', { rowId: row.id, error: truncateError(error) });
        stats.failed += 1;
      }
      continue;
    }

    const email = resolveRecipientEmail(row.profile_email, row.auth_email);
    if (!email) {
      try {
        // Persisted as failed (retryable, not terminal) so the send
        // self-heals if the user adds a valid address later; reported as
        // skipped for this run.
        await db.markFailed(row.id, 'no_valid_email_address');
      } catch (error) {
        log('mark skipped row failed', { rowId: row.id, error: truncateError(error) });
      }
      stats.skipped += 1;
      continue;
    }

    const rendered = renderFeedbackEmail(firstNameFromFullName(row.full_name));
    let acceptedId: string | null = null;
    try {
      const result = await sendEmail({
        to: email,
        subject: rendered.subject,
        html: rendered.html,
        text: rendered.text,
        idempotencyKey: idempotencyKeyFor(row.user_id),
      });
      acceptedId = result.id;
      await db.markSent(row.id, result.id);
      stats.sent += 1;
    } catch (error) {
      const reason = acceptedId
        ? `sent_but_finalize_failed: ${truncateError(error)}`
        : truncateError(error);
      try {
        await db.markFailed(row.id, reason, acceptedId);
      } catch (finalizeError) {
        log('mark failed failed', { rowId: row.id, error: truncateError(finalizeError) });
      }
      stats.failed += 1;
    }
  }

  // Counts only: never log addresses, names, keys, or headers.
  log('feedback batch complete', { ...stats });
  return stats;
}
