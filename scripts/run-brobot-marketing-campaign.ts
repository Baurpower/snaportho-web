import { resolveCampaignAddress, ADDRESS_HISTORY_COLUMNS } from '../src/lib/marketing/recipient-address';
import { campaignActivity, campaignHistory } from '../src/lib/marketing/audience-history';
import { doesSubscriptionGrantEntitlement } from '../src/lib/subscriptions/ledger';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { CAMPAIGN_STEPS, type CampaignStep, type MarketingRecipient } from '../src/lib/marketing/types';
import { CAMPAIGN_CONFIG, isEligibleForCampaign, type CampaignProfile } from '../src/lib/marketing/segments';
import { renderMarketingEmail } from '../src/lib/marketing/templates';
import { verifyMarketingDestinations } from '../src/lib/marketing/link-preflight';
import { setTimeout as pause } from 'node:timers/promises';
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
    const { data, error } = await client.from(table).select(columns).order(table === 'user_profiles' ? 'user_id' : 'id').range(from, from + 999);
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
  if (options.send) {
    if (!process.env.MARKETING_POSTAL_ADDRESS?.trim()) throw new Error('MARKETING_POSTAL_ADDRESS is required before sending');
    if (!process.env.RESEND_API_KEY?.trim() || !process.env.MARKETING_FROM_EMAIL?.trim()) throw new Error('Missing marketing sender configuration');
    renderMarketingEmail({ userId: '00000000-0000-0000-0000-000000000000', email: 'preview@example.com', firstName: null, campaignStep: options.campaign, ...config });
    await verifyMarketingDestinations(process.env.NEXT_PUBLIC_SITE_URL || 'https://snap-ortho.com');
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
    allRows(supabase, 'subscriptions', 'user_id,plan_code,status,current_period_end,provider'),
    allRows(supabase, 'lifecycle_emails', ADDRESS_HISTORY_COLUMNS),
    allRows(supabase, 'lifecycle_email_optouts', 'user_id,kind'),
  ]);
  const profileByUser = new Map(profiles.map((p) => [String(p.user_id), p]));
  const times = campaignActivity([...usage, ...conversations]);
  const entitled = new Set(subscriptions.filter((s) => s.plan_code === 'unlimited_brobot' && doesSubscriptionGrantEntitlement({ status: String(s.status), provider: s.provider as 'apple' | 'stripe', current_period_end: s.current_period_end as string | null })).map((s) => String(s.user_id)));
  const { attempted, prior } = campaignHistory(sends);
  const suppressed = new Map<string, Set<string>>();
  for (const row of optouts) if (row.user_id) { const set = suppressed.get(String(row.user_id)) ?? new Set<string>(); set.add(row.kind === null ? '*' : String(row.kind)); suppressed.set(String(row.user_id), set); }

  const deliveryByUser = new Map<string, Record<string, unknown>[]>();
  for (const row of sends) {
    const key = String(row.user_id);
    deliveryByUser.set(key, [...(deliveryByUser.get(key) ?? []), row]);
  }
  const addresses = new Map<string, NonNullable<ReturnType<typeof resolveCampaignAddress>>>();
  const candidates: CampaignProfile[] = authUsers.map((user) => {
    const profile = profileByUser.get(user.id); const activity = times.get(user.id)?.sort((a, b) => a - b) ?? []; const priorStepAt = prior.get(user.id) ?? new Map();
    const address = resolveCampaignAddress({ profileEmail: profile?.email, authEmail: user.email, authConfirmed: Boolean(user.email_confirmed_at), campaignKey: config.campaignKey, campaignStep: options.campaign, templateVersion: config.templateVersion, deliveries: deliveryByUser.get(user.id) ?? [] });
    if (address) addresses.set(user.id, address);
    const priorSteps = new Set(attempted.get(user.id) ?? []);
    if (address?.fallbackFromDeliveryId) priorSteps.delete(options.campaign);
    const name = typeof profile?.full_name === 'string' ? profile.full_name.trim().split(/\s+/)[0] : null;
    return { userId: user.id, email: address?.email ?? '', confirmed: Boolean(user.email_confirmed_at), receiveEmails: profile?.receive_emails === true && !profile?.marketing_unsubscribed_at, firstName: name || null, profileComplete: profile?.is_profile_complete === true, currentlyEntitled: entitled.has(user.id), firstUseAt: activity[0] ?? null, lastUseAt: activity.at(-1) ?? null, priorSteps, priorStepAt, optedOutTopics: suppressed.get(user.id) ?? new Set() };
  }).filter((profile) => profile.email && isEligibleForCampaign(profile, options.campaign));
  console.log(JSON.stringify({ campaign: options.campaign, eligible: candidates.length, selected: Math.min(options.limit, candidates.length), mode: options.send ? 'send' : options.preview ? 'preview' : 'dry-run' }, null, 2));
  if (!options.send) return;
  let sent = 0, duplicate = 0, skipped = 0, failed = 0;
  for (const [index, candidate] of candidates.slice(0, options.limit).entries()) {
    if (index > 0) await pause(1000);
    const recipient: MarketingRecipient = { userId: candidate.userId, email: candidate.email, firstName: candidate.firstName, campaignStep: options.campaign, ...config, ...addresses.get(candidate.userId)! };
    try { const result = await deliverMarketingCampaignEmail(recipient); if (result.status === 'sent') sent += 1; else if (result.status === 'duplicate') duplicate += 1; else skipped += 1; } catch (error) { failed += 1; console.error(`[marketing] send failed for user=${candidate.userId.slice(0, 8)}: ${error instanceof Error ? error.message : String(error)}`); break; }
  }
  console.log(JSON.stringify({ sent, duplicate, skipped, failed }, null, 2));
  if (failed) process.exitCode = 1;
}

main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exit(1); });
