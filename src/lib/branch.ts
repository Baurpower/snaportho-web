import branch from 'branch-sdk';

let branchReady: Promise<void> | null = null;

export function initBranch() {
  if (typeof window === 'undefined' || branchReady) return branchReady;

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
