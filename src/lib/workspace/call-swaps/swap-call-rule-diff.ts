import type { CallValidationIssue } from "@/lib/workspace/call/validation";

/**
 * Pure helpers for deciding whether approving a swap introduces a NEW hard
 * call-rule violation. Kept free of any server/Next imports so they can be
 * unit-tested in isolation; the DB-backed orchestration lives in
 * schedule-mutation.ts.
 */

/**
 * Stable identity for a validation error so a violation present both before and
 * after the swap is recognised as pre-existing (and therefore not a reason to
 * block approval). Deliberately ignores the human-readable message.
 */
export function callValidationErrorSignature(issue: CallValidationIssue): string {
  return `${issue.code}__${issue.rosterId ?? issue.residentId ?? ""}__${issue.dateKey ?? ""}__${issue.ruleCode ?? ""}`;
}

/**
 * Hard-rule violations present after a change that were not present before it —
 * i.e. the violations the change actually introduces.
 */
export function computeIntroducedHardViolations(
  beforeErrors: CallValidationIssue[],
  afterErrors: CallValidationIssue[]
): CallValidationIssue[] {
  const baseline = new Set(beforeErrors.map(callValidationErrorSignature));
  return afterErrors.filter(
    (issue) => !baseline.has(callValidationErrorSignature(issue))
  );
}
