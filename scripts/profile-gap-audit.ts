/**
 * READ-ONLY profile-gap + re-engagement audit.
 * No sends, no writes. Mirrors the marketing runner's data model
 * (see scripts/run-brobot-marketing-campaign.ts) so the numbers line up
 * with who a real campaign could actually reach.
 *
 * Run: node --experimental-strip-types --experimental-loader ./tmp/alias-loader.mjs scripts/profile-gap-audit.ts
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { doesSubscriptionGrantEntitlement } from '../src/lib/subscriptions/ledger';
import { campaignActivity } from '../src/lib/marketing/audience-history';

function loadEnv() {
  for (const filename of ['.env.local', '.env']) {
    const path = join(process.cwd(), filename);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match || process.env[match[1]]) continue;
      process.env[match[1]] = match[2].trim().replace(/^['"]|['"]$/g, '');
    }
  }
}

type Row = Record<string, unknown>;

async function allRows(client: ReturnType<typeof createClient>, table: string, columns: string, orderCol: string) {
  const rows: Row[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).order(orderCol).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as Row[]));
    if (data.length < 1000) return rows;
  }
}

const DAY = 86_400_000;
const blank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '');

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin configuration');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const now = Date.now();

  // Auth users (source of truth for the account universe + confirmation).
  const authUsers: { id: string; email?: string; email_confirmed_at?: string }[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }

  const soft = (t: string, cols: string, order: string) => allRows(supabase, t, cols, order).catch((e) => { console.warn(`${t} skipped:`, e.message); return [] as Row[]; });
  const [profiles, swProfiles, usage, conversations, subscriptions, optouts,
    productEvents, dailyUsage, caseprepRuns, caseprepEvents, ankiSessions, readingEvents] = await Promise.all([
    allRows(supabase, 'user_profiles', 'user_id,receive_emails,marketing_unsubscribed_at,is_profile_complete,training_level,grad_year,institution,subspecialty_interest', 'user_id'),
    soft('student_workspace_profiles', 'user_id,expected_graduation_year', 'user_id'),
    allRows(supabase, 'brobot_usage_events', 'user_id,created_at', 'user_id'),
    allRows(supabase, 'brobot_conversations', 'user_id,created_at,updated_at', 'user_id'),
    allRows(supabase, 'subscriptions', 'user_id,plan_code,status,current_period_end,provider', 'user_id'),
    allRows(supabase, 'lifecycle_email_optouts', 'user_id,kind', 'user_id'),
    // Cross-app activity signals (all read-only, soft-fail if absent):
    soft('product_events', 'user_id,occurred_at,product_area', 'occurred_at'),
    soft('user_daily_usage', 'user_id,usage_date,feature', 'usage_date'),
    soft('caseprep_runs', 'user_id,created_at', 'created_at'),
    soft('caseprep_packet_events', 'user_id,occurred_at', 'occurred_at'),
    soft('brobot_anki_study_sessions', 'user_id,created_at,updated_at', 'created_at'),
    soft('brobot_reading_events', 'user_id,created_at', 'created_at'),
  ]);

  const profileByUser = new Map(profiles.map((p) => [String(p.user_id), p]));
  const swGradByUser = new Map(swProfiles.map((p) => [String(p.user_id), p.expected_graduation_year]));
  // Brobot-only signal (what the real runner currently sees).
  const activity = campaignActivity([...usage, ...conversations]);
  // True cross-app last-active per user, plus which apps each user has touched.
  const crossLast = new Map<string, number>();
  const appsByUser = new Map<string, Set<string>>();
  const bump = (uid: unknown, ts: unknown, app: string) => {
    if (!uid) return;
    const t = new Date(String(ts)).getTime();
    if (!Number.isFinite(t)) return;
    const k = String(uid);
    crossLast.set(k, Math.max(crossLast.get(k) ?? 0, t));
    const s = appsByUser.get(k) ?? new Set<string>(); s.add(app); appsByUser.set(k, s);
  };
  for (const r of usage) bump(r.user_id, r.created_at, 'brobot');
  for (const r of conversations) { bump(r.user_id, r.created_at, 'brobot'); bump(r.user_id, r.updated_at, 'brobot'); }
  for (const r of readingEvents) bump(r.user_id, r.created_at, 'brobot');
  for (const r of productEvents) bump(r.user_id, r.occurred_at, String(r.product_area || 'product'));
  for (const r of dailyUsage) bump(r.user_id, r.usage_date, String(r.feature || 'daily'));
  for (const r of caseprepRuns) bump(r.user_id, r.created_at, 'caseprep');
  for (const r of caseprepEvents) bump(r.user_id, r.occurred_at, 'caseprep');
  for (const r of ankiSessions) { bump(r.user_id, r.created_at, 'anki'); bump(r.user_id, r.updated_at, 'anki'); }
  const entitled = new Set(
    subscriptions
      .filter((s) => s.plan_code === 'unlimited_brobot' && doesSubscriptionGrantEntitlement({ status: String(s.status), provider: s.provider as 'apple' | 'stripe', current_period_end: s.current_period_end as string | null }))
      .map((s) => String(s.user_id)),
  );
  const suppressed = new Map<string, Set<string>>();
  for (const row of optouts) if (row.user_id) {
    const set = suppressed.get(String(row.user_id)) ?? new Set<string>();
    set.add(row.kind === null ? '*' : String(row.kind));
    suppressed.set(String(row.user_id), set);
  }

  const c = {
    total: authUsers.length,
    withProfileRow: 0,
    confirmed: 0,
    mailable: 0, // confirmed + receive_emails + not unsubscribed + not entitled + not opted out of product_updates
    // gaps over ALL users
    gapTraining: 0, gapGrad: 0, gapEither: 0, gapBoth: 0,
    // gaps over MAILABLE users (the addressable profile-completion audience)
    mailableGapTraining: 0, mailableGapGrad: 0, mailableGapEither: 0,
    isProfileCompleteButGap: 0, // is_profile_complete=true yet still missing a target field
    // activity buckets (over mailable, non-entitled)
    actActive: 0, actCooling: 0, actLapsed: 0, actDormant: 0,
    // re-engagement audience: mailable, lastUse >= 30d
    reengage: 0,
    // profile-completion addressable: mailable AND missing either target field
    profileCompletionAudience: 0,
    entitled: 0,
    swGradPresent: 0,
    // TRUE cross-app activity buckets (over mailable, non-entitled)
    xActive: 0, xCooling: 0, xLapsed: 0, xDormant: 0, xReengage: 0,
    // consent tiers (all confirmed, non-entitled accounts)
    cOptInTrue: 0,      // receive_emails === true  (current mailable base)
    cNeverIndicated: 0, // receive_emails null/undefined AND no explicit unsub  <- the "email everyone" expansion
    cExplicitFalse: 0,  // receive_emails === false  (respect: exclude)
    cUnsubbed: 0,       // marketing_unsubscribed_at set OR opted out (respect: exclude)
    // expanded profile-completion audience if we include "never indicated"
    expandedProfileCompletion: 0,
  };
  const appReach = new Map<string, number>(); // app -> # users who ever touched it

  for (const user of authUsers) {
    const p = profileByUser.get(user.id);
    if (p) c.withProfileRow += 1;
    const confirmed = Boolean(user.email_confirmed_at);
    if (confirmed) c.confirmed += 1;
    if (entitled.has(user.id)) c.entitled += 1;

    const swGrad = swGradByUser.get(user.id);
    if (!blank(swGrad)) c.swGradPresent += 1;

    // Grad year is considered present if EITHER user_profiles.grad_year OR
    // student_workspace_profiles.expected_graduation_year is set.
    const missingTraining = blank(p?.training_level);
    const missingGrad = blank(p?.grad_year) && blank(swGrad);
    const missingEither = missingTraining || missingGrad;
    const missingBoth = missingTraining && missingGrad;

    if (missingTraining) c.gapTraining += 1;
    if (missingGrad) c.gapGrad += 1;
    if (missingEither) c.gapEither += 1;
    if (missingBoth) c.gapBoth += 1;
    if (p?.is_profile_complete === true && missingEither) c.isProfileCompleteButGap += 1;

    const opted = suppressed.get(user.id) ?? new Set<string>();
    const explicitUnsub = Boolean(p?.marketing_unsubscribed_at) || opted.has('*') || opted.has('product_updates');

    // Consent tiers (confirmed, non-entitled only — the only accounts worth classifying).
    if (confirmed && !entitled.has(user.id)) {
      if (explicitUnsub) c.cUnsubbed += 1;
      else if (p?.receive_emails === true) c.cOptInTrue += 1;
      else if (p?.receive_emails === false) c.cExplicitFalse += 1;
      else c.cNeverIndicated += 1; // null / no row
    }

    // Per-app reach (over everyone).
    for (const app of appsByUser.get(user.id) ?? []) appReach.set(app, (appReach.get(app) ?? 0) + 1);

    // "Never indicated" expansion for profile-completion: confirmed, not explicitly unsubbed,
    // not entitled, receive_emails not false, and missing a target field.
    if (confirmed && !entitled.has(user.id) && !explicitUnsub && p?.receive_emails !== false && missingEither) {
      c.expandedProfileCompletion += 1;
    }

    const mailable =
      confirmed &&
      p?.receive_emails === true &&
      !p?.marketing_unsubscribed_at &&
      !entitled.has(user.id) &&
      !opted.has('*') &&
      !opted.has('product_updates');
    if (!mailable) continue;
    c.mailable += 1;

    // True cross-app buckets for this mailable user.
    const xLast = crossLast.get(user.id) ?? 0;
    if (!xLast) c.xDormant += 1;
    else {
      const age = now - xLast;
      if (age <= 30 * DAY) c.xActive += 1;
      else if (age <= 90 * DAY) c.xCooling += 1;
      else c.xLapsed += 1;
      if (age >= 30 * DAY) c.xReengage += 1;
    }

    if (missingTraining) c.mailableGapTraining += 1;
    if (missingGrad) c.mailableGapGrad += 1;
    if (missingEither) { c.mailableGapEither += 1; c.profileCompletionAudience += 1; }

    const times = activity.get(user.id) ?? [];
    const lastUse = times.length ? Math.max(...times) : null;
    if (lastUse === null) c.actDormant += 1;
    else {
      const age = now - lastUse;
      if (age <= 30 * DAY) c.actActive += 1;
      else if (age <= 90 * DAY) c.actCooling += 1;
      else c.actLapsed += 1;
      if (age >= 30 * DAY) c.reengage += 1;
    }
  }

  const pct = (n: number, d: number) => (d ? `${((n / d) * 100).toFixed(1)}%` : 'n/a');
  const report = { generatedAt: new Date().toISOString(), counts: c, appReach: Object.fromEntries([...appReach.entries()].sort((a, b) => b[1] - a[1])), rates: {
    withProfileRow: pct(c.withProfileRow, c.total),
    confirmed: pct(c.confirmed, c.total),
    mailable: pct(c.mailable, c.total),
    gapTraining_ofAll: pct(c.gapTraining, c.total),
    gapGrad_ofAll: pct(c.gapGrad, c.total),
    gapEither_ofAll: pct(c.gapEither, c.total),
    mailableGapEither_ofMailable: pct(c.mailableGapEither, c.mailable),
  }};

  const out = join(process.cwd(), 'reports', 'profile-gap-audit.json');
  writeFileSync(out, JSON.stringify(report, null, 2), 'utf8');

  console.log('\n=== SnapOrtho profile-gap + re-engagement audit (READ ONLY) ===\n');
  console.log(`Total auth accounts .............. ${c.total}`);
  console.log(`  with user_profiles row ......... ${c.withProfileRow} (${pct(c.withProfileRow, c.total)})`);
  console.log(`  email-confirmed ................ ${c.confirmed} (${pct(c.confirmed, c.total)})`);
  console.log(`  entitled (paying, excluded) .... ${c.entitled}`);
  console.log(`  MAILABLE (campaign-reachable) .. ${c.mailable} (${pct(c.mailable, c.total)})`);
  console.log('\n-- Gaps across ALL accounts --');
  console.log(`  missing training_level ......... ${c.gapTraining} (${pct(c.gapTraining, c.total)})`);
  console.log(`  missing grad year (either tbl) . ${c.gapGrad} (${pct(c.gapGrad, c.total)})`);
  console.log(`  missing EITHER ................. ${c.gapEither} (${pct(c.gapEither, c.total)})`);
  console.log(`  missing BOTH .................. ${c.gapBoth} (${pct(c.gapBoth, c.total)})`);
  console.log(`  is_profile_complete=true but still missing a target field: ${c.isProfileCompleteButGap}`);
  console.log(`  (student_workspace grad year present: ${c.swGradPresent})`);
  console.log('\n-- Addressable PROFILE-COMPLETION audience (mailable AND missing a field) --');
  console.log(`  total ......................... ${c.profileCompletionAudience}`);
  console.log(`  missing training_level ........ ${c.mailableGapTraining}`);
  console.log(`  missing grad year ............. ${c.mailableGapGrad}`);
  console.log('\n-- Activity buckets (mailable, non-entitled) --');
  console.log(`  active   (<=30d) .............. ${c.actActive}`);
  console.log(`  cooling  (30-90d) ............. ${c.actCooling}`);
  console.log(`  lapsed   (>90d) ............... ${c.actLapsed}`);
  console.log(`  dormant  (never used) ......... ${c.actDormant}`);
  console.log('\n-- Activity buckets (TRUE cross-app: brobot+product_events+daily+caseprep+anki) --');
  console.log(`  active   (<=30d) .............. ${c.xActive}`);
  console.log(`  cooling  (30-90d) ............. ${c.xCooling}`);
  console.log(`  lapsed   (>90d) ............... ${c.xLapsed}`);
  console.log(`  dormant  (never, any app) ..... ${c.xDormant}`);
  console.log('\n-- Addressable RE-ENGAGEMENT audience --');
  console.log(`  brobot-only lastUse >= 30d .... ${c.reengage}`);
  console.log(`  cross-app  lastUse >= 30d ..... ${c.xReengage}`);
  console.log('\n-- Per-app reach (users who EVER touched each app, all accounts) --');
  for (const [app, n] of [...appReach.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${app.padEnd(24)} ${n}`);
  console.log('\n-- Consent tiers (confirmed, non-entitled) --');
  console.log(`  opted in (receive_emails=true) ........... ${c.cOptInTrue}  <- current mailable base`);
  console.log(`  NEVER indicated (null/no row) ............ ${c.cNeverIndicated}  <- "email everyone" expansion`);
  console.log(`  explicitly OFF (receive_emails=false) .... ${c.cExplicitFalse}  <- MUST exclude`);
  console.log(`  unsubscribed / opted out ................. ${c.cUnsubbed}  <- MUST exclude`);
  console.log('\n-- Profile-completion audience, two scopes --');
  console.log(`  opted-in only ......................... ${c.profileCompletionAudience}`);
  console.log(`  + never-indicated (your expanded ask) . ${c.expandedProfileCompletion}`);
  console.log(`\nJSON written: ${out}\n`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
