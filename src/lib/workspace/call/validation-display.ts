import type {
  CallValidationIssue,
  CallValidationResult,
} from "@/lib/workspace/call/validation";
import { serializeSlotId } from "@/lib/workspace/call/validation";

export function getWorstValidationSeverity(issues: CallValidationIssue[]) {
  if (issues.some((issue) => issue.severity === "error")) return "error";
  if (issues.some((issue) => issue.severity === "warning")) return "warning";
  if (issues.some((issue) => issue.severity === "info")) return "info";
  return null;
}

export function getValidationSeverityClass(issues: CallValidationIssue[]) {
  const severity = getWorstValidationSeverity(issues);

  if (severity === "error") {
    return "ring-2 ring-rose-300 border-rose-300 bg-rose-50/90";
  }

  if (severity === "warning") {
    return "ring-2 ring-amber-300 border-amber-300 bg-amber-50/90";
  }

  return "";
}

export function getValidationBadgeText(issues: CallValidationIssue[]) {
  const severity = getWorstValidationSeverity(issues);

  if (severity === "error") return "Error";
  if (severity === "warning") return "Warn";
  return null;
}

export function getValidationTooltip(issues: CallValidationIssue[]) {
  return issues[0]?.message ?? undefined;
}

function getSlotValidationShortMessage(issues: CallValidationIssue[]) {
  const primaryIssue = issues[0];

  if (!primaryIssue) return null;

  if (primaryIssue.code === "duplicate_occupied_slot") {
    return "This slot already has more than one assignment.";
  }

  if (primaryIssue.code === "duplicate_resident_assignment") {
    return "A resident is duplicated on this date/type.";
  }

  if (primaryIssue.code === "duplicate_resident_same_day") {
    return "This resident is assigned to multiple call slots on the same day.";
  }

  if (primaryIssue.code === "missing_resident_identity") {
    return "An assignment is missing resident identity.";
  }

  if (primaryIssue.code === "invalid_resident_identity") {
    return "This assignment is missing the canonical roster ID.";
  }

  if (primaryIssue.code === "resident_not_found") {
    return "This assignment references a resident outside the program roster.";
  }

  if (primaryIssue.code === "invalid_call_date") {
    return "This assignment has an invalid date.";
  }

  if (primaryIssue.code === "invalid_call_type") {
    return "This assignment has an invalid call type.";
  }

  if (primaryIssue.code === "missing_required_slot") {
    return "A required call slot is still unassigned.";
  }

  return primaryIssue.message;
}

export function getValidationSummary(validation: CallValidationResult) {
  return {
    counts: validation.counts,
    hasErrors: validation.hasErrors,
    hasWarnings: validation.hasWarnings,
    issues: validation.issues,
    firstIssues: validation.issues.slice(0, 2),
  };
}

export function getSlotValidationDisplay(
  validation: CallValidationResult,
  slotId: string
) {
  const issues = validation.issuesBySlotId[slotId] ?? [];

  return {
    issues,
    severity: getWorstValidationSeverity(issues),
    className: getValidationSeverityClass(issues),
    badgeText: getValidationBadgeText(issues),
    tooltip: getValidationTooltip(issues),
  };
}

export function getSlotValidationGuidance(
  validation: CallValidationResult,
  slotId: string
) {
  const slotDisplay = getSlotValidationDisplay(validation, slotId);

  return {
    ...slotDisplay,
    shortMessage: getSlotValidationShortMessage(slotDisplay.issues),
    tooltip:
      getSlotValidationShortMessage(slotDisplay.issues) ??
      getValidationTooltip(slotDisplay.issues),
  };
}

export function getResidentValidationDisplay(
  validation: CallValidationResult,
  rosterId: string
) {
  const issues = validation.issuesByResidentId[rosterId] ?? [];

  return {
    issues,
    severity: getWorstValidationSeverity(issues),
    className: getValidationSeverityClass(issues),
    badgeText: getValidationBadgeText(issues),
    tooltip: getValidationTooltip(issues),
  };
}

