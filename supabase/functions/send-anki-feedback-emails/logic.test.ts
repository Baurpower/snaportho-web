import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  firstNameFromFullName,
  idempotencyKeyFor,
  isUsableEmail,
  parseUserIdsFilter,
  renderFeedbackEmail,
  resolveRecipientEmail,
  runFeedbackBatch,
} from './logic.ts';
import type { ClaimedRow, DbClient } from './logic.ts';

// ---------------------------------------------------------------------------
// Part 1: migration + cron SQL structural checks.
// The sandbox has no Postgres/Docker/network, so these assert the shipped SQL
// carries the exact clauses the Part 2 fakes emulate (uniqueness, 24h rule,
// atomic claim, RLS, vault-only credentials).
// ---------------------------------------------------------------------------

const tableSql = readFileSync(
  'supabase/migrations/20260927190614_anki_feedback_email.sql',
  'utf8',
);
const cutoffSql = readFileSync(
  'supabase/migrations/20260927225531_anki_feedback_email_activation_cutoff.sql',
  'utf8',
);
const cronSql = readFileSync(
  'supabase/migrations/20260927214144_anki_feedback_email_cron.sql',
  'utf8',
);
const lowered = tableSql.toLowerCase();

for (const required of [
  'create table if not exists public.anki_feedback_emails',
  'user_id uuid not null unique',
  "check (status in ('pending', 'processing', 'sent', 'failed'))",
  'enable row level security',
  'revoke all on table public.anki_feedback_emails from anon, authenticated',
  'grant select, insert, update, delete on table public.anki_feedback_emails to service_role',
  'claim_anki_feedback_batch',
  'security definer',
  "set search_path = ''",
  'p_user_ids uuid[] default null',
  'revoke all on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) from anon, authenticated',
  'grant execute on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) to service_role',
]) {
  assert.ok(tableSql.includes(required), `table migration missing: ${required}`);
}
for (const required of [
  'for update skip locked',
  'on conflict on constraint anki_feedback_emails_user_id_key do nothing',
  "interval '24 hours'",
  "interval '30 minutes'",
  'min(l.exchanged_at)',
  'where l.exchanged_at is not null',
  'scheduled_for <= now()',
  'p_user_ids is null or l.user_id = any(p_user_ids)',
  'p_user_ids is null or f.user_id = any(p_user_ids)',
  'p_user_ids is null or inner_f.user_id = any(p_user_ids)',
]) {
  assert.ok(lowered.includes(required), `table migration missing: ${required}`);
}

for (const required of [
  'send-anki-feedback-emails-15min',
  '*/15 * * * *',
  'vault.decrypted_secrets',
  'anki_feedback_function_url',
  'anki_feedback_service_role_key',
  'net.http_post',
]) {
  assert.ok(cronSql.includes(required), `cron migration missing: ${required}`);
}
assert.ok(!/eyJ[A-Za-z0-9_-]{10}/.test(cronSql), 'cron SQL must not embed key material');
assert.ok(!/re_[A-Za-z0-9]{5}/.test(cronSql), 'cron SQL must not embed a Resend key');

// Cutoff migration: database-controlled activation gate, enforced in both
// the ensure step and the claim step (pre-existing pending rows for old
// users must never be claimed).
for (const required of [
  'create table if not exists public.anki_feedback_email_config',
  'activation_cutoff',
  '2026-09-27T22:55:00+00',
  'revoke all on table public.anki_feedback_email_config from anon, authenticated',
  'grant execute on function public.claim_anki_feedback_batch(integer, boolean, uuid[]) to service_role',
]) {
  assert.ok(cutoffSql.includes(required), `cutoff migration missing: ${required}`);
}
for (const required of [
  'having min(l.exchanged_at) >= cutoff',
  'f.device_linked_at >= cutoff',
  'inner_f.device_linked_at >= cutoff',
]) {
  assert.ok(cutoffSql.toLowerCase().includes(required), `cutoff migration missing: ${required}`);
}

// ---------------------------------------------------------------------------
// Part 2: behavior tests with an in-memory fake of the claim RPC contract.
// ---------------------------------------------------------------------------

const HOUR = 3_600_000;
const MINUTE = 60_000;

