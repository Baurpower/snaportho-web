import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { CAMPAIGN_STEPS, type CampaignStep, type MarketingRecipient } from '../src/lib/marketing/types';
import { CAMPAIGN_CONFIG, isEligibleForCampaign, type CampaignProfile } from '../src/lib/marketing/segments';
import { renderMarketingEmail } from '../src/lib/marketing/templates';
import { deliverMarketingCampaignEmail } from '../src/lib/marketing/delivery';

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

function args(argv: string[]) {
  const campaignValue = argv.find((x) => x.startsWith('--campaign='))?.split('=')[1];
  if (!CAMPAIGN_STEPS.includes(campaignValue as CampaignStep)) throw new Error(`Use --campaign=${CAMPAIGN_STEPS.join('|')}`);
  const limit = Number(argv.find((x) => x.startsWith('--limit='))?.split('=')[1] ?? '100');
  return { campaign: campaignValue as CampaignStep, limit: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 500)) : 100, preview: argv.includes('--preview'), send: argv.includes('--send'), confirm: argv.find((x) => x.startsWith('--confirm='))?.split('=')[1] };
}

async function allRows(client: ReturnType<typeof createClient>, table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(columns).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as Record<string, unknown>[]));
    if (data.length < 1000) return rows;
  }
}

async function main() {
  loadEnv();
  const options = args(process.argv.slice(2));
  if (options.send && (process.env.BROBOT_MARKETING_SEND_ENABLED !== 'true' || options.confirm !== `SEND-${options.campaign}`)) {
    throw new Error(`Production sending is locked. Set BROBOT_MARKETING_SEND_ENABLED=true and pass --confirm=SEND-${options.campaign}`);
  }
  const config = CAMPAIGN_CONFIG[options.campaign];
  if (options.preview) {
    const dummy: MarketingRecipient = { userId: '00000000-0000-0000-0000-000000000000', email: 'preview@example.com', firstName: null, campaignStep: options.campaign, ...config };
    const rendered = renderMarketingEmail(dummy); const output = join(process.cwd(), `brobot-marketing-preview-${options.campaign}.html`); writeFileSync(output, rendered.html, 'utf8'); console.log(`Preview: ${output}`); return;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase admin configuration');
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const authUsers: { id: string; email?: string; email_confirmed_at?: string }[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    authUsers.push(...data.users);
    if (data.users.length < 1000) break;
  }
  const [profiles, usage, conversations, subscriptions, sends, optouts] = await Promise.all([
    allRows(supabase, 'user_profiles', 'user_id,email,full_name,receive_emails,is_profile_complete,marketing_unsubscribed_at'),
    allRows(supabase, 'brobot_usage_events', 'user_id,created_at'),
    allRows(supabase, 'brobot_conversations', 'user_id,created_at,updated_at'),
    allRows(supabase, 'subscriptions', 'user_id,plan_code,status,current_period_end'),
    allRows(supabase, 'lifecycle_emails', 'user_id,campaign_step,sent_at,send_status'),
    allRows(supabase, 'lifecycle_email_optouts', 'user_id,kind'),
  ]);
  const profileByUser = new Map(profiles.map((p) => [String(p.user_id), p]));
  const times = new Map<string, number[]>();
  for (const row of [...usage, ...conversations]) {
    if (!row.user_id) continue;
    const timestamp = new Date(String(row.updated_at ?? row.created_at)).getTime();
    if (Number.isFinite(timestamp)) times.set(String(row.user_id), [...(times.get(String(row.user_id)) ?? []), timestamp]);
  }
  const entitled = new Set(subscriptions.filter((s) => s.plan_code === 'unlimited_brobot' && ['active', 'trialing'].includes(String(s.status)) && new Date(String(s.current_period_end)).getTime() > Date.now()).map((s) => String(s.user_id)));
  const prior = new Map<string, Map<CampaignStep, number>>();
  for (const row of sends) if (row.user_id && row.campaign_step && row.send_status !== 'failed') {
    const map = prior.get(String(row.user_id)) ?? new Map<CampaignStep, number>();
    map.set(row.campaign_step as CampaignStep, new Date(String(row.sent_at)).getTime()); prior.set(String(row.user_id), map);
  }
  const suppressed = new Map<string, Set<string>>();
  for (const row of optouts) if (row.user_id) { const set = suppressed.get(String(row.user_id)) ?? new Set<string>(); set.add(row.kind === null ? '*' : String(row.kind)); suppressed.set(String(row.user_id), set); }

  const candidates: CampaignProfile[] = authUsers.map((user) => {
    const profile = profileByUser.get(user.id); const activity = times.get(user.id)?.sort((a, b) => a - b) ?? []; const priorStepAt = prior.get(user.id) ?? new Map();
    const name = typeof profile?.full_name === 'string' ? profile.full_name.trim().split(/\s+/)[0] : null;
    return { userId: user.id, email: String(user.email ?? '').trim().toLowerCase(), confirmed: Boolean(user.email_confirmed_at), receiveEmails: profile?.receive_emails === true && !profile?.marketing_unsubscribed_at, firstName: name || null, profileComplete: profile?.is_profile_complete === true, currentlyEntitled: entitled.has(user.id), firstUseAt: activity[0] ?? null, lastUseAt: activity.at(-1) ?? null, priorSteps: new Set(priorStepAt.keys()), priorStepAt, optedOutTopics: suppressed.get(user.id) ?? new Set() };
  }).filter((profile) => profile.email && isEligibleForCampaign(profile, options.campaign));
  console.log(JSON.stringify({ campaign: options.campaign, eligible: candidates.length, selected: Math.min(options.limit, candidates.length), mode: options.send ? 'send' : options.preview ? 'preview' : 'dry-run' }, null, 2));
  if (!options.send) return;
  let sent = 0, duplicate = 0, skipped = 0, failed = 0;
  for (const candidate of candidates.slice(0, options.limit)) {
    const recipient: MarketingRecipient = { userId: candidate.userId, email: candidate.email, firstName: candidate.firstName, campaignStep: options.campaign, ...config };
    try { const result = await deliverMarketingCampaignEmail(recipient); if (result.status === 'sent') sent += 1; else if (result.status === 'duplicate') duplicate += 1; else skipped += 1; } catch (error) { failed += 1; console.error(`[marketing] send failed for user=${candidate.userId.slice(0, 8)}: ${error instanceof Error ? error.message : String(error)}`); }
  }
  console.log(JSON.stringify({ sent, duplicate, skipped, failed }, null, 2));
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
