import branch from 'branch-sdk';
import type { ProductEventName } from '@/lib/analytics/product-events';

let branchReady: Promise<void> | null = null;

export function initBranch() {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_BRANCH_KEY || branchReady) return branchReady;

  branchReady = new Promise((resolve) => {
    branch.init(
      process.env.NEXT_PUBLIC_BRANCH_KEY!,
      {},
      () => resolve()
    );
  });

  return branchReady;
}

export async function logBranchEvent(event: string, metadata?: Record<string, unknown>) {

  if (typeof window === 'undefined') return;

  try {
    await initBranch(); // Ensure it's initialized

    branch.logEvent(event, {
      ...metadata,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('❌ Branch logging failed:', err);
  }
}

const STANDARD_EVENT_MAP: Partial<Record<ProductEventName, string>> = {
  brobot_pricing_viewed: 'VIEW_ITEM',
  brobot_checkout_started: 'INITIATE_PURCHASE',
  brobot_trial_started: 'START_TRIAL',
  brobot_unlimited_activated: 'SUBSCRIBE',
};

export async function logBranchProductEvent(
  event: ProductEventName,
  metadata?: Record<string, unknown>
) {
  return logBranchEvent(STANDARD_EVENT_MAP[event] ?? event.toUpperCase(), {
    product: 'brobot',
    ...metadata,
  });
}

export async function setBranchIdentity(userId: string) {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_BRANCH_KEY) return;
  await initBranch();
  branch.setIdentity(userId);
}

export async function clearBranchIdentity() {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_BRANCH_KEY) return;
  await initBranch();
  branch.logout();
}
