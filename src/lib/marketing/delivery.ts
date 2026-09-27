import { resolveCampaignAddress, ADDRESS_HISTORY_COLUMNS } from './recipient-address';
import { profileCohort } from './segments';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderMarketingEmail } from './templates';
import { sendMarketingEmail } from './resend';
import type { MarketingRecipient } from './types';
import { doesSubscriptionGrantEntitlement, type CanonicalSubscriptionStatus } from '@/lib/subscriptions/ledger';

export async function deliverMarketingCampaignEmail(recipient: MarketingRecipient, batchId: string) {
  const supabase = createAdminClient();

  // Recheck consent and suppression at the last responsible moment.
  const [{ data: profile, error: profileError }, { data: optouts, error: optoutError }] = await Promise.all([
    supabase.from('user_profiles').select('email, receive_emails, marketing_consent_at, marketing_unsubscribed_at, training_level, grad_year, country, city, institution, subspecialty_interest').eq('user_id', recipient.userId).maybeSingle(),
    supabase.from('lifecycle_email_optouts').select('kind').eq('user_id', recipient.userId),
  ]);
  if (profileError) throw new Error(`Consent lookup failed: ${profileError.message}`);
  if (optoutError) throw new Error(`Suppression lookup failed: ${optoutError.message}`);
  if (profile?.receive_emails !== true || !profile.marketing_consent_at || profile.marketing_unsubscribed_at) return { status: 'suppressed' as const };
  if ((optouts ?? []).some((row) => row.kind === null || row.kind === recipient.topic)) return { status: 'suppressed' as const };

  const { data: subscriptions, error: subscriptionError } = await supabase.from('subscriptions')
    .select('plan_code,status,current_period_end,provider')
    .eq('user_id', recipient.userId);
  if (subscriptionError) throw new Error(`Entitlement recheck failed: ${subscriptionError.message}`);
  const entitled = (subscriptions ?? []).some((subscription) => {
    if (subscription.plan_code !== 'unlimited_brobot') return false;
    const statuses = ['active', 'trialing', 'grace', 'billing_retry', 'past_due', 'canceled', 'expired', 'unpaid', 'incomplete'] as const satisfies readonly CanonicalSubscriptionStatus[];
    const status = statuses
      .find((candidate) => candidate === subscription.status);
    const provider = subscription.provider === 'apple' || subscription.provider === 'stripe' ? subscription.provider : null;
    return status !== undefined && provider !== null && doesSubscriptionGrantEntitlement({
      status,
      provider,
      current_period_end: subscription.current_period_end,
    });
  });
  if (entitled) return { status: 'suppressed' as const };

  if (recipient.campaignStep === 'profile_completion_1' || recipient.campaignStep === 'profile_grad_year_1') {
    const { data: workspaceProfile, error: workspaceError } = await supabase.from('student_workspace_profiles')
      .select('expected_graduation_year').eq('user_id', recipient.userId).maybeSingle();
    if (workspaceError) throw new Error(`Profile cohort recheck failed: ${workspaceError.message}`);
    const cohort = profileCohort(profile, workspaceProfile?.expected_graduation_year);
    if (cohort !== (recipient.campaignStep === 'profile_completion_1' ? 'empty' : 'med_student_grad_year_only')) return { status: 'suppressed' as const };
  }

  if (recipient.campaignStep === 'caseprep_activation_1' || recipient.campaignStep === 'anki_activation_1') {
    const since = new Date(Date.now() - 31 * 86_400_000).toISOString();
    const { data: productEvents, error: productError } = await supabase.from('product_events')
      .select('event_name,occurred_at,product_area')
      .eq('user_id', recipient.userId)
      .gte('occurred_at', since)
      .in('event_name', recipient.campaignStep === 'caseprep_activation_1'
        ? ['caseprep_started', 'caseprep_first_section_rendered', 'caseprep_completed', 'caseprep_failed']
        : ['anki_addon_first_downloaded']);
    if (productError) throw new Error(`Product-use recheck failed: ${productError.message}`);
    const events = productEvents ?? [];
    if (recipient.campaignStep === 'caseprep_activation_1') {
      const completed = events.filter((event) => event.product_area === 'caseprep' && event.event_name === 'caseprep_completed')
        .map((event) => new Date(event.occurred_at).getTime()).filter(Number.isFinite);
      const activity = events.filter((event) => event.product_area === 'caseprep')
        .map((event) => new Date(event.occurred_at).getTime()).filter(Number.isFinite);
      const firstCompleted = completed.length ? Math.min(...completed) : null;
      const lastActivity = activity.length ? Math.max(...activity) : null;
      if (firstCompleted === null || firstCompleted < Date.now() - 30 * 86_400_000 ||
          lastActivity === null || Date.now() - lastActivity < 2 * 86_400_000) return { status: 'suppressed' as const };
    } else {
      const downloads = events.filter((event) => event.product_area === 'anki' && event.event_name === 'anki_addon_first_downloaded')
        .map((event) => new Date(event.occurred_at).getTime()).filter(Number.isFinite);
      const firstDownload = downloads.length ? Math.min(...downloads) : null;
      if (firstDownload === null || Date.now() - firstDownload < 86_400_000 ||
          firstDownload < Date.now() - 14 * 86_400_000) return { status: 'suppressed' as const };
      const { data: devices, error: deviceError } = await supabase.from('brobot_anki_device_tokens')
        .select('id').eq('user_id', recipient.userId).is('revoked_at', null).limit(1);
      if (deviceError) throw new Error(`Anki setup recheck failed: ${deviceError.message}`);
      if (devices?.length) return { status: 'suppressed' as const };
    }
  }

  // Re-resolve immediately before sending so a changed profile/auth address cannot
  // receive a stale queued message. Consent and account-level blocks above always win.
  const [{ data: auth, error: authError }, { data: history, error: historyError }] = await Promise.all([
    supabase.auth.admin.getUserById(recipient.userId),
    supabase.from('lifecycle_emails').select(ADDRESS_HISTORY_COLUMNS).eq('user_id', recipient.userId),
  ]);
  if (authError || historyError) throw new Error('Recipient address recheck failed');
  const baseVersion = recipient.templateVersion.replace(/\.auth-fallback$/, '');
  const address = resolveCampaignAddress({ profileEmail: profile?.email, authEmail: auth.user?.email, authConfirmed: Boolean(auth.user?.email_confirmed_at), campaignKey: recipient.campaignKey, campaignStep: recipient.campaignStep, templateVersion: baseVersion, deliveries: history ?? [] });
  if (!address || address.email !== recipient.email || address.templateVersion !== recipient.templateVersion || address.addressSource !== recipient.addressSource || address.fallbackFromDeliveryId !== recipient.fallbackFromDeliveryId) return { status: 'suppressed' as const };

  // Validate the template before reserving a delivery.
  const rendered = renderMarketingEmail(recipient);
  const { data: reservations, error: reserveError } = await supabase.rpc('reserve_marketing_email_delivery', {
    p_user_id: recipient.userId,
    p_email: recipient.email,
    p_campaign_key: recipient.campaignKey,
    p_campaign_step: recipient.campaignStep,
    p_topic: recipient.topic,
    p_template_version: recipient.templateVersion,
    p_metadata: { address_source: address.addressSource, ...(address.fallbackFromDeliveryId ? { fallback_from_delivery_id: address.fallbackFromDeliveryId } : {}) },
    p_batch_id: batchId,
  });
  if (reserveError) throw new Error(`Campaign reservation failed: ${reserveError.message}`);
  const reservation = reservations?.[0];
  if (!reservation || reservation.reservation_status === 'duplicate' || reservation.reservation_status === 'already_sent_today') {
    return { status: 'duplicate' as const };
  }
  if (reservation.reservation_status === 'daily_cap') return { status: 'daily_cap' as const };
  if (reservation.reservation_status !== 'reserved' || !reservation.delivery_id) {
    throw new Error('Campaign reservation returned an invalid status');
  }
  const log = { id: reservation.delivery_id };

  let acceptedId: string | undefined;
  try {
    const result = await sendMarketingEmail({ recipient, email: rendered, unsubscribeUrl: rendered.unsubscribeUrl });
    acceptedId = result.id;
    const { error } = await supabase.from('lifecycle_emails').update({
      send_status: 'sent', resend_email_id: result.id, provider_message_id: result.id, sent_at: new Date().toISOString(),
    }).eq('id', log.id);
    if (error) throw new Error(`Sent but failed to finalize log: ${error.message}`);
    return { status: 'sent' as const, id: result.id };
  } catch (error) {
    const { error: failureRecordError } = await supabase.from('lifecycle_emails').update({
      // Provider/network failures can be ambiguous. Keep the unique reservation
      // until an operator reconciles it; never automatically resend.
      ...(acceptedId ? { resend_email_id: acceptedId, provider_message_id: acceptedId } : {}),
      failure_reason: error instanceof Error ? error.message.slice(0, 500) : 'Unknown send failure',
    }).eq('id', log.id);
    if (failureRecordError) {
      throw new Error(`Delivery outcome is uncertain and failure metadata could not be recorded: ${failureRecordError.message}`, { cause: error });
    }
    throw error;
  }
}
