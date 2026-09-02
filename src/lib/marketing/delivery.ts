import { resolveCampaignAddress, ADDRESS_HISTORY_COLUMNS } from './recipient-address';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderMarketingEmail } from './templates';
import { sendMarketingEmail } from './resend';
import type { MarketingRecipient } from './types';

export async function deliverMarketingCampaignEmail(recipient: MarketingRecipient) {
  const supabase = createAdminClient();

  // Recheck consent and suppression at the last responsible moment.
  const [{ data: profile, error: profileError }, { data: optouts, error: optoutError }] = await Promise.all([
    supabase.from('user_profiles').select('email, receive_emails, marketing_unsubscribed_at').eq('user_id', recipient.userId).maybeSingle(),
    supabase.from('lifecycle_email_optouts').select('kind').eq('user_id', recipient.userId),
  ]);
  if (profileError) throw new Error(`Consent lookup failed: ${profileError.message}`);
  if (optoutError) throw new Error(`Suppression lookup failed: ${optoutError.message}`);
  if (profile?.receive_emails !== true || profile.marketing_unsubscribed_at) return { status: 'suppressed' as const };
  if ((optouts ?? []).some((row) => row.kind === null || row.kind === recipient.topic)) return { status: 'suppressed' as const };

  // Re-resolve immediately before sending so a changed profile/auth address cannot
  // receive a stale queued message. Consent and account-level blocks above always win.
  const [{ data: auth, error: authError }, { data: history, error: historyError }] = await Promise.all([
    supabase.auth.admin.getUserById(recipient.userId),
    supabase.from('lifecycle_emails').select(ADDRESS_HISTORY_COLUMNS).eq('user_id', recipient.userId),
  ]);
  if (authError || historyError) throw new Error('Recipient address recheck failed');
  const baseVersion = recipient.templateVersion.replace(/\.auth-fallback$/, '');
  const address = resolveCampaignAddress({ profileEmail: profile.email, authEmail: auth.user?.email, authConfirmed: Boolean(auth.user?.email_confirmed_at), campaignKey: recipient.campaignKey, campaignStep: recipient.campaignStep, templateVersion: baseVersion, deliveries: history ?? [] });
  if (!address || address.email !== recipient.email || address.templateVersion !== recipient.templateVersion || address.addressSource !== recipient.addressSource || address.fallbackFromDeliveryId !== recipient.fallbackFromDeliveryId) return { status: 'suppressed' as const };

  // Validate the template before reserving a delivery.
  const rendered = renderMarketingEmail(recipient);
  const { data: log, error: reserveError } = await supabase.from('lifecycle_emails').insert({
    user_id: recipient.userId,
    email: recipient.email,
    kind: recipient.campaignKey,
    campaign_key: recipient.campaignKey,
    campaign_step: recipient.campaignStep,
    topic: recipient.topic,
    template_version: recipient.templateVersion,
    send_status: 'sending',
    metadata: { address_source: address.addressSource, ...(address.fallbackFromDeliveryId ? { fallback_from_delivery_id: address.fallbackFromDeliveryId } : {}) },
  }).select('id').single();
  if (reserveError) {
    if (reserveError.code === '23505') return { status: 'duplicate' as const };
    throw new Error(`Campaign reservation failed: ${reserveError.message}`);
  }

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
    await supabase.from('lifecycle_emails').update({
      // Provider/network failures can be ambiguous. Keep the unique reservation
      // until an operator reconciles it; never automatically resend.
      ...(acceptedId ? { resend_email_id: acceptedId, provider_message_id: acceptedId } : {}),
      failure_reason: error instanceof Error ? error.message.slice(0, 500) : 'Unknown send failure',
    }).eq('id', log.id);
    throw error;
  }
}
