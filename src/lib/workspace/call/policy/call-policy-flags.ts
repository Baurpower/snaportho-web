/**
 * CALL_POLICY_V2 rollout flag — Phase 4 CUTOVER: the policy engine is now the DEFAULT
 * for all call-scheduling consumers (pickers, add/edit views, generator, validation,
 * swaps, AI packet). The flag is retained as an opt-out KILL-SWITCH so the legacy path
 * can be restored without a code change if a regression surfaces in production.
 *
 * The engine is ON unless explicitly disabled via any of:
 *   - env: NEXT_PUBLIC_CALL_POLICY_V2=false (build-time, all users)
 *   - localStorage: `callPolicyV2` = "false" | "0" (per-browser)
 *   - URL param: ?callPolicyV2=0 (ad-hoc, e.g. QA)
 *
 * Once the engine has soaked in production, the legacy paths + this flag are removed
 * (Phase 4b, see docs/call-hub-policy-engine.md).
 */
export function isCallPolicyV2Enabled(): boolean {
  if (process.env.NEXT_PUBLIC_CALL_POLICY_V2 === "false") return false;

  if (typeof window !== "undefined") {
    try {
      const stored = window.localStorage.getItem("callPolicyV2");
      if (stored === "false" || stored === "0") return false;
      const param = new URLSearchParams(window.location.search).get("callPolicyV2");
      if (param === "0" || param === "false") return false;
    } catch {
      // localStorage / URL access can throw in restricted contexts — ignore.
    }
  }

  return true;
}
