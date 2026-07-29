/**
 * CALL_POLICY_V2 feature flag (policy engine rollout).
 *
 * When on, call-scheduling consumers (pickers, add/edit views, generator, validation,
 * swaps, AI packet) route slot eligibility/presence through the unified policy engine
 * (src/lib/workspace/call/policy) instead of the legacy per-consumer logic. Off by
 * default until the parity harness + fix tests are green on all programs (see
 * docs/call-hub-policy-engine.md). Toggle via any of:
 *   - env: NEXT_PUBLIC_CALL_POLICY_V2=true (build-time, all users)
 *   - localStorage: `callPolicyV2` = "true" (per-browser, no rebuild)
 *   - URL param: ?callPolicyV2=1 (ad-hoc, e.g. QA)
 */
export function isCallPolicyV2Enabled(): boolean {
  if (process.env.NEXT_PUBLIC_CALL_POLICY_V2 === "true") return true;

  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem("callPolicyV2") === "true") return true;
      const param = new URLSearchParams(window.location.search).get("callPolicyV2");
      if (param === "1" || param === "true") return true;
    } catch {
      // localStorage / URL access can throw in restricted contexts — ignore.
    }
  }

  return false;
}