function getPickerResidentShortMessage(
  issues: CallValidationIssue[],
  activeSlotId?: string | null
) {
  const prioritizedIssues = activeSlotId
    ? [
        ...issues.filter((issue) => issue.slotId === activeSlotId),
        ...issues.filter((issue) => issue.slotId !== activeSlotId),
      ]
    : issues;

  const primaryIssue = prioritizedIssues[0];

  if (!primaryIssue) return null;

  if (
    primaryIssue.code === "duplicate_occupied_slot" ||
    (activeSlotId && primaryIssue.slotId === activeSlotId)
  ) {
    return "This slot already has an assignment.";
  }

  if (primaryIssue.code === "duplicate_resident_assignment") {
    return "Already assigned to this date/type.";
  }

  if (primaryIssue.code === "duplicate_resident_same_day") {
    return "Already assigned to another slot on this date.";
  }

  if (primaryIssue.code === "missing_resident_identity") {
    return "Resident identity is missing.";
  }

  if (primaryIssue.code === "invalid_resident_identity") {
    return "Canonical roster ID is missing.";
  }

  if (primaryIssue.code === "resident_not_found") {
    return "Resident is not in the program roster.";
  }

  if (
    primaryIssue.code === "invalid_call_date" ||
    primaryIssue.code === "invalid_call_type"
  ) {
    return "Schedule details are incomplete.";
  }

  return primaryIssue.message;
}

export function getPickerResidentGuidance(
  validation: CallValidationResult,
  rosterId: string,
  activeSlotId?: string | null
) {
  const residentDisplay = getResidentValidationDisplay(validation, rosterId);
  const slotIssues =
    activeSlotId && validation.issuesBySlotId[activeSlotId]
      ? validation.issuesBySlotId[activeSlotId]
      : [];
  const issues = residentDisplay.issues.length
    ? residentDisplay.issues
    : slotIssues;

  return {
    issues,
    severity: getWorstValidationSeverity(issues),
    className: getValidationSeverityClass(issues),
    badgeText: getValidationBadgeText(issues),
    tooltip: getValidationTooltip(issues),
    shortMessage: getPickerResidentShortMessage(issues, activeSlotId),
  };
}

export function getImportedRowValidationDisplay(
  validation: CallValidationResult,
  input: {
    callDate?: string | null;
    callType?: string | null;
    rosterId?: string | null;
    residentId?: string | null;
  }
) {
  const slotId =
    input.callDate && input.callType
      ? serializeSlotId({
          dateKey: input.callDate,
          callType: input.callType,
        })
      : null;

  const slotIssues = slotId ? validation.issuesBySlotId[slotId] ?? [] : [];
  const rosterIssues = input.rosterId
    ? validation.issuesByResidentId[input.rosterId] ?? []
    : [];
  const residentIssues = input.residentId
    ? validation.issuesByResidentId[input.residentId] ?? []
    : [];

  const directIssues = validation.issues.filter((issue) => {
    const matchesSlot =
      slotId !== null
        ? issue.slotId === slotId ||
          (issue.dateKey === input.callDate && issue.callType === input.callType)
        : false;
    const matchesResident =
      (input.rosterId && issue.rosterId === input.rosterId) ||
      (input.residentId &&
        (issue.residentId === input.residentId ||
          issue.rosterId === input.residentId));

    return matchesSlot || matchesResident;
  });

  const seen = new Set<string>();
  const issues = [...slotIssues, ...rosterIssues, ...residentIssues, ...directIssues].filter(
    (issue) => {
      const key = [
        issue.code,
        issue.slotId ?? "",
        issue.residentId ?? "",
        issue.rosterId ?? "",
        issue.message,
      ].join("__");

      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }
  );

  return {
    slotId,
    issues,
    severity: getWorstValidationSeverity(issues),
    className: getValidationSeverityClass(issues),
    badgeText: getValidationBadgeText(issues),
    tooltip: getSlotValidationShortMessage(issues) ?? getValidationTooltip(issues),
    shortMessage: getSlotValidationShortMessage(issues),
  };
}
