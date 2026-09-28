import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';

import { createAdminClient } from '@/lib/supabase/admin';
import { doesSubscriptionGrantEntitlement } from '@/lib/subscriptions/ledger';
import { campaignActivity, campaignHistory, productCampaignActivity } from '@/lib/marketing/audience-history';
import { verifyMarketingDestinations } from '@/lib/marketing/link-preflight';
import {
  isAuthorizedMarketingScheduler,
  isMarketingAutomationWindowOpen,
  MARKETING_AUTOMATION_DAILY_CAP,
  marketingAutomationBlockReason,
  marketingDailyQuotaStatus,
} from '@/lib/marketing/automation';
import { resolveCampaignAddress, ADDRESS_HISTORY_COLUMNS } from '@/lib/marketing/recipient-address';
import { CAMPAIGN_CONFIG, campaignIneligibilityReason, type CampaignProfile } from '@/lib/marketing/segments';
import { deliverMarketingCampaignEmail } from '@/lib/marketing/delivery';
import { setTimeout as pause } from 'node:timers/promises';
import type { CampaignStep, MarketingRecipient } from '@/lib/marketing/types';

export const runtime = 'nodejs';
export const maxDuration = 300;

const AUTOMATED_STEPS: CampaignStep[] = ['anki_activation_1', 'caseprep_activation_1', 'activation_1'];
const PRODUCT_EVENT_NAMES = [
  'brobot_request_completed',
  'caseprep_started',
  'caseprep_first_section_rendered',
  'caseprep_completed',
  'caseprep_failed',
  'anki_addon_first_downloaded',
];
const LOOKBACK = 31 * 86_400_000;

async function allRows(client: ReturnType<typeof createAdminClient>, table: string, columns: string) {
  const rows: Record<string, unknown>[] = [];
  for (let from = 0; ; from += 1000) {
    const orderBy = table === 'user_profiles' || table === 'student_workspace_profiles'
      ? 'user_id'
      : table === 'product_events' ? 'event_id' : 'id';
    let query = client.from(table).select(columns).order(orderBy).range(from, from + 999);
    if (table === 'product_events') {
      query = query.gte('occurred_at', new Date(Date.now() - LOOKBACK).toISOString()).in('event_name', PRODUCT_EVENT_NAMES);
    }
    const { data, error } = await query;
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < 1000) return rows;
  }
}

function gateFlags() {
  return {
    automationEnabled: process.env.MARKETING_AUTOMATION_ENABLED === 'true',
    sendEnabled: process.env.BROBOT_MARKETING_SEND_ENABLED === 'true',
    deliveryHealthApproved: process.env.MARKETING_DELIVERY_HEALTH_APPROVED === 'true',
    quotaApproved: process.env.MARKETING_AUTOMATION_QUOTA_APPROVED === 'true',
    schedulerSecretConfigured: Boolean(process.env.MARKETING_SCHEDULER_SECRET?.trim()),
  };
}

function unavailable(reason: string) {
  return NextResponse.json({ disabled: true, reason }, { status: 503 });
}

