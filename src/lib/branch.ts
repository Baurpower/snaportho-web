import type { ProductEventName } from '@/lib/analytics/product-events';

let branchReady: Promise<void> | null = null;
let branchClient: typeof import('branch-sdk') | null = null;

async function getBranchClient() {
  if (typeof window === 'undefined') return null;
  if (branchClient) return branchClient;

  // branch-sdk reads `window` during module initialization. Loading it at the
  // top level makes Next.js prerendering fail for every page that includes the
  // root client layout, so keep the import strictly inside the browser path.
  const branchModule = await import('branch-sdk');
  branchClient = branchModule;
  return branchClient;
}

export function initBranch() {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_BRANCH_KEY || branchReady) return branchReady;

  branchReady = new Promise(async (resolve, reject) => {
    try {
      const branch = await getBranchClient();
      if (!branch) return resolve();
      branch.init(
        process.env.NEXT_PUBLIC_BRANCH_KEY!,
        {},
        () => resolve()
      );
    } catch (error) {
      reject(error);
    }
  });

  return branchReady;
}

export async function logBranchEvent(event: string, metadata?: Record<string, unknown>) {

  if (typeof window === 'undefined') return;

  try {
    await initBranch(); // Ensure it's initialized
    const branch = await getBranchClient();
    branch?.logEvent(event, {
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
  const branch = await getBranchClient();
  branch?.setIdentity(userId);
}

export async function clearBranchIdentity() {
  if (typeof window === 'undefined' || !process.env.NEXT_PUBLIC_BRANCH_KEY) return;
  await initBranch();
  const branch = await getBranchClient();
  branch?.logout();
}