type Person = { profileEmail: string | null; authEmail: string | null; fullName: string | null };

type TrackRow = {
  id: string;
  user_id: string;
  device_linked_at: number;
  scheduled_for: number;
  sent_at: number | null;
  resend_email_id: string | null;
  status: 'pending' | 'processing' | 'sent' | 'failed';
  attempt_count: number;
  last_error: string | null;
  updated_at: number;
};

/** Faithful emulation of claim_anki_feedback_batch(): ensure + atomic claim. */
class FakeDb implements DbClient {
  links: Array<{ userId: string; exchangedAt: number }> = [];
  people = new Map<string, Person>();
  rows = new Map<string, TrackRow>();
  now: number;
  cutoff: number;
  failMarkSentOnce = false;

  constructor(now: number, cutoff = 0) {
    this.now = now;
    this.cutoff = cutoff;
  }

  private toClaimed(r: TrackRow): ClaimedRow {
    const p = this.people.get(r.user_id) ?? { profileEmail: null, authEmail: null, fullName: null };
    return {
      id: r.id,
      user_id: r.user_id,
      device_linked_at: new Date(r.device_linked_at).toISOString(),
      scheduled_for: new Date(r.scheduled_for).toISOString(),
      sent_at: r.sent_at === null ? null : new Date(r.sent_at).toISOString(),
      resend_email_id: r.resend_email_id,
      status: r.status,
      attempt_count: r.attempt_count,
      profile_email: p.profileEmail,
      auth_email: p.authEmail,
      full_name: p.fullName,
    };
  }

  async claimBatch(limit: number, dryRun: boolean, userIds: string[] | null): Promise<ClaimedRow[]> {
    const scoped = (userId: string) => userIds === null || userIds.includes(userId);
    // Ensure always runs (even for dry_run); only the claim is skipped.
    const earliest = new Map<string, number>();
    for (const l of this.links) {
      if (!scoped(l.userId)) continue;
      const prev = earliest.get(l.userId);
      if (prev === undefined || l.exchangedAt < prev) earliest.set(l.userId, l.exchangedAt);
    }
    for (const [userId, minAt] of earliest) {
      if (minAt < this.cutoff) continue; // activation gate: ensure step
      if (!this.rows.has(userId)) {
        this.rows.set(userId, {
          id: `row-${userId}`,
          user_id: userId,
          device_linked_at: minAt,
          scheduled_for: minAt + 24 * HOUR,
          sent_at: null,
          resend_email_id: null,
          status: 'pending',
          attempt_count: 0,
          last_error: null,
          updated_at: this.now,
        });
      }
    }
    const due = [...this.rows.values()]
      .filter(
        (r) =>
          scoped(r.user_id) &&
          r.device_linked_at >= this.cutoff && // activation gate: claim step
          r.scheduled_for <= this.now &&
          (r.status === 'pending' ||
            r.status === 'failed' ||
            (r.status === 'processing' && r.updated_at < this.now - 30 * MINUTE)),
      )
      .sort((a, b) => a.scheduled_for - b.scheduled_for)
      .slice(0, Math.min(Math.max(1, limit), 100));
    if (dryRun) return due.map((r) => this.toClaimed(r));
    for (const r of due) {
      r.status = 'processing';
      r.attempt_count += 1;
      r.updated_at = this.now;
    }
    return due.map((r) => this.toClaimed(r));
  }

  async markSent(id: string, resendId: string): Promise<void> {
    if (this.failMarkSentOnce) {
      this.failMarkSentOnce = false;
      throw new Error('simulated db outage on markSent');
    }
    const row = [...this.rows.values()].find((r) => r.id === id);
    assert.ok(row, 'markSent target must exist');
    row!.status = 'sent';
    row!.resend_email_id = resendId;
    row!.sent_at = this.now;
    row!.last_error = null;
    row!.updated_at = this.now;
  }

  async markFailed(id: string, error: string, resendId?: string | null): Promise<void> {
    const row = [...this.rows.values()].find((r) => r.id === id);
    assert.ok(row, 'markFailed target must exist');
    row!.status = 'failed';
    row!.last_error = error;
    if (resendId) row!.resend_email_id = resendId;
    row!.updated_at = this.now;
  }
}

