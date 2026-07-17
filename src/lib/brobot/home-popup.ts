import { APP_ROUTES } from '@/lib/routes';

export const BROBOT_HOME_POPUP_CAMPAIGN = 'brobot-home-v1';
export const BROBOT_HOME_POPUP_STORAGE_KEY = 'snaportho:home-promo:dismissed';

export type BroBotPopupAuthState = 'guest' | 'authenticated';
export type BroBotPopupEntitlementTier = 'guest' | 'free' | 'unlimited' | 'unknown';

export function getBroBotPopupPrimaryDestination() {
  // BroBot Chat intentionally supports guest sessions and the free daily quota.
  // Entitlement state changes usage limits, not the entry route.
  return APP_ROUTES.broBot.workspace;
}

export function getBroBotPopupInfoDestination() {
  return APP_ROUTES.broBot.info;
}

export function isBroBotPopupDismissed(storedCampaign: string | null) {
  return storedCampaign === BROBOT_HOME_POPUP_CAMPAIGN;
}

export function getBroBotPopupEntitlementTier(params: {
  authState: BroBotPopupAuthState;
  isUnlimited: boolean;
  entitlementLoaded: boolean;
}): BroBotPopupEntitlementTier {
  if (params.authState === 'guest') return 'guest';
  if (!params.entitlementLoaded) return 'unknown';
  return params.isUnlimited ? 'unlimited' : 'free';
}
