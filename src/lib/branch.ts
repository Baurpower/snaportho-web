// lib/branch.ts
import branch from 'branch-sdk';


let branchReady: Promise<void> | null = null;

export function initBranch() {
  if (typeof window === 'undefined' || branchReady) return branchReady;

  branchReady = new Promise((resolve) => {
    branch.init(
      process.env.NEXT_PUBLIC_BRANCH_KEY!,         // key_test_... or key_live_...
      {},                                          // optional options { linkDomain, trackingDisabled, etc. }
      () => resolve()
    );
  });

  return branchReady;
}