type SentCall = { to: string; subject: string; html: string; text: string; idempotencyKey: string };

function makeResend(script: Array<{ ok: boolean; id?: string; message?: string }>) {
  const calls: SentCall[] = [];
  let n = 0;
  return {
    calls,
    async send(input: SentCall): Promise<{ id: string }> {
      calls.push(input);
      const step = script[Math.min(n, script.length - 1)] ?? { ok: true };
      n += 1;
      if (!step.ok) throw new Error(step.message ?? 'resend boom');
      return { id: step.id ?? `re_call${n}` };
    },
  };
}

const NOW = new Date('2026-09-27T12:00:00Z').getTime();
const person = (over: Partial<Person> = {}): Person => ({
  profileEmail: 'alex@example.com',
  authEmail: 'alex@example.com',
  fullName: 'Alex Baur',
  ...over,
});

// --- Test A: linked < 24h ago -> no email, row pending for the future ---
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-a', exchangedAt: NOW - 1 * HOUR }];
  db.people.set('u-a', person());
  const resend = makeResend([{ ok: true }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 0);
  assert.deepEqual(stats, {
    eligible: 0, attempted: 0, sent: 0, failed: 0, skipped: 0, recovered: 0, dryRun: false,
  });
  const row = db.rows.get('u-a')!;
  assert.equal(row.status, 'pending');
  assert.equal(row.sent_at, null);
  assert.equal(row.scheduled_for, NOW - 1 * HOUR + 24 * HOUR);
  console.log('ok - Test A (linked <24h: no email)');
}

// --- Test B: linked > 24h ago, never emailed -> exactly one email ---
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-b', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-b', person({ fullName: 'Becca Lee' }));
  const resend = makeResend([{ ok: true, id: 're_one' }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 1);
  assert.equal(resend.calls[0].to, 'alex@example.com');
  assert.equal(resend.calls[0].subject, 'SnapOrtho Anki feedback');
  assert.equal(resend.calls[0].idempotencyKey, 'anki-beta-feedback:u-b');
  assert.deepEqual(stats, {
    eligible: 1, attempted: 1, sent: 1, failed: 0, skipped: 0, recovered: 0, dryRun: false,
  });
  const row = db.rows.get('u-b')!;
  assert.equal(row.status, 'sent');
  assert.equal(row.resend_email_id, 're_one');
  assert.ok(row.sent_at !== null);
  assert.equal(row.last_error, null);

  // --- Test C: run again -> no second email ---
  const stats2 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 1);
  assert.equal(stats2.eligible, 0);
  assert.equal(stats2.sent, 0);
  console.log('ok - Test B (one email) + Test C (idempotent re-run)');
}

// --- Test D: two devices -> exactly one email on the earliest link ---
{
  const db = new FakeDb(NOW);
  db.links = [
    { userId: 'u-d', exchangedAt: NOW - 26 * HOUR },
    { userId: 'u-d', exchangedAt: NOW - 30 * HOUR },
  ];
  db.people.set('u-d', person());
  const resend = makeResend([{ ok: true }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 1);
  assert.equal(stats.sent, 1);
  assert.equal(db.rows.get('u-d')!.device_linked_at, NOW - 30 * HOUR);
  console.log('ok - Test D (two devices, earliest link wins)');
}

// --- Test E: Resend fails -> logged, sent_at null, retry later succeeds ---
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-e', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-e', person());
  const resend = makeResend([
    { ok: false, message: 'resend 500 upstream' },
    { ok: true, id: 're_retry' },
  ]);
  const s1 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(s1.failed, 1);
  assert.equal(s1.sent, 0);
  const row = db.rows.get('u-e')!;
  assert.equal(row.status, 'failed');
  assert.equal(row.sent_at, null);
  assert.equal(row.resend_email_id, null);
  assert.ok(row.last_error!.includes('resend 500 upstream'));

  db.now = NOW + 15 * MINUTE; // next cron tick
  const s2 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(s2.sent, 1);
  assert.equal(db.rows.get('u-e')!.status, 'sent');
  assert.equal(db.rows.get('u-e')!.resend_email_id, 're_retry');
  // Stable idempotency key across the retry.
  assert.equal(resend.calls[0].idempotencyKey, resend.calls[1].idempotencyKey);
  console.log('ok - Test E (failure logged + retryable, stable idempotency key)');
}

