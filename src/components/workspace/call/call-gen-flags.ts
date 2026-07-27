/**
 * CALL_GEN_V2 feature flag (Phase 3).
 *
 * Enables the Web Worker generation pipeline (repair-then-optimize, off the main
 * thread). Off by default. Can be turned on for rollout/testing via any of:
 *   - env: NEXT_PUBLIC_CALL_GEN_V2=true (build-time, all users)
 *   - localStorage: `callGenV2` = "true" (per-browser, no rebuild)
 *   - URL param: ?callGenV2=1 (ad-hoc, e.g. QA)
 */
export function isCallGenV2Enabled(): boolean {
  if (process.env.NEXT_PUBLIC_CALL_GEN_V2 === "true") return true;

  if (typeof window !== "undefined") {
    try {
      if (window.localStorage.getItem("callGenV2") === "true") return true;
      const param = new URLSearchParams(window.location.search).get("callGenV2");
      if (param === "1" || param === "true") return true;
    } catch {
      // localStorage / URL access can throw in restricted contexts — ignore.
    }
  }

  return false;
}
