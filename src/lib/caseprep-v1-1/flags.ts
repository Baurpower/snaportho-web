/**
 * CasePrep v1.1 feature flags — single source of truth.
 *
 * All are opt-in (`=== "true"`) so production behavior is unchanged until a
 * flag is explicitly enabled, and flipping one off restores current behavior
 * with zero deploy.
 */

/** Non-stream v1.1 preview endpoint + case-readiness server context. */
export function isCasePrepWebV11Enabled(): boolean {
  return process.env.CASEPREP_WEB_V1_1_ENABLED === "true";
}

/** SSE packet stream proxy (/api/case-prep/v1.1/stream). */
export function isCasePrepStreamEnabled(): boolean {
  return process.env.CASEPREP_WEB_V1_1_STREAM_ENABLED === "true";
}

/** Knowledge-graph "related concepts" injection into the packet stream. */
export function isCasePrepKgEnabled(): boolean {
  return process.env.CASEPREP_WEB_V1_1_KG_ENABLED === "true";
}