export async function POST(request: Request) {
  if (!isAuthorizedMarketingScheduler(request, process.env.MARKETING_SCHEDULER_SECRET)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const flags = gateFlags();
  const pausedReason = marketingAutomationBlockReason({
    ...flags,
    deliveries: [],
    pendingWebhookCount: 0,
  });
  if (pausedReason && pausedReason !== 'delivery_health_data_missing') return unavailable(pausedReason);
  if (!isMarketingAutomationWindowOpen()) {
    return NextResponse.json({ disabled: true, reason: 'outside_scheduled_window' }, { status: 409 });
  }
  if (!process.env.MARKETING_POSTAL_ADDRESS?.trim() || !process.env.RESEND_API_KEY?.trim() ||
      !process.env.MARKETING_FROM_EMAIL?.trim() || !process.env.MARKETING_PREFERENCES_SECRET?.trim()) {
    return unavailable('sender_configuration_missing');
  }
  try {
    await verifyMarketingDestinations(process.env.NEXT_PUBLIC_SITE_URL || 'https://snap-ortho.com');
  } catch (error) {
    console.error('[marketing-automation] destination preflight failed', error);
    return unavailable('destination_preflight_failed');
  }

  const supabase = createAdminClient();
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const [
    { data: recentDeliveries, count: deliveryCount, error: deliveriesError },
    { count: pendingWebhookCount, error: webhookError },
    { count: webhookFailureCount, error: webhookFailureError },
  ] = await Promise.all([
    supabase.from('lifecycle_emails')
      .select('sent_at,send_status,delivered_at,bounced_at,complained_at,suppressed_at', { count: 'exact' })
      .not('campaign_key', 'is', null)
      .gte('sent_at', since)
      .limit(2000),
    supabase.from('marketing_email_webhook_events')
      .select('id', { count: 'exact', head: true })
      .is('processed_at', null),
    supabase.from('marketing_email_webhook_events')
      .select('id', { count: 'exact', head: true })
      .not('processing_error', 'is', null),
  ]);
  if (deliveriesError || webhookError || webhookFailureError) {
    console.error('[marketing-automation] health lookup failed', deliveriesError ?? webhookError ?? webhookFailureError);
    return unavailable('delivery_health_lookup_failed');
  }
  if ((deliveryCount ?? 0) > (recentDeliveries?.length ?? 0)) {
    return unavailable('delivery_health_sample_truncated');
  }
  const healthReason = marketingAutomationBlockReason({
    ...flags,
    deliveries: (recentDeliveries ?? []) as Record<string, unknown>[],
    pendingWebhookCount: pendingWebhookCount ?? 0,
    webhookFailureCount: webhookFailureCount ?? 0,
  });
  if (healthReason === 'minimum_24_hour_batch_interval') {
    return NextResponse.json({ disabled: true, reason: healthReason }, { status: 409 });
  }
  if (healthReason) return unavailable(healthReason);

  try {
    const authUsers: { id: string; email?: string; email_confirmed_at?: string; created_at?: string }[] = [];
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      authUsers.push(...data.users);
      if (data.users.length < 1000) break;
    }

    const [profiles, usage, conversations, subscriptions, sends, optouts, productEvents, ankiDevices] = await Promise.all([
      allRows(supabase, 'user_profiles', 'user_id,email,full_name,receive_emails,marketing_consent_at,marketing_unsubscribed_at'),
      allRows(supabase, 'brobot_usage_events', 'user_id,created_at'),
      allRows(supabase, 'brobot_conversations', 'user_id,created_at,updated_at'),
      allRows(supabase, 'subscriptions', 'user_id,plan_code,status,current_period_end,provider'),
      allRows(supabase, 'lifecycle_emails', `${ADDRESS_HISTORY_COLUMNS},complained_at,suppressed_at`),
      allRows(supabase, 'lifecycle_email_optouts', 'user_id,kind'),
      allRows(supabase, 'product_events', 'user_id,event_name,occurred_at,product_area'),
      allRows(supabase, 'brobot_anki_device_tokens', 'user_id,revoked_at'),
    ]);

    const profileByUser = new Map(profiles.map((profile) => [String(profile.user_id), profile]));
    const activeAnkiDevices = new Set(ankiDevices.filter((device) => !device.revoked_at).map((device) => String(device.user_id)));
    const times = campaignActivity([...usage, ...conversations, ...productEvents.filter((event) => event.product_area === 'brobot')]);
    const productActivity = productCampaignActivity(productEvents);
    const { attempted, prior } = campaignHistory(sends);
    const quota = marketingDailyQuotaStatus(sends);
    const entitled = new Set(subscriptions.filter((subscription) => {
      if (subscription.plan_code !== 'unlimited_brobot') return false;
      const status = (['active', 'trialing', 'grace', 'billing_retry', 'past_due', 'canceled', 'expired', 'unpaid', 'incomplete'] as const)
        .find((candidate) => candidate === subscription.status);
      const provider = subscription.provider === 'apple' || subscription.provider === 'stripe' ? subscription.provider : null;
      return status !== undefined && provider !== null && doesSubscriptionGrantEntitlement({
        status,
        provider,
        current_period_end: subscription.current_period_end as string | null,
      });
    }).map((subscription) => String(subscription.user_id)));
    const deliverySuppressed = new Set(sends.filter((row) => row.user_id && (row.complained_at || row.suppressed_at))
      .map((row) => String(row.user_id)));
    const optedOut = new Map<string, Set<string>>();
    for (const row of optouts) {
      if (!row.user_id) continue;
      const topics = optedOut.get(String(row.user_id)) ?? new Set<string>();
      topics.add(row.kind === null ? '*' : String(row.kind));
      optedOut.set(String(row.user_id), topics);
    }
    const sendsByUser = new Map<string, Record<string, unknown>[]>();
    for (const row of sends) {
      if (!row.user_id) continue;
      const userSends = sendsByUser.get(String(row.user_id)) ?? [];
      userSends.push(row);
      sendsByUser.set(String(row.user_id), userSends);
    }

    const candidates: { recipient: MarketingRecipient; signalAt: number }[] = [];
    for (const user of authUsers) {
      if (quota.usersSentToday.has(user.id)) continue;
      const profile = profileByUser.get(user.id);
      const activity = times.get(user.id)?.sort((a, b) => a - b) ?? [];
      const userSends = sendsByUser.get(user.id) ?? [];
      const history = new Map<CampaignStep, number>();
      for (const [step, sentAt] of prior.get(user.id) ?? []) history.set(step, sentAt);
      const campaignProfile: CampaignProfile = {
        userId: user.id,
        email: '',
        confirmed: Boolean(user.email_confirmed_at),
        receiveEmails: profile?.receive_emails === true && !profile.marketing_unsubscribed_at,
        marketingConsentAt: profile?.marketing_consent_at ? new Date(String(profile.marketing_consent_at)).getTime() : null,
        accountCreatedAt: user.created_at ? new Date(user.created_at).getTime() : null,
        firstName: typeof profile?.full_name === 'string' ? profile.full_name.trim().split(/\s+/)[0] || null : null,
        profileComplete: false,
        currentlyEntitled: entitled.has(user.id),
        hasDeliverySuppression: deliverySuppressed.has(user.id),
        firstUseAt: activity[0] ?? null,
        lastUseAt: activity.at(-1) ?? null,
        priorSteps: attempted.get(user.id) ?? new Set(),
        priorStepAt: history,
        optedOutTopics: optedOut.get(user.id) ?? new Set(),
        productFirstUseAt: null,
        productLastUseAt: null,
        hasActiveAnkiDevice: activeAnkiDevices.has(user.id),
      };

      for (const step of AUTOMATED_STEPS) {
        const stepActivity = productActivity.get(user.id);
        if (step === 'caseprep_activation_1') {
          campaignProfile.productFirstUseAt = stepActivity?.caseprepCompletions.length
            ? Math.min(...stepActivity.caseprepCompletions)
            : null;
          campaignProfile.productLastUseAt = stepActivity?.caseprep.length
            ? Math.max(...stepActivity.caseprep)
            : null;
        } else if (step === 'anki_activation_1') {
          campaignProfile.productFirstUseAt = stepActivity?.ankiDownloads.length
            ? Math.min(...stepActivity.ankiDownloads)
            : null;
        }
        if (campaignIneligibilityReason(campaignProfile, step) !== null) continue;

        const config = CAMPAIGN_CONFIG[step];
        const address = resolveCampaignAddress({
          profileEmail: profile?.email,
          authEmail: user.email,
          authConfirmed: Boolean(user.email_confirmed_at),
          campaignKey: config.campaignKey,
          campaignStep: step,
          templateVersion: config.templateVersion,
          deliveries: userSends,
        });
        if (!address) continue;
        const signalAt = step === 'activation_1'
          ? campaignProfile.accountCreatedAt!
          : campaignProfile.productFirstUseAt!;
        candidates.push({
          signalAt,
          recipient: {
            userId: user.id,
            firstName: campaignProfile.firstName,
            campaignStep: step,
            ...config,
            ...address,
          },
        });
      }
    }

    candidates.sort((a, b) => a.signalAt - b.signalAt || a.recipient.userId.localeCompare(b.recipient.userId));
    if (candidates.length === 0 || quota.dailyRemaining === 0) {
      return NextResponse.json({
        evaluated: authUsers.length,
        eligible: candidates.length,
        sent: 0,
        duplicate: 0,
        suppressed: 0,
        failed: 0,
        dailyCapReached: quota.dailyRemaining === 0,
        dailyQuota: { pacificDaySent: quota.dailySent, remainingAtStart: quota.dailyRemaining, cap: MARKETING_AUTOMATION_DAILY_CAP },
      });
    }
    const batchId = randomUUID();
    const { data: batchClaims, error: batchClaimError } = await supabase.rpc('claim_marketing_email_batch', { p_batch_id: batchId });
    if (batchClaimError) throw new Error(`Unable to claim marketing batch: ${batchClaimError.message}`);
    const batchClaim = batchClaims?.[0];
    if (!batchClaim || batchClaim.batch_status !== 'started') {
      return NextResponse.json({
        disabled: true,
        reason: batchClaim?.batch_status === 'minimum_interval' ? 'minimum_24_hour_batch_interval' : 'marketing_batch_in_progress',
        lastSentAt: batchClaim?.last_sent_at ?? null,
      }, { status: 409 });
    }

    let sent = 0;
    let duplicate = 0;
    let suppressed = 0;
    let failed = 0;
    let dailyCapReached = quota.dailyRemaining === 0;
    try {
      for (const candidate of candidates) {
        if (sent >= quota.dailyRemaining) {
          dailyCapReached = true;
          break;
        }
        if (sent > 0) await pause(1000);
        try {
          const result = await deliverMarketingCampaignEmail(candidate.recipient, batchId);
          if (result.status === 'sent') sent += 1;
          else if (result.status === 'daily_cap') dailyCapReached = true;
          else if (result.status === 'duplicate') duplicate += 1;
          else suppressed += 1;
          if (dailyCapReached || sent >= MARKETING_AUTOMATION_DAILY_CAP) break;
        } catch (error) {
          failed += 1;
          console.error(`[marketing-automation] send failed: ${error instanceof Error ? error.message : String(error)}`);
          break;
        }
      }
    } finally {
      const { error: completeError } = await supabase.rpc('complete_marketing_email_batch', {
        p_batch_id: batchId,
        p_status: failed ? 'failed' : 'completed',
      });
      if (completeError) throw new Error(`Unable to finalize marketing batch: ${completeError.message}`);
    }
    return NextResponse.json({
      evaluated: authUsers.length,
      eligible: candidates.length,
      sent,
      duplicate,
      suppressed,
      failed,
      dailyCapReached,
      dailyQuota: { pacificDaySent: quota.dailySent, remainingAtStart: quota.dailyRemaining, cap: MARKETING_AUTOMATION_DAILY_CAP },
    }, { status: failed ? 500 : 200 });
  } catch (error) {
    console.error('[marketing-automation] run failed', error);
    return unavailable('automation_run_failed');
  }
}
