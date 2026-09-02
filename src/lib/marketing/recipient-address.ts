import type { MarketingRecipient } from './types';

type Delivery = Record<string, unknown>;
export function normalizedEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}
function usableEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
export function isConfirmedAddressFailure(row: Delivery) {
  // A timeout or a missing receipt is not evidence that an email was not delivered.
  return !row.delivered_at && !row.first_clicked_at &&
    (Boolean(row.bounced_at) || row.send_status === 'delivery_failed');
}
export function resolveCampaignAddress(input: {
  profileEmail: unknown; authEmail: unknown; authConfirmed: boolean;
  campaignKey: string; campaignStep: string; templateVersion: string;
  deliveries: Delivery[];
}): Pick<MarketingRecipient, 'email' | 'addressSource' | 'templateVersion' | 'fallbackFromDeliveryId'> | null {
  if (!input.authConfirmed) return null;
  const profileEmail = normalizedEmail(input.profileEmail);
  const authEmail = normalizedEmail(input.authEmail);
  const failedProfile = input.deliveries.find((row) =>
    normalizedEmail(row.email) === profileEmail && isConfirmedAddressFailure(row) &&
    (row.metadata as Record<string, unknown> | null)?.address_source === 'profile');
  if (usableEmail(profileEmail) && !failedProfile) {
    return { email: profileEmail, addressSource: 'profile', templateVersion: input.templateVersion };
  }
  if (!usableEmail(authEmail) || (failedProfile && authEmail === profileEmail)) return null;
  if (input.deliveries.some((row) => normalizedEmail(row.email) === authEmail && isConfirmedAddressFailure(row))) return null;
  const fallbackVersion = `${input.templateVersion}.auth-fallback`;
  // A distinct, stable reservation allows ONE alternate-address attempt, even on concurrent runs.
  if (input.deliveries.some((row) => row.campaign_key === input.campaignKey &&
    row.campaign_step === input.campaignStep && row.template_version === fallbackVersion)) return null;
  const parent = input.deliveries.find((row) => row.campaign_key === input.campaignKey &&
    row.campaign_step === input.campaignStep && row.template_version === input.templateVersion &&
    normalizedEmail(row.email) === profileEmail && isConfirmedAddressFailure(row) &&
    (row.metadata as Record<string, unknown> | null)?.address_source === 'profile');
  return { email: authEmail, addressSource: 'authentication', templateVersion: fallbackVersion,
    ...(parent ? { fallbackFromDeliveryId: String(parent.id) } : {}) };
}

export const ADDRESS_HISTORY_COLUMNS = 'id,user_id,email,campaign_key,campaign_step,template_version,sent_at,send_status,delivered_at,first_clicked_at,bounced_at,metadata';
