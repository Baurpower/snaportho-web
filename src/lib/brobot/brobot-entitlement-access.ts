import {
  getNormalizedBroBotEntitlement,
  type BroBotEntitlement,
  type NormalizedBroBotEntitlement,
  type Subject,
} from '@/lib/brobot/entitlements';

export type BroBotAccessGate = {
  access: 'free' | 'unlimited';
  isUnlimited: boolean;
  isLimitReached: boolean;
  dailyCap: number | null;
  remainingToday: number | null;
  source: BroBotEntitlement['source'];
  normalized: NormalizedBroBotEntitlement & {
    data: BroBotEntitlement & { isLimitReached?: boolean };
  };
};

/** Canonical unlimited check for web UI and API handlers. */
export function isUnlimitedBroBotAccess(params: {
  access?: 'free' | 'unlimited' | null;
  entitlement?: Pick<BroBotEntitlement, 'aiAccess'> | null;
}): boolean {
  if (params.access === 'unlimited') return true;
  return params.entitlement?.aiAccess?.unlimited === true;
}

export function shouldEnforceBroBotFreeQuota(gate: Pick<BroBotAccessGate, 'isUnlimited'>): boolean {
  return !gate.isUnlimited;
}

/**
 * Single resolver for BroBot quota gating across web routes and extension APIs.
 * Prefer this over ad-hoc `getRemainingAIUses` / `getMobileBroBotEntitlement` checks.
 */
export async function getBroBotAccessGate(subject: Subject): Promise<BroBotAccessGate> {
  const normalized = await getNormalizedBroBotEntitlement(subject);
  const isUnlimited = isUnlimitedBroBotAccess({
    access: normalized.access,
    entitlement: normalized.data,
  });

  return {
    access: isUnlimited ? 'unlimited' : 'free',
    isUnlimited,
    isLimitReached: !isUnlimited && normalized.data.isLimitReached === true,
    dailyCap: isUnlimited ? null : normalized.data.aiAccess.dailyCap,
    remainingToday: isUnlimited ? null : normalized.data.aiAccess.remainingToday,
    source: normalized.data.source,
    normalized,
  };
}