// --- Test F: no usable first name -> "Hi there," ---
for (const fullName of [null, '', '   ', '12345']) {
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-f', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-f', person({ fullName }));
  const resend = makeResend([{ ok: true }]);
  await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.ok(resend.calls[0].text.startsWith('Hi there,\n'), `text greeting for ${String(fullName)}`);
  assert.ok(resend.calls[0].html.includes('<p>Hi there,</p>'), `html greeting for ${String(fullName)}`);
}
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-f2', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-f2', person({ fullName: '  Maria del Carmen  ' }));
  const resend = makeResend([{ ok: true }]);
  await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.ok(resend.calls[0].text.startsWith('Hi Maria,\n'));
  console.log('ok - Test F (name fallback + first-token derivation)');
}

// --- Test G: no valid email -> skip safely, batch continues ---
{
  const db = new FakeDb(NOW);
  db.links = [
    { userId: 'u-g-bad', exchangedAt: NOW - 25 * HOUR },
    { userId: 'u-g-good', exchangedAt: NOW - 26 * HOUR },
  ];
  db.people.set('u-g-bad', person({ profileEmail: 'not-an-email', authEmail: 'also bad' }));
  db.people.set('u-g-good', person());
  const resend = makeResend([{ ok: true }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 1);
  assert.equal(resend.calls[0].to, 'alex@example.com');
  assert.equal(stats.sent, 1);
  assert.equal(stats.skipped, 1);
  const bad = db.rows.get('u-g-bad')!;
  assert.equal(bad.status, 'failed');
  assert.equal(bad.last_error, 'no_valid_email_address');
  assert.equal(bad.sent_at, null);
  console.log('ok - Test G (invalid email skipped, batch continues)');
}

// --- Recovery: provider id already stored -> finalize without re-sending ---
{
  const db = new FakeDb(NOW);
  db.rows.set('u-r', {
    id: 'row-u-r', user_id: 'u-r', device_linked_at: NOW - 25 * HOUR,
    scheduled_for: NOW - 1 * HOUR, sent_at: null, resend_email_id: 're_accepted',
    status: 'processing', attempt_count: 1, last_error: null, updated_at: NOW - 31 * MINUTE,
  });
  db.people.set('u-r', person());
  const resend = makeResend([{ ok: true }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 0);
  assert.equal(stats.sent, 1);
  assert.equal(stats.recovered, 1);
  assert.equal(db.rows.get('u-r')!.status, 'sent');
  console.log('ok - recovery (accepted-but-unrecorded send finalized, no duplicate)');
}

// --- Fresh processing rows are left alone (concurrent execution safety) ---
{
  const db = new FakeDb(NOW);
  db.rows.set('u-p', {
    id: 'row-u-p', user_id: 'u-p', device_linked_at: NOW - 25 * HOUR,
    scheduled_for: NOW - 1 * HOUR, sent_at: null, resend_email_id: null,
    status: 'processing', attempt_count: 1, last_error: null, updated_at: NOW - 1 * MINUTE,
  });
  db.people.set('u-p', person());
  const resend = makeResend([{ ok: true }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(stats.eligible, 0);
  assert.equal(resend.calls.length, 0);
  console.log('ok - fresh processing lease not stolen');
}

// --- Accept-then-markSent-failure preserves the provider id, then recovers ---
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-m', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-m', person());
  db.failMarkSentOnce = true;
  const resend = makeResend([{ ok: true, id: 're_kept' }]);
  const s1 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(s1.failed, 1);
  assert.equal(db.rows.get('u-m')!.resend_email_id, 're_kept');
  assert.ok(db.rows.get('u-m')!.last_error!.startsWith('sent_but_finalize_failed:'));
  const s2 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(resend.calls.length, 1, 'recovery must not call Resend again');
  assert.equal(s2.recovered, 1);
  assert.equal(db.rows.get('u-m')!.status, 'sent');
  console.log('ok - accept/finalize race preserved + recovered');
}

// --- dry_run previews faithfully: ensures rows but claims/sends nothing ---
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-dry', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-dry', person());
  const resend = makeResend([{ ok: true }]);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send, dryRun: true });
  assert.equal(stats.dryRun, true);
  assert.equal(stats.eligible, 1);
  assert.equal(stats.attempted, 0);
  assert.equal(resend.calls.length, 0);
  const row = db.rows.get('u-dry')!;
  assert.equal(row.status, 'pending');
  assert.equal(row.attempt_count, 0);
  console.log('ok - dry_run previews without claiming or sending');
}

