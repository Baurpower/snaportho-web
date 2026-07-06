import type { BroBotEntitlement } from '@/lib/brobot/entitlements';

export type MeEntitlementsPayload = {
  access?: 'free' | 'unlimited';
  planCode?: string;
  status?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  data?: BroBotEntitlement | null;
};

export type BillingEntitlementView = {
  entitlement: BroBotEntitlement | null;
  access: 'free' | 'unlimited';
  isUnlimited: boolean;
  isPaid: boolean;
  status: string | null;
  expiresAt: string | null;
  cancelAtPeriodEnd: boolean;
  remainingToday: number | null;
  dailyCap: number | null;
};

/** Shared web UI view of /api/me/entitlements (same shape as billing). */
export type WebEntitlementView = BillingEntitlementView;

export type WebUsageSnapshot = {
  unlimited: boolean;
  dailyCap: number | null;
  remainingToday: number | null;
};

export type WebEntitlementMenuStatus = {
  unlimited: boolean;
  source: string;
  label: 'Unlimited BroBot' | 'Free BroBot';
};

export type BillingActivationPhase = 'idle' | 'activating' | 'active' | 'delayed';

export function parseMeEntitlementsPayload(
  payload: MeEntitlementsPayload | null | undefined
): BillingEntitlementView {
  const legacy = payload?.data ?? null;
  const access =
    payload?.access ??
    (legacy?.aiAccess?.unlimited ? 'unlimited' : 'free');
  const isUnlimited = access === 'unlimited' || legacy?.aiAccess?.unlimited === true;
  const isPaid = isUnlimited || legacy?.source === 'subscription';

  return {
    entitlement: legacy,
    access: isUnlimited ? 'unlimited' : 'free',
    isUnlimited,
    isPaid,
    status: payload?.status ?? legacy?.status ?? null,
    expiresAt: payload?.currentPeriodEnd ?? legacy?.expiresAt ?? null,
    cancelAtPeriodEnd:
      payload?.cancelAtPeriodEnd ?? legacy?.cancelAtPeriodEnd ?? false,
    remainingToday: legacy?.aiAccess?.remainingToday ?? null,
    dailyCap: legacy?.aiAccess?.dailyCap ?? null,
  };
}

export function deriveBillingActivationPhase(params: {
  awaitingCheckoutConfirmation: boolean;
  isPaid: boolean;
  pollTimedOut: boolean;
}): BillingActivationPhase {
  if (!params.awaitingCheckoutConfirmation) {
    return params.isPaid ? 'active' : 'idle';
  }

  if (params.isPaid) return 'active';
  if (params.pollTimedOut) return 'delayed';
  return 'activating';
}

export function shouldShowFreeQuotaUsage(params: {
  isUnlimited: boolean;
  activationPhase: BillingActivationPhase;
}): boolean {
  if (params.isUnlimited) return false;
  return params.activationPhase === 'idle';
}

export function getBillingPlanLabel(params: {
  isUnlimited: boolean;
  activationPhase: BillingActivationPhase;
}): string {
  if (params.isUnlimited) return 'Unlimited BroBot';
  if (params.activationPhase === 'activating') return 'Activating...';
  if (params.activationPhase === 'delayed') return 'BroBot Unlimited';
  return 'Free';
}

export type WebBroBotUsageMeta = WebUsageSnapshot & {
  source: string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  expiresAt?: string | null;
};

export function toWebBroBotUsageMeta(view: WebEntitlementView): WebBroBotUsageMeta {
  return {
    ...toWebUsageSnapshot(view),
    source: view.entitlement?.source ?? (view.isUnlimited ? 'subscription' : 'free_quota'),
    status: view.status ?? undefined,
    cancelAtPeriodEnd: view.cancelAtPeriodEnd,
    expiresAt: view.expiresAt,
  };
}

export function toWebUsageSnapshot(view: WebEntitlementView): WebUsageSnapshot {
  return {
    unlimited: view.isUnlimited,
    dailyCap: view.isUnlimited ? null : view.dailyCap,
    remainingToday: view.isUnlimited ? null : view.remainingToday,
  };
}

export function toWebEntitlementMenuStatus(view: WebEntitlementView): WebEntitlementMenuStatus {
  return {
    unlimited: view.isUnlimited,
    source: view.entitlement?.source ?? (view.isUnlimited ? 'subscription' : 'free_quota'),
    label: view.isUnlimited ? 'Unlimited BroBot' : 'Free BroBot',
  };
}

export async function fetchMeEntitlementsView(
  options: { source?: string } = {}
): Promise<WebEntitlementView | null> {
  const query = options.source ? `?source=${encodeURIComponent(options.source)}` : '';
  const response = await fetch(`/api/me/entitlements${query}`, {
    cache: 'no-store',
    credentials: 'include',
  });

  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as MeEntitlementsPayload;
  return parseMeEntitlementsPayload(payload);
}

export function getBillingStatusBadge(params: {
  isUnlimited: boolean;
  activationPhase: BillingActivationPhase;
  status: string | null;
  cancelAtPeriodEnd: boolean;
}): 'processing' | 'trial' | 'active' | 'canceling' | 'delayed' | null {
  if (params.activationPhase === 'activating') return 'processing';
  if (params.activationPhase === 'delayed') return 'delayed';
  if (!params.isUnlimited) return null;

  if (params.cancelAtPeriodEnd) return 'canceling';
  if (params.status === 'trialing') return 'trial';
  if (params.status === 'active' || params.status === 'trialing') return 'active';
  return 'active';
}