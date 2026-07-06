import assert from 'node:assert/strict';

/**
 * Self-contained mirror of billing-entitlement-state parsing used by web UI.
 * Keeps this test runnable with `node --experimental-strip-types` (no @/ imports).
 */

type MeEntitlementsPayload = {
  access?: 'free' | 'unlimited';
  data?: {
    aiAccess?: { unlimited?: boolean; dailyCap?: number | null; remainingToday?: number | null };
    source?: string;
  } | null;
};

function parseMeEntitlementsPayload(payload: MeEntitlementsPayload | null | undefined) {
  const legacy = payload?.data ?? null;
  const access = payload?.access ?? (legacy?.aiAccess?.unlimited ? 'unlimited' : 'free');
  const isUnlimited = access === 'unlimited' || legacy?.aiAccess?.unlimited === true;
  return {
    access: isUnlimited ? 'unlimited' : 'free',
    isUnlimited,
    remainingToday: legacy?.aiAccess?.remainingToday ?? null,
    dailyCap: legacy?.aiAccess?.dailyCap ?? null,
    source: legacy?.source ?? (isUnlimited ? 'subscription' : 'free_quota'),
  };
}

function toWebUsageSnapshot(view: ReturnType<typeof parseMeEntitlementsPayload>) {
  return {
    unlimited: view.isUnlimited,
    dailyCap: view.isUnlimited ? null : view.dailyCap,
    remainingToday: view.isUnlimited ? null : view.remainingToday,
  };
}

function shouldShowFreeQuotaUsage(params: { isUnlimited: boolean; activationPhase: string }) {
  if (params.isUnlimited) return false;
  return params.activationPhase === 'idle';
}

const stripeTrialingPayload = {
  access: 'unlimited' as const,
  data: {
    aiAccess: { unlimited: true, dailyCap: null, remainingToday: null },
    source: 'subscription',
    status: 'trialing',
  },
};

const freePayload = {
  access: 'free' as const,
  data: {
    aiAccess: { unlimited: false, dailyCap: 3, remainingToday: 0 },
    source: 'free_quota',
  },
};

const trialingView = parseMeEntitlementsPayload(stripeTrialingPayload);
assert.equal(trialingView.isUnlimited, true);
assert.equal(trialingView.access, 'unlimited');
assert.equal(toWebUsageSnapshot(trialingView).remainingToday, null);
assert.equal(shouldShowFreeQuotaUsage({ isUnlimited: true, activationPhase: 'idle' }), false);

const freeView = parseMeEntitlementsPayload(freePayload);
assert.equal(freeView.isUnlimited, false);
assert.equal(toWebUsageSnapshot(freeView).remainingToday, 0);
assert.equal(shouldShowFreeQuotaUsage({ isUnlimited: false, activationPhase: 'idle' }), true);

// Top-level access alone must unlock unlimited UI even if legacy data is absent.
const topLevelOnly = parseMeEntitlementsPayload({
  access: 'unlimited',
  data: null,
});
assert.equal(topLevelOnly.isUnlimited, true);
assert.equal(toWebUsageSnapshot(topLevelOnly).unlimited, true);

console.log('web entitlement persistence tests passed');