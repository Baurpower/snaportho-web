/** Dispatched after checkout activation so all BroBot surfaces refetch entitlements. */
export const BROBOT_ENTITLEMENT_INVALIDATED_EVENT = 'snaportho:brobot-entitlement-invalidated';

export function invalidateBroBotEntitlementCache() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(BROBOT_ENTITLEMENT_INVALIDATED_EVENT));
}