// --- Unit checks: email resolution, names, rendering, key format ---
{
  assert.equal(resolveRecipientEmail('  A@Example.com ', 'b@example.com'), 'A@Example.com');
  assert.equal(resolveRecipientEmail('bad', 'good@example.com'), 'good@example.com');
  assert.equal(resolveRecipientEmail(null, null), null);
  assert.equal(resolveRecipientEmail('', '  '), null);
  assert.equal(isUsableEmail('a@b.co'), true);
  assert.equal(isUsableEmail('a@b'), false);

  assert.equal(firstNameFromFullName('Alex Baur'), 'Alex');
  assert.equal(firstNameFromFullName(null), null);
  assert.equal(firstNameFromFullName(''), null);
  assert.equal(firstNameFromFullName('x'.repeat(51)), null);
  assert.equal(idempotencyKeyFor('user-1'), 'anki-beta-feedback:user-1');

  const named = renderFeedbackEmail('Alex');
  assert.equal(named.subject, 'SnapOrtho Anki feedback');
  assert.ok(named.text.includes('Hi Alex,'));
  assert.ok(named.text.includes('(916) 521-0352'));
  assert.ok(named.text.includes('alexbaur@snap-ortho.com'));
  assert.ok(!named.html.includes('<button'), 'no buttons');
  assert.ok(!named.html.includes('<img'), 'no images');

  const tricky = renderFeedbackEmail('<Becca>');
  assert.ok(tricky.html.includes('&lt;Becca&gt;'), 'html-escaped greeting');
  assert.ok(tricky.text.includes('Hi <Becca>,'), 'plain-text keeps raw name');
  console.log('ok - unit checks (resolution, names, rendering, escaping)');
}

// --- One failing row must not stop the batch; claim failure still throws ---
{
  const db = new FakeDb(NOW);
  db.links = [
    { userId: 'u-h1', exchangedAt: NOW - 25 * HOUR },
    { userId: 'u-h2', exchangedAt: NOW - 26 * HOUR },
  ];
  db.people.set('u-h1', person());
  db.people.set('u-h2', person());
  let calls = 0;
  const stats = await runFeedbackBatch({
    db,
    sendEmail: async (input) => {
      calls += 1;
      if (input.idempotencyKey.endsWith('u-h1')) throw new Error('u1 down');
      return { id: 're_h2' };
    },
  });
  assert.equal(calls, 2);
  assert.equal(stats.sent, 1);
  assert.equal(stats.failed, 1);

  const exploding: DbClient = {
    claimBatch: async () => { throw new Error('db down'); },
    markSent: async () => {},
    markFailed: async () => {},
  };
  await assert.rejects(() => runFeedbackBatch({ db: exploding, sendEmail: async () => ({ id: 'x' }) }), /db down/);
  console.log('ok - batch isolation + claim errors propagate');
}

