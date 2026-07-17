import type { FinalizationDisposition, FinalizationEscalation, FinalizationSeverity, FinalizationWarning } from "./types.ts";

export const severityRank: Record<FinalizationSeverity, number> = {
  INFO: 0,
  LOW: 1,
  MODERATE: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export function isHighOrCritical(severity: FinalizationSeverity): boolean {
  return severityRank[severity] >= severityRank.HIGH;
}

export function blocksStaging(issue: Pick<FinalizationEscalation, "severity" | "disposition">): boolean {
  if (issue.disposition === "SYSTEM_BLOCKER") return true;
  if (issue.disposition === "HUMAN_REVIEW_REQUIRED") return true;
  if (issue.disposition === "ACTION_REQUIRED" && isHighOrCritical(issue.severity)) return true;
  return false;
}

export function blocksPublication(issue: Pick<FinalizationEscalation, "severity" | "disposition">): boolean {
  if (issue.disposition === "WARNING" || issue.disposition === "VALID_DEFER") return false;
  if (issue.disposition === "AUTO_RESOLVED" || issue.disposition === "REVIEW_INHERITED") return false;
  return issue.severity !== "INFO";
}

export function warning(id: string, agent: string, message: string, fingerprint?: string): FinalizationWarning {
  return { id, agent, severity: "LOW", disposition: "WARNING", message, fingerprint };
}

export function escalation(input: Omit<FinalizationEscalation, "severity" | "disposition"> & {
  severity?: FinalizationSeverity;
  disposition?: FinalizationDisposition;
}): FinalizationEscalation {
  return {
    ...input,
    severity: input.severity ?? "MODERATE",
    disposition: input.disposition ?? "ACTION_REQUIRED",
  };
}