// --- user_ids filter scopes manual runs; null keeps the cron default ---
{
  assert.equal(parseUserIdsFilter(undefined), null);
  assert.equal(parseUserIdsFilter(null), null);
  assert.equal(parseUserIdsFilter([]), null);
  assert.equal(parseUserIdsFilter('  '), null);
  assert.deepEqual(
    parseUserIdsFilter(['4b0a7080-ee4c-49ce-ba51-617759c1f985']),
    ['4b0a7080-ee4c-49ce-ba51-617759c1f985'],
  );
  assert.deepEqual(
    parseUserIdsFilter('4b0a7080-ee4c-49ce-ba51-617759c1f985, 7b086820-900d-44bf-baf3-8056348a4310'),
    ['4b0a7080-ee4c-49ce-ba51-617759c1f985', '7b086820-900d-44bf-baf3-8056348a4310'],
  );
  assert.throws(() => parseUserIdsFilter(['not-a-uuid']), /invalid uuid/);
  assert.throws(
    () => parseUserIdsFilter(new Array(26).fill('4b0a7080-ee4c-49ce-ba51-617759c1f985')),
    /at most 25/,
  );

  const db = new FakeDb(NOW);
  db.links = [
    { userId: 'u-keep', exchangedAt: NOW - 25 * HOUR },
    { userId: 'u-drop', exchangedAt: NOW - 26 * HOUR },
  ];
  db.people.set('u-keep', person());
  db.people.set('u-drop', person());
  const resend = makeResend([{ ok: true }]);
  const preview = await runFeedbackBatch({ db, sendEmail: resend.send, dryRun: true, userIds: ['u-keep'] });
  assert.equal(preview.eligible, 1);
  assert.equal(db.rows.has('u-drop'), false);
  const stats = await runFeedbackBatch({ db, sendEmail: resend.send, userIds: ['u-keep'] });
  assert.equal(stats.sent, 1);
  assert.equal(resend.calls.length, 1);
  assert.equal(db.rows.get('u-keep')!.status, 'sent');
  assert.equal(db.rows.has('u-drop'), false);
  console.log('ok - user_ids filter scopes ensure+claim+send');
}

// --- Activation cutoff: old users excluded, new users flow through ---
{
  const CUTOFF = NOW - 1 * HOUR; // activation one hour ago
  const db = new FakeDb(NOW, CUTOFF);
  db.links = [
    { userId: 'u-old', exchangedAt: NOW - 25 * HOUR }, // past due but pre-cutoff
    { userId: 'u-new', exchangedAt: NOW - 30 * MINUTE }, // post-cutoff, not due
  ];
  db.people.set('u-old', person());
  db.people.set('u-new', person());
  // Pre-existing pending row for the old user (mirrors production backlog).
  db.rows.set('u-old', {
    id: 'row-u-old', user_id: 'u-old', device_linked_at: NOW - 25 * HOUR,
    scheduled_for: NOW - 1 * HOUR, sent_at: null, resend_email_id: null,
    status: 'pending', attempt_count: 0, last_error: null, updated_at: NOW - 1 * HOUR,
  });
  const resend = makeResend([{ ok: true }]);
  const s1 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(s1.eligible, 0);
  assert.equal(resend.calls.length, 0);
  // Old user keeps its inert pending row; new user is ensured for the future.
  assert.equal(db.rows.get('u-old')!.status, 'pending');
  const fresh = db.rows.get('u-new')!;
  assert.equal(fresh.status, 'pending');
  assert.equal(fresh.scheduled_for, NOW - 30 * MINUTE + 24 * HOUR);

  // 24h later the new user becomes due and gets exactly one email.
  db.now = NOW + 24 * HOUR;
  const s2 = await runFeedbackBatch({ db, sendEmail: resend.send });
  assert.equal(s2.eligible, 1);
  assert.equal(s2.sent, 1);
  assert.equal(resend.calls.length, 1);
  assert.equal(db.rows.get('u-new')!.status, 'sent');
  assert.equal(db.rows.get('u-old')!.status, 'pending');
  console.log('ok - activation cutoff excludes backlog, admits future users');
}

// --- Logs carry counts only: no addresses, names, keys, or headers ---
{
  const db = new FakeDb(NOW);
  db.links = [{ userId: 'u-L', exchangedAt: NOW - 25 * HOUR }];
  db.people.set('u-L', person({ profileEmail: 'secret-person@example.com', fullName: 'Secretperson' }));
  const lines: string[] = [];
  await runFeedbackBatch({
    db,
    sendEmail: async () => ({ id: 're_log' }),
    log: (message, detail) => lines.push(JSON.stringify({ message, detail })),
  });
  const blob = lines.join('\n');
  assert.ok(!blob.includes('secret-person@example.com'), 'address must not be logged');
  assert.ok(!blob.includes('Secretperson'), 'name must not be logged');
  assert.ok(!blob.includes('re_log'), 'provider id must not be logged');
  assert.ok(blob.includes('feedback batch complete'), 'completion summary logged');
  console.log('ok - log hygiene (counts only)');
}

console.log('send-anki-feedback-emails: all tests passed');
