import type {
  AssignmentFlag,
  CalendarDay,
  DraftDayAssignment,
  ExistingResidentStats,
  ProgramAvailabilityMonthResponse,
  ProgramRule,
  ResidentOption,
  QuickAssignSlotMode,
} from "@/components/workspace/call/programcalltypes";

import {
  evaluateResidentForSlot,
  isResidentAllowedForSlot,
  getFlagsForAssignedResident,
} from "@/components/workspace/call/programcallevaluator";
import {
  DEFAULT_SLOT_DEFINITIONS,
  getEffectiveRules,
  getSlotStatusForDay,
  getVisibleCallSlotsForDay,
  type ProgramCallSlotDefinition,
} from "@/lib/workspace/call/rule-definitions"; // Phase 9 alignment
import {
  countUniqueWeekendBuckets,
  evaluateMonthlyLimitForResident,
  evaluatePgyEligibility,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  evaluateWeekendPairingForResident,
  getAdjacentWeekendDateKey,
  getDateDiffInDays,
  getRequiredCallTypesFromRules,
  getResidentPgyYear,
  getRuleSeverity,
  isRuleEnabled,
} from "@/lib/workspace/call/rule-evaluator";

type Slot = "Primary" | "Backup" | "Buddy";

type GenerateParams = {
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  existingAssignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  generationVersion?: number;
  forceRegenerate?: boolean;
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  historicalStats: ExistingResidentStats[];
  slotMode?: QuickAssignSlotMode;
  slotDefinitions?: ProgramCallSlotDefinition[];
};

type ResidentAutoStats = {
  resident: ResidentOption;
  monthPrimary: number;
  monthBackup: number;
  monthBuddy: number;
  monthTotal: number;
  monthWeekend: number;
  monthWeekendPrimary: number;
  monthWeekendBackup: number;
  yearPrimary: number;
  yearBackup: number;
  yearBuddy: number;
  yearTotal: number;
  yearWeekend: number;
  yearWeekendPrimary: number;
  yearWeekendBackup: number;

  primaryDates: string[];
  backupDates: string[];
  buddyDates: string[];
  assignedDates: string[];
};

type GeneratedScheduleCombination = {
  rank: number;
  generationVersion: number;
  isComplete: boolean;
  isValid: boolean;
  score: number;
  openRequiredSlots: number;
  hardErrorCount: number;
  warningCount: number;
  assignments: Record<string, DraftDayAssignment>;
  stats: ResidentAutoStats[];
  diagnostics: CombinationDiagnostics;
};

type CombinationIssue = {
  dateKey: string;
  slot: Slot;
  residentId: string;
  residentName: string;
  severity: "error" | "warning";
  message: string;
};

type CombinationDiagnostics = {
  totalIssues: number;
  hardErrors: number;
  warnings: number;
  primaryIssues: number;
  backupIssues: number;
  invalidAssignments: number;
  unresolvedResidentAssignments: number;
  isCompleteButInvalid: boolean;
  examples: CombinationIssue[];
  invalidAssignmentsByDate: CombinationIssue[];
};

type ResidentWithRotation = ResidentOption & {
  currentRotationId?: string | null;
  rotationId?: string | null;
  activeRotationId?: string | null;
  current_rotation_id?: string | null;
  rotation_id?: string | null;
  rotationAssignments?: Array<{
    rotationId?: string | null;
    rotation_id?: string | null;
    startDate?: string | null;
    start_date?: string | null;
    endDate?: string | null;
    end_date?: string | null;
  }>;
};

function getResidentRotationId(resident: ResidentOption, dateKey: string) {
  const r = resident as ResidentWithRotation;

  const dateSpecificRotation = r.rotationAssignments?.find((assignment) => {
    const startDate = assignment.startDate ?? assignment.start_date;
    const endDate = assignment.endDate ?? assignment.end_date;

    if (!startDate || !endDate) return false;

    return dateKey >= startDate && dateKey <= endDate;
  });

  if (dateSpecificRotation) {
    return (
      dateSpecificRotation.rotationId ??
      dateSpecificRotation.rotation_id ??
      null
    );
  }

  return (
    r.currentRotationId ??
    r.rotationId ??
    r.activeRotationId ??
    r.current_rotation_id ??
    r.rotation_id ??
    null
  );
}

function isResidentBlockedByRotationRule({
  resident,
  slot,
  dateKey,
  rules,
}: {
  resident: ResidentOption;
  slot: Slot;
  dateKey: string;
  rules: ProgramRule[];
}) {
  const residentRotationId = getResidentRotationId(resident, dateKey);

  if (!residentRotationId) return false;

  return (
    evaluateRotationEligibility({
      rotationIds: [residentRotationId],
      callType: slot,
      rules,
    }).length > 0
  );
}

const PRIMARY_WEIGHT = 1;
const BACKUP_WEIGHT = 0.25;
const WEEKEND_PRIMARY_WEIGHT = 1;
const WEEKEND_BACKUP_WEIGHT = 0.3;

function getResidentYearValue(
  resident: ResidentOption,
  effectiveDate?: string | null
) {
  return getResidentPgyYear(resident, effectiveDate) ?? 99;
}

function getExpectedPgyBurdenMultiplier(resident: ResidentOption) {
  const pgy = getResidentYearValue(resident);

  // Lower PGYs are expected to carry more call burden.
  // This does not force bad schedules, but it lowers their fairness penalty.
  if (pgy <= 1) return 1.35;
  if (pgy === 2) return 1.25;
  if (pgy === 3) return 1.1;
  if (pgy === 4) return 0.95;
  if (pgy >= 5 && pgy < 99) return 0.8;

  return 1;
}

function pgyLabel(resident: ResidentOption) {
  if (typeof resident.pgyYear === "number") return `PGY-${resident.pgyYear}`;
  if (resident.trainingLevel) return resident.trainingLevel;
  return "Unknown";
}

function getWeightedMonthBurden(entry: ResidentAutoStats) {
  return entry.monthPrimary * PRIMARY_WEIGHT + entry.monthBackup * BACKUP_WEIGHT;
}

function getWeightedYearBurden(entry: ResidentAutoStats) {
  return entry.yearPrimary * PRIMARY_WEIGHT + entry.yearBackup * BACKUP_WEIGHT;
}

function getWeightedWeekendBurden(entry: ResidentAutoStats) {
  return (
    entry.monthWeekendPrimary * WEEKEND_PRIMARY_WEIGHT +
    entry.monthWeekendBackup * WEEKEND_BACKUP_WEIGHT
  );
}

function getWeightedYearWeekendBurden(entry: ResidentAutoStats) {
  return (
    entry.yearWeekendPrimary * WEEKEND_PRIMARY_WEIGHT +
    entry.yearWeekendBackup * WEEKEND_BACKUP_WEIGHT
  );
}

function getAdjustedMonthBurden(entry: ResidentAutoStats) {
  return getWeightedMonthBurden(entry) / getExpectedPgyBurdenMultiplier(entry.resident);
}

function getAdjustedWeekendBurden(entry: ResidentAutoStats) {
  return getWeightedWeekendBurden(entry) / getExpectedPgyBurdenMultiplier(entry.resident);
}

function daysBetween(a: string, b: string) {
  return getDateDiffInDays(a, b);
}

function getFlagMessage(flag: AssignmentFlag) {
  const raw = flag as unknown as {
    message?: string;
    label?: string;
    description?: string;
    type?: string;
  };

  return (
    raw.message ??
    raw.label ??
    raw.description ??
    raw.type ??
    JSON.stringify(flag)
  );
}

function summarizeRuleWarningsForCombination({
  combo,
  monthDays,
  residents,
  rules,
  availabilityByResident,
}: {
  combo: GeneratedScheduleCombination;
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
}) {
  const residentLookup = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );

  const warnings: Array<{
    dateKey: string;
    slot: Slot;
    residentName: string;
    message: string;
  }> = [];

  for (const day of monthDays) {
    const assignment = combo.assignments[day.key];
    if (!assignment) continue;

    function check(residentId: string | null | undefined, slot: Slot) {
      if (!residentId) return;

      const resident = residentLookup.get(residentId);
      if (!resident) return;

      const flags = getFlagsForAssignedResident({
        resident,
        slot,
        dateKey: day.key,
        assignments: combo.assignments,
        rules,
        availabilityByResident,
      });

      for (const flag of flags) {
        warnings.push({
          dateKey: day.key,
          slot,
          residentName: resident.displayName,
          message: getFlagMessage(flag),
        });
      }
    }

    check(assignment.primaryRosterId, "Primary");
    check(assignment.backupRosterId, "Backup");
    check(assignment.buddyRosterId, "Buddy");
  }

  return {
    total: warnings.length,
    primary: warnings.filter((w) => w.slot === "Primary").length,
    backup: warnings.filter((w) => w.slot === "Backup").length,
    examples: warnings.slice(0, 5),
  };
}

function buildInitialStats(
  residents: ResidentOption[],
  historicalStats: ExistingResidentStats[]
) {
  const stats = new Map<string, ResidentAutoStats>();

  for (const resident of residents) {
    const baseline = historicalStats.find(
      (item) => item.residentId === resident.residentId
    );

    stats.set(resident.residentId, {
  resident,
  monthPrimary: 0,
  monthBackup: 0,
  monthBuddy: 0,
  monthTotal: 0,
  monthWeekend: 0,
  monthWeekendPrimary: 0,
  monthWeekendBackup: 0,
  yearPrimary: baseline?.primaryCallsYear ?? 0,
  yearBackup: baseline?.backupCallsYear ?? 0,
  yearBuddy: baseline?.buddyCallsYear ?? 0,
  yearTotal: baseline?.totalCallsYear ?? 0,
  yearWeekend: baseline?.weekendCallsYear ?? 0,
  yearWeekendPrimary: 0,
  yearWeekendBackup: 0,
  primaryDates: [],
  backupDates: [],
  buddyDates: [],
  assignedDates: [],
});
  }

  return stats;
}

function updateStats(
  stats: Map<string, ResidentAutoStats>,
  residentId: string,
  slot: Slot,
  day: CalendarDay,
  countsTowardWorkload = true
) {
  const entry = stats.get(residentId);
  if (!entry) return;

  if (slot === "Primary") {
    entry.monthPrimary += 1;
    entry.yearPrimary += 1;
    entry.primaryDates.push(day.key);
  } else if (slot === "Backup") {
    entry.monthBackup += 1;
    entry.yearBackup += 1;
    entry.backupDates.push(day.key);
  } else {
    entry.monthBuddy += 1;
    entry.yearBuddy += 1;
    entry.buddyDates.push(day.key);
  }

  if (countsTowardWorkload) {
    entry.monthTotal += 1;
    entry.yearTotal += 1;
    entry.assignedDates.push(day.key);
  }

  if (countsTowardWorkload && day.isWeekend) {
    entry.monthWeekend += 1;
    entry.yearWeekend += 1;

    if (slot === "Primary") {
      entry.monthWeekendPrimary += 1;
      entry.yearWeekendPrimary += 1;
    } else if (slot === "Backup") {
      entry.monthWeekendBackup += 1;
      entry.yearWeekendBackup += 1;
    }
  }
}

function analyzeCombinationDiagnostics({
  combo,
  monthDays,
  residents,
  rules,
  availabilityByResident,
}: {
  combo: Pick<GeneratedScheduleCombination, "assignments" | "openRequiredSlots">;
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
}) {
  const residentLookup = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );

  const issues: CombinationIssue[] = [];
  let invalidAssignments = 0;
  let unresolvedResidentAssignments = 0;

  for (const day of monthDays) {
    const assignment = combo.assignments[day.key];
    if (!assignment) continue;

    function inspectResidentAssignment(
      residentId: string | null | undefined,
      slot: Slot
    ) {
      if (!residentId) return;

      const resident = residentLookup.get(residentId);

      if (!resident) {
        unresolvedResidentAssignments += 1;
        issues.push({
          dateKey: day.key,
          slot,
          residentId,
          residentName: "Unknown resident",
          severity: "error",
          message: "Assigned resident id does not match any loaded roster resident.",
        });
        return;
      }

      const evaluation = evaluateResidentForSlot({
        resident,
        slot,
        dateKey: day.key,
        assignments: combo.assignments,
        rules,
        availabilityByResident,
      });

      let slotHasHardError = false;

      for (const block of evaluation.blocks) {
        slotHasHardError = true;
        issues.push({
          dateKey: day.key,
          slot,
          residentId,
          residentName: resident.displayName,
          severity: "error",
          message: block.message,
        });
      }

      for (const warning of evaluation.warnings) {
        issues.push({
          dateKey: day.key,
          slot,
          residentId,
          residentName: resident.displayName,
          severity: "warning",
          message: warning.message,
        });
      }

      if (slotHasHardError) {
        invalidAssignments += 1;
      }
    }

    inspectResidentAssignment(assignment.primaryRosterId, "Primary");
    inspectResidentAssignment(assignment.backupRosterId, "Backup");
    inspectResidentAssignment(assignment.buddyRosterId, "Buddy");
  }

  const hardErrors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    totalIssues: issues.length,
    hardErrors: hardErrors.length,
    warnings: warnings.length,
    primaryIssues: issues.filter((issue) => issue.slot === "Primary").length,
    backupIssues: issues.filter((issue) => issue.slot === "Backup").length,
    invalidAssignments,
    unresolvedResidentAssignments,
    isCompleteButInvalid:
      combo.openRequiredSlots === 0 && hardErrors.length > 0,
    examples: issues.slice(0, 8),
    invalidAssignmentsByDate: hardErrors.slice(0, 12),
  } satisfies CombinationDiagnostics;
}

function applyExistingAssignmentsToStats(
  stats: Map<string, ResidentAutoStats>,
  monthDays: CalendarDay[],
  assignments: Record<string, DraftDayAssignment>,
  slotDefinitions: ProgramCallSlotDefinition[]
) {
  const buddyCountsTowardWorkload =
    slotDefinitions.find((definition) => definition.callType === "Buddy")
      ?.countsTowardWorkload ?? false;

  for (const day of monthDays) {
    const assignment = assignments[day.key];
    if (!assignment) continue;

    if (assignment.primaryRosterId) {
      updateStats(stats, assignment.primaryRosterId, "Primary", day);
    }

    if (assignment.backupRosterId) {
      updateStats(stats, assignment.backupRosterId, "Backup", day);
    }

    if (assignment.buddyRosterId) {
      updateStats(
        stats,
        assignment.buddyRosterId,
        "Buddy",
        day,
        buddyCountsTowardWorkload
      );
    }
  }
}

function getPgyAverages(stats: Map<string, ResidentAutoStats>) {
  const groups = new Map<
    string,
    {
      count: number;
      adjustedMonthBurden: number;
      adjustedWeekendBurden: number;
      monthPrimary: number;
      monthBackup: number;
    }
  >();

  for (const entry of stats.values()) {
    const label = pgyLabel(entry.resident);
    const current = groups.get(label) ?? {
      count: 0,
      adjustedMonthBurden: 0,
      adjustedWeekendBurden: 0,
      monthPrimary: 0,
      monthBackup: 0,
    };

    current.count += 1;
    current.adjustedMonthBurden += getAdjustedMonthBurden(entry);
    current.adjustedWeekendBurden += getAdjustedWeekendBurden(entry);
    current.monthPrimary += entry.monthPrimary;
    current.monthBackup += entry.monthBackup;

    groups.set(label, current);
  }

  return groups;
}

function getRulePenalty({
  resident,
  slot,
  day,
  stats,
  assignments,
  rules,
}: {
  resident: ResidentOption;
  slot: Slot;
  day: CalendarDay;
  stats: Map<string, ResidentAutoStats>;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
}) {
  const entry = stats.get(resident.residentId);
  if (!entry) return 999999;

  let penalty = 0;

  const softSlotWeight = slot === "Primary" ? 1 : 0.65;
  const hardSlotWeight = 1;

  const projectedMonthPrimary = entry.monthPrimary + (slot === "Primary" ? 1 : 0);
  const projectedMonthBackup = entry.monthBackup + (slot === "Backup" ? 1 : 0);
  const projectedWeekendPrimary =
    entry.monthWeekendPrimary + (day.isWeekend && slot === "Primary" ? 1 : 0);
  const projectedWeekendBackup =
    entry.monthWeekendBackup + (day.isWeekend && slot === "Backup" ? 1 : 0);

  const projectedWeightedBurden =
    projectedMonthPrimary * PRIMARY_WEIGHT + projectedMonthBackup * BACKUP_WEIGHT;

  const projectedWeightedWeekendBurden =
    projectedWeekendPrimary * WEEKEND_PRIMARY_WEIGHT +
    projectedWeekendBackup * WEEKEND_BACKUP_WEIGHT;

  for (const violation of evaluateRotationEligibility({
    rotationIds: [getResidentRotationId(resident, day.key)],
    callType: slot,
    rules,
  })) {
    penalty += 999999 * (violation.severity === "error" ? 10 : 1);
  }

  for (const violation of evaluateSpacingForResident({
    assignedDates: entry.assignedDates,
    dateKey: day.key,
    rules,
  })) {
    const minDays = Number(violation.metadata?.minDays ?? 0);
    const gap = Number(
      violation.metadata?.conflictingDateKey
        ? daysBetween(day.key, String(violation.metadata.conflictingDateKey))
        : 0
    );
    const hardMultiplier = violation.severity === "error" ? 10 : 1;
    const ruleWeight = violation.severity === "error" ? hardSlotWeight : softSlotWeight;

    if (gap > 0 && minDays > 0) {
      penalty += (minDays - gap + 1) * 120 * hardMultiplier * ruleWeight;
    }
  }

  for (const violation of evaluateMonthlyLimitForResident({
    assignmentCount: entry.monthTotal + 1,
    rules,
  })) {
    const hardMultiplier = violation.severity === "error" ? 10 : 1;
    penalty += 50000 * hardMultiplier;
  }

  const projectedWeekendCount = countUniqueWeekendBuckets([
    ...entry.assignedDates,
    ...(day.isWeekend ? [day.key] : []),
  ]);
  for (const violation of evaluateWeekendLimitForResident({
    dateKey: day.key,
    weekendCount: projectedWeekendCount,
    rules,
  })) {
    const hardMultiplier = violation.severity === "error" ? 10 : 1;
    penalty += 50000 * hardMultiplier;
  }

  for (const violation of evaluatePgyEligibility({
    resident,
    callType: slot,
    rules,
    effectiveDate: day.key,
  })) {
    const hardMultiplier = violation.severity === "error" ? 10 : 1;
    penalty += 99999 * hardMultiplier;
  }

  const pairedDateKey = getAdjacentWeekendDateKey(day.key);
  const pairedAssignment = pairedDateKey ? assignments[pairedDateKey] : null;
  const pairedResidentId =
    slot === "Primary"
      ? pairedAssignment?.primaryRosterId ?? null
      : pairedAssignment?.backupRosterId ?? null;

  for (const violation of evaluateWeekendPairingForResident({
    residentId: resident.residentId,
    adjacentResidentId: pairedResidentId,
    dateKey: day.key,
    callType: slot,
    rules,
  })) {
    const hardMultiplier = violation.severity === "error" ? 10 : 1;
    const ruleWeight = violation.severity === "error" ? hardSlotWeight : softSlotWeight;
    penalty += (slot === "Primary" ? 250 : 150) * hardMultiplier * ruleWeight;
  }

  for (const rule of rules) {
    if (!isRuleEnabled(rule)) continue;

    const ruleWeight = getRuleSeverity(rule) === "error" ? hardSlotWeight : softSlotWeight;

    const heuristicRuleType =
      ((rule as unknown as { rule_type?: string; type?: string }).rule_type ??
        (rule as unknown as { rule_type?: string; type?: string }).type ??
        "");

    if (heuristicRuleType === "prefer_balanced_totals") {
      penalty += projectedWeightedBurden * 20 * ruleWeight;
      penalty += getWeightedYearBurden(entry) * 1.5 * ruleWeight;
    }

    if (heuristicRuleType === "prefer_balanced_weekends" && day.isWeekend) {
      penalty += projectedWeightedWeekendBurden * 30 * ruleWeight;
      penalty += getWeightedYearWeekendBurden(entry) * 2 * ruleWeight;
    }
  }

  return penalty;
}

function seededNoise({
  residentId,
  dateKey,
  slot,
  generationVersion,
}: {
  residentId: string;
  dateKey: string;
  slot: Slot;
  generationVersion: number;
}) {
  const input = `${residentId}-${dateKey}-${slot}-${generationVersion}`;
  let hash = 2166136261;

  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const normalized = (hash >>> 0) / 4294967295;

  return normalized * 350;
}

function scoreResident({
  resident,
  slot,
  day,
  stats,
  assignments,
  rules,
  generationVersion,
}: {
  resident: ResidentOption;
  slot: Slot;
  day: CalendarDay;
  stats: Map<string, ResidentAutoStats>;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  generationVersion: number;
}) {
  const entry = stats.get(resident.residentId);
  if (!entry) return Number.POSITIVE_INFINITY;

  const pgyAverages = getPgyAverages(stats);
  const group = pgyAverages.get(pgyLabel(resident));

  const adjustedMonthBurden = getAdjustedMonthBurden(entry);
  const adjustedWeekendBurden = getAdjustedWeekendBurden(entry);
  const weightedYearBurden = getWeightedYearBurden(entry);

  const pgyAdjustedMonthAverage = group
    ? group.adjustedMonthBurden / Math.max(group.count, 1)
    : 0;

  const pgyAdjustedWeekendAverage = group
    ? group.adjustedWeekendBurden / Math.max(group.count, 1)
    : 0;

  let score = 0;

  // Overall fairness: primary dominates, backup is much lighter.
  score += adjustedMonthBurden * 18;
  score += weightedYearBurden * 1.5;

  // Strongly avoid repeatedly assigning primary call.
  score += entry.monthPrimary * (slot === "Primary" ? 16 : 5);

  // Backup matters, but much less than primary.
  score += entry.monthBackup * (slot === "Backup" ? 3 : 1);

  // Prefer residents under their PGY-adjusted burden average.
  score += Math.max(0, adjustedMonthBurden - pgyAdjustedMonthAverage) * 14;

  if (day.isWeekend) {
    score += adjustedWeekendBurden * 24;
    score += getWeightedYearWeekendBurden(entry) * 2;

    score += Math.max(0, adjustedWeekendBurden - pgyAdjustedWeekendAverage) * 18;

    if (slot === "Primary") {
      score += entry.monthWeekendPrimary * 14;
    } else {
      score += entry.monthWeekendBackup * 3;
    }
  }

  // Spacing still matters, but backup is less punishing than primary.
  const spacingMultiplier = slot === "Primary" ? 1 : 0.65;

  for (const assignedDate of entry.assignedDates) {
    const gap = daysBetween(day.key, assignedDate);

    if (gap === 0) score += 99999;
    else if (gap === 1) score += 90 * spacingMultiplier;
    else if (gap === 2) score += 40 * spacingMultiplier;
    else if (gap === 3) score += 15 * spacingMultiplier;
  }

  const current = assignments[day.key];

  if (
    current?.primaryRosterId === resident.residentId ||
    current?.backupRosterId === resident.residentId ||
    current?.buddyRosterId === resident.residentId
  ) {
    score += 99999;
  }

  score += getRulePenalty({
    resident,
    slot,
    day,
    stats,
    assignments,
    rules,
  });

  score += seededNoise({
    residentId: resident.residentId,
    dateKey: day.key,
    slot,
    generationVersion,
  });

  return score;
}

function getSecondarySlotContext({
  day,
  current,
  residentsById,
  slotDefinitions,
}: {
  day: CalendarDay;
  current: DraftDayAssignment;
  residentsById: Map<string, ResidentOption>;
  slotDefinitions: ProgramCallSlotDefinition[];
}) {
  const primaryResident = current.primaryRosterId
    ? residentsById.get(current.primaryRosterId)
    : null;
  const primaryPgyYear = primaryResident?.pgyYear ?? null;
  const dayOfWeek = day.date.getDay();

  const backupDefs = slotDefinitions.filter((def) => def.callType === "Backup");
  const buddyDefs = slotDefinitions.filter((def) => def.callType === "Buddy");

  const visibleBackupDefs = backupDefs.filter((def) => {
    const { isVisible } = getSlotStatusForDay({
      def,
      dayOfWeek,
      primaryPgyYear,
      hasAssignment: Boolean(current.backupRosterId),
    });
    return isVisible;
  });

  const visibleBuddyDefs = buddyDefs.filter((def) => {
    const { isVisible } = getSlotStatusForDay({
      def,
      dayOfWeek,
      primaryPgyYear,
      hasAssignment: Boolean(current.buddyRosterId),
    });
    return isVisible;
  });

  const backupDef = visibleBackupDefs[0] ?? null;
  const buddyDef = visibleBuddyDefs[0] ?? null;

  return {
    backupDef,
    buddyDef,
    buddyCountsTowardWorkload: buddyDef?.countsTowardWorkload ?? false,
  };
}

function scoreBuddyResident({
  resident,
  day,
  stats,
  generationVersion,
  preferredPgyYears,
}: {
  resident: ResidentOption;
  day: CalendarDay;
  stats: Map<string, ResidentAutoStats>;
  generationVersion: number;
  preferredPgyYears: number[];
}) {
  const entry = stats.get(resident.residentId);
  if (!entry) return Number.POSITIVE_INFINITY;

  let score = 0;
  const residentPgy = getResidentPgyYear(resident, day.key);

  if (preferredPgyYears.length > 0) {
    score += preferredPgyYears.includes(residentPgy ?? -1) ? -250 : 250;
  }

  score += entry.monthBuddy * 50;
  score += entry.yearBuddy * 6;
  score += entry.monthTotal * 8;
  score += entry.monthWeekend * (day.isWeekend ? 10 : 0);
  score += entry.assignedDates.length * 5;

  score += seededNoise({
    residentId: resident.residentId,
    dateKey: day.key,
    slot: "Buddy",
    generationVersion,
  });

  return score;
}

function pickBestBuddyResident({
  residents,
  day,
  current,
  assignments,
  rules,
  availabilityByResident,
  stats,
  generationVersion,
  slotDefinition,
}: {
  residents: ResidentOption[];
  day: CalendarDay;
  current: DraftDayAssignment;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  stats: Map<string, ResidentAutoStats>;
  generationVersion: number;
  slotDefinition: ProgramCallSlotDefinition;
}) {
  const preferredPgyYears =
    slotDefinition.condition?.type === "when_pgy_scheduled"
      ? slotDefinition.condition.pgyYears
      : [];

  const eligible = residents.filter((resident) => {
    if (
      resident.residentId === current.primaryRosterId ||
      resident.residentId === current.backupRosterId ||
      resident.residentId === current.buddyRosterId
    ) {
      return false;
    }

    if (
      assignments[day.key]?.primaryRosterId === resident.residentId ||
      assignments[day.key]?.backupRosterId === resident.residentId
    ) {
      return false;
    }

    if (
      isResidentBlockedByRotationRule({
        resident,
        slot: "Buddy",
        dateKey: day.key,
        rules,
      })
    ) {
      return false;
    }

    return isResidentAllowedForSlot({
      resident,
      slot: "Buddy",
      dateKey: day.key,
      assignments,
      rules,
      availabilityByResident,
    });
  });

  if (eligible.length === 0) return null;

  const ranked = eligible
    .map((resident) => ({
      resident,
      evaluation: evaluateResidentForSlot({
        resident,
        slot: "Buddy",
        dateKey: day.key,
        assignments,
        rules,
        availabilityByResident,
      }),
      score: scoreBuddyResident({
        resident,
        day,
        stats,
        generationVersion,
        preferredPgyYears,
      }),
    }))
    .sort((a, b) => {
      if (a.evaluation.warnings.length !== b.evaluation.warnings.length) {
        return a.evaluation.warnings.length - b.evaluation.warnings.length;
      }

      if (a.score !== b.score) return a.score - b.score;
      return a.resident.displayName.localeCompare(b.resident.displayName);
    });

  return ranked[0]?.resident ?? null;
}

function pickBestResident({
  residents,
  slot,
  day,
  assignments,
  rules,
  availabilityByResident,
  stats,
  generationVersion,
}: {
  residents: ResidentOption[];
  slot: Slot;
  day: CalendarDay;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  stats: Map<string, ResidentAutoStats>;
  generationVersion: number;
}) {
  const eligible = residents.filter(
  (resident) =>
    !isResidentBlockedByRotationRule({
      resident,
      slot,
      dateKey: day.key,
      rules,
    }) &&
    isResidentAllowedForSlot({
      resident,
      slot,
      dateKey: day.key,
      assignments,
      rules,
      availabilityByResident,
    })
);

  if (eligible.length === 0) return null;

  const ranked = eligible
    .map((resident) => ({
      resident,
      score: scoreResident({
        resident,
        slot,
        day,
        stats,
        assignments,
        rules,
        generationVersion,
      }),
    }))
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.resident.displayName.localeCompare(b.resident.displayName);
    });

  return ranked[0]?.resident ?? null;
}

function countOpenRequiredSlots({
  monthDays,
  assignments,
  rules,
  slotMode,
  slotDefinitions = DEFAULT_SLOT_DEFINITIONS,
  residentsById,
}: {
  monthDays: CalendarDay[];
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  slotMode: QuickAssignSlotMode;
  slotDefinitions?: ProgramCallSlotDefinition[];
  residentsById?: Map<string, ResidentOption>;
}) {
  let open = 0;

  const requiredCallTypes = getRequiredCallTypesFromRules(rules);
  const shouldCheckPrimary =
    requiredCallTypes.length > 0
      ? requiredCallTypes.includes("Primary")
      : slotMode === "Primary" || slotMode === "Both";
  const globalBackupRequired =
    requiredCallTypes.length > 0
      ? requiredCallTypes.includes("Backup")
      : slotMode === "Backup" || slotMode === "Both";

  const customBackupDefs = slotDefinitions.filter((def) => def.callType === "Backup");
  const hasCustomBackupDefs = customBackupDefs.length > 0;

  for (const day of monthDays) {
    const assignment = assignments[day.key];

    if (shouldCheckPrimary && !assignment?.primaryRosterId) {
      open += 1;
    }

    if (!assignment?.backupRosterId) {
      if (hasCustomBackupDefs) {
        // Per-day conditional check: only count as open if this slot is visible AND required.
        const primaryPgyYear =
          assignment?.primaryRosterId && residentsById
            ? (residentsById.get(assignment.primaryRosterId)?.pgyYear ?? null)
            : null;
        const dayOfWeek = day.date.getDay();
        const hasRequiredOpenBackup = customBackupDefs.some((def) => {
          const { isRequired } = getSlotStatusForDay({
            def,
            dayOfWeek,
            primaryPgyYear,
            hasAssignment: false,
          });
          return isRequired;
        });
        if (hasRequiredOpenBackup) open += 1;
      } else if (globalBackupRequired) {
        open += 1;
      }
    }
  }

  return open;
}

function scoreGeneratedSchedule({
  stats,
  assignments,
  monthDays,
  rules,
  slotMode,
  diagnostics,
  slotDefinitions,
  residentsById,
}: {
  stats: ResidentAutoStats[];
  assignments: Record<string, DraftDayAssignment>;
  monthDays: CalendarDay[];
  rules: ProgramRule[];
  slotMode: QuickAssignSlotMode;
  diagnostics: CombinationDiagnostics;
  slotDefinitions?: ProgramCallSlotDefinition[];
  residentsById?: Map<string, ResidentOption>;
}) {
  const openRequiredSlots = countOpenRequiredSlots({
    monthDays,
    assignments,
    rules,
    slotMode,
    slotDefinitions,
    residentsById,
  });

  const adjustedMonthBurdens = stats.map(getAdjustedMonthBurden);
  const adjustedWeekendBurdens = stats.map(getAdjustedWeekendBurden);
  const primaryTotals = stats.map((item) => item.monthPrimary);
  const backupTotals = stats.map((item) => item.monthBackup);

  const adjustedBurdenSpread =
    adjustedMonthBurdens.length > 0
      ? Math.max(...adjustedMonthBurdens) - Math.min(...adjustedMonthBurdens)
      : 0;

  const adjustedWeekendSpread =
    adjustedWeekendBurdens.length > 0
      ? Math.max(...adjustedWeekendBurdens) - Math.min(...adjustedWeekendBurdens)
      : 0;

  const primarySpread =
    primaryTotals.length > 0 ? Math.max(...primaryTotals) - Math.min(...primaryTotals) : 0;

  const backupSpread =
    backupTotals.length > 0 ? Math.max(...backupTotals) - Math.min(...backupTotals) : 0;

  const totalWeightedBurden = stats.reduce(
    (sum, item) => sum + getWeightedMonthBurden(item),
    0
  );

  const totalWeightedWeekendBurden = stats.reduce(
    (sum, item) => sum + getWeightedWeekendBurden(item),
    0
  );

  return (
    diagnostics.hardErrors * 1000000 +
    diagnostics.invalidAssignments * 250000 +
    openRequiredSlots * 100000 +
    diagnostics.warnings * 300 +
    adjustedBurdenSpread * 800 +
    adjustedWeekendSpread * 1000 +
    primarySpread * 650 +
    backupSpread * 120 +
    totalWeightedBurden * 5 +
    totalWeightedWeekendBurden * 12
  );
}

function generateSingleCallSchedule({
  monthDays,
  residents,
  existingAssignments,
  rules,
  generationVersion = Date.now(),
  forceRegenerate = false,
  availabilityByResident,
  historicalStats,
  slotMode = "Both",
  slotDefinitions = DEFAULT_SLOT_DEFINITIONS,
}: GenerateParams) {
  const enabledRules = rules.filter(isRuleEnabled);
  const effectiveSlotDefinitions =
    slotDefinitions.length > 0 ? slotDefinitions : DEFAULT_SLOT_DEFINITIONS;
  const residentsById = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );

  const nextAssignments: Record<string, DraftDayAssignment> = {};

  for (const day of monthDays) {
    const existing = existingAssignments[day.key] ?? {
      primaryRosterId: null,
      backupRosterId: null,
      buddyRosterId: null,
    };

    nextAssignments[day.key] = forceRegenerate
      ? {
          primaryRosterId: null,
          backupRosterId: null,
          buddyRosterId: null,
        }
      : {
          primaryRosterId: existing.primaryRosterId ?? null,
          backupRosterId: existing.backupRosterId ?? null,
          buddyRosterId: existing.buddyRosterId ?? null,
        };
  }

  const stats = buildInitialStats(residents, historicalStats);

  if (!forceRegenerate) {
    applyExistingAssignmentsToStats(
      stats,
      monthDays,
      nextAssignments,
      effectiveSlotDefinitions
    );
  }

  const requiredCallTypes = getRequiredCallTypesFromRules(enabledRules);
  const shouldFillPrimary =
    requiredCallTypes.length > 0
      ? requiredCallTypes.includes("Primary")
      : slotMode === "Primary" || slotMode === "Both";

  // Whether to attempt filling Backup from the global required_daily_call_slots rule.
  // When custom slot definitions exist that define a Backup slot, per-day visibility
  // overrides this for conditional slots (see getSecondarySlotContext below).
  const globalBackupRequired =
    requiredCallTypes.length > 0
      ? requiredCallTypes.includes("Backup")
      : slotMode === "Backup" || slotMode === "Both";

  // True when the program has defined custom Backup slot definitions with conditions.
  // In that case, per-day evaluation takes over from the global flag.
  const hasCustomBackupDefs = effectiveSlotDefinitions.some(
    (def) => def.callType === "Backup"
  );

  for (const day of monthDays) {
    const current = nextAssignments[day.key] ?? {
      primaryRosterId: null,
      backupRosterId: null,
      buddyRosterId: null,
    };

    if (shouldFillPrimary && !current.primaryRosterId) {
      const picked = pickBestResident({
        residents,
        slot: "Primary",
        day,
        assignments: nextAssignments,
        rules: enabledRules,
        availabilityByResident,
        stats,
        generationVersion,
      });

      if (picked) {
        current.primaryRosterId = picked.residentId;
        nextAssignments[day.key] = current;
        updateStats(stats, picked.residentId, "Primary", day);
      }
    }

    // Phase 2: Determine which secondary slots are visible AFTER Primary is known.
    const { backupDef, buddyDef, buddyCountsTowardWorkload } =
      getSecondarySlotContext({
        day,
        current,
        residentsById,
        slotDefinitions: effectiveSlotDefinitions,
      });

    // Fill Backup when:
    //   - custom slot defs: use per-day visibility from getSecondarySlotContext
    //   - no custom slot defs: use legacy global flag (globalBackupRequired)
    const shouldFillBackupThisDay = !current.backupRosterId && (
      hasCustomBackupDefs
        ? backupDef !== null  // visible per slot definition (required or optional)
        : globalBackupRequired
    );

    if (process.env.NODE_ENV === "development" && hasCustomBackupDefs) {
      const primaryResident = current.primaryRosterId
        ? residentsById.get(current.primaryRosterId)
        : null;
      // eslint-disable-next-line no-console
      console.debug("[auto-gen]", day.key, {
        primaryName: primaryResident?.displayName ?? null,
        primaryPgy: primaryResident?.pgyYear ?? null,
        backupDefVisible: backupDef !== null,
        shouldFillBackup: shouldFillBackupThisDay,
        backupAssignedAfter: current.backupRosterId ?? "(none)",
      });
    }

    if (shouldFillBackupThisDay) {
      const picked = pickBestResident({
        residents: residents.filter(
          (resident) => resident.residentId !== current.primaryRosterId
        ),
        slot: "Backup",
        day,
        assignments: nextAssignments,
        rules: enabledRules,
        availabilityByResident,
        stats,
        generationVersion,
      });

      if (picked) {
        current.backupRosterId = picked.residentId;
        nextAssignments[day.key] = current;
        updateStats(stats, picked.residentId, "Backup", day);
      } else if (process.env.NODE_ENV === "development" && hasCustomBackupDefs) {
        // eslint-disable-next-line no-console
        console.debug("[auto-gen] backup slot visible but no eligible resident found:", day.key);
      }
    }

    if (!current.buddyRosterId && buddyDef) {
      const pickedBuddy = pickBestBuddyResident({
        residents,
        day,
        current,
        assignments: nextAssignments,
        rules: enabledRules,
        availabilityByResident,
        stats,
        generationVersion,
        slotDefinition: buddyDef,
      });

      if (pickedBuddy) {
        current.buddyRosterId = pickedBuddy.residentId;
        nextAssignments[day.key] = current;
        updateStats(
          stats,
          pickedBuddy.residentId,
          "Buddy",
          day,
          buddyCountsTowardWorkload
        );
      }
    }

    nextAssignments[day.key] = current;
  }

  return {
    assignments: nextAssignments,
    stats: Array.from(stats.values()),
  };
}

function summarizeCombinationForAI(
  combo: GeneratedScheduleCombination,
  monthDays: CalendarDay[],
  residents: ResidentOption[],
  rules: ProgramRule[],
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"]
) {
  const primaryTotals = combo.stats.map((s) => s.monthPrimary);
  const backupTotals = combo.stats.map((s) => s.monthBackup);
  const weekendPrimaryTotals = combo.stats.map((s) => s.monthWeekendPrimary);
  const weightedBurdens = combo.stats.map(getWeightedMonthBurden);
  const adjustedBurdens = combo.stats.map(getAdjustedMonthBurden);

  const pgyGroups = new Map<
    string,
    {
      residents: number;
      primary: number;
      backup: number;
      weekendPrimary: number;
      weekendBackup: number;
      weightedBurden: number;
      adjustedBurden: number;
    }
  >();

  for (const entry of combo.stats) {
    const label = pgyLabel(entry.resident);
    const current = pgyGroups.get(label) ?? {
      residents: 0,
      primary: 0,
      backup: 0,
      weekendPrimary: 0,
      weekendBackup: 0,
      weightedBurden: 0,
      adjustedBurden: 0,
    };

    current.residents += 1;
    current.primary += entry.monthPrimary;
    current.backup += entry.monthBackup;
    current.weekendPrimary += entry.monthWeekendPrimary;
    current.weekendBackup += entry.monthWeekendBackup;
    current.weightedBurden += getWeightedMonthBurden(entry);
    current.adjustedBurden += getAdjustedMonthBurden(entry);

    pgyGroups.set(label, current);
  }

  const residentSummaries = combo.stats
    .map((entry) => ({
      name: entry.resident.displayName,
      pgy: pgyLabel(entry.resident),
      primary: entry.monthPrimary,
      backup: entry.monthBackup,
      weekendPrimary: entry.monthWeekendPrimary,
      weekendBackup: entry.monthWeekendBackup,
      weightedBurden: Number(getWeightedMonthBurden(entry).toFixed(2)),
      adjustedBurden: Number(getAdjustedMonthBurden(entry).toFixed(2)),
    }))
    .sort((a, b) => {
      if (a.pgy !== b.pgy) return a.pgy.localeCompare(b.pgy, undefined, { numeric: true });
      return b.weightedBurden - a.weightedBurden;
    });

  return {
    rank: combo.rank,
    isComplete: combo.isComplete,
    isValid: combo.isValid,
    score: Number(combo.score.toFixed(2)),
    openRequiredSlots: combo.openRequiredSlots,
    selectionReason:
      combo.hardErrorCount > 0
        ? "Ranked lower because it contains hard-rule violations."
        : combo.openRequiredSlots > 0
        ? "Ranked lower because required slots remain open."
        : "Ranked by fairness and burden-balancing score.",
    spreads: {
      primary:
        primaryTotals.length > 0 ? Math.max(...primaryTotals) - Math.min(...primaryTotals) : 0,
      backup:
        backupTotals.length > 0 ? Math.max(...backupTotals) - Math.min(...backupTotals) : 0,
      weekendPrimary:
        weekendPrimaryTotals.length > 0
          ? Math.max(...weekendPrimaryTotals) - Math.min(...weekendPrimaryTotals)
          : 0,
      weightedBurden:
        weightedBurdens.length > 0
          ? Number((Math.max(...weightedBurdens) - Math.min(...weightedBurdens)).toFixed(2))
          : 0,
      adjustedBurden:
        adjustedBurdens.length > 0
          ? Number((Math.max(...adjustedBurdens) - Math.min(...adjustedBurdens)).toFixed(2))
          : 0,
    },
    pgySummary: Array.from(pgyGroups.entries()).map(([label, group]) => ({
      pgy: label,
      residents: group.residents,
      avgPrimary: Number((group.primary / Math.max(group.residents, 1)).toFixed(2)),
      avgBackup: Number((group.backup / Math.max(group.residents, 1)).toFixed(2)),
      avgWeekendPrimary: Number(
        (group.weekendPrimary / Math.max(group.residents, 1)).toFixed(2)
      ),
      avgWeekendBackup: Number(
        (group.weekendBackup / Math.max(group.residents, 1)).toFixed(2)
      ),
      avgWeightedBurden: Number(
        (group.weightedBurden / Math.max(group.residents, 1)).toFixed(2)
      ),
      avgAdjustedBurden: Number(
        (group.adjustedBurden / Math.max(group.residents, 1)).toFixed(2)
      ),
    })),
    residentSummaries,
    interpretationHints: {
      primaryCallMattersMost: true,
      backupCallIsLightBurden: true,
      lowerPgyExpectedToCarryMore: true,
      selectedIfRankOne: combo.rank === 1,
      monthLength: monthDays.length,
    },
    ruleWarnings: {
      ...summarizeRuleWarningsForCombination({
        combo,
        monthDays,
        residents,
        rules,
        availabilityByResident,
      }),
      errors: combo.diagnostics.hardErrors,
      warnings: combo.diagnostics.warnings,
      invalidAssignments: combo.diagnostics.invalidAssignments,
      unresolvedResidentAssignments: combo.diagnostics.unresolvedResidentAssignments,
      isCompleteButInvalid: combo.diagnostics.isCompleteButInvalid,
      examples: combo.diagnostics.examples,
      invalidAssignmentsByDate: combo.diagnostics.invalidAssignmentsByDate,
    },
  };
}

export function generateCallSchedule({
  monthDays,
  residents,
  existingAssignments,
  rules,
  generationVersion = Date.now(),
  forceRegenerate = false,
  availabilityByResident,
  historicalStats,
  slotMode = "Both",
  slotDefinitions = DEFAULT_SLOT_DEFINITIONS,
}: GenerateParams) {
  // Phase 9 alignment: use canonical effective filter (disabled rules are excluded
  // from generation by default, matching validation behavior).
  const effectiveRules = getEffectiveRules(rules, { includeDisabled: false });

  const ATTEMPTS = 75;

  const seen = new Set<string>();
  const combinations: GeneratedScheduleCombination[] = [];

  // Build a resident lookup map once for use in per-day slot status evaluation.
  const residentsById = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    const attemptVersion = generationVersion + attempt * 9973;

    const generated = generateSingleCallSchedule({
      monthDays,
      residents,
      existingAssignments,
      rules: effectiveRules, // Phase 9: consistent effective rules only (typed via getEffectiveRules)
      generationVersion: attemptVersion,
      forceRegenerate,
      availabilityByResident,
      historicalStats,
      slotMode,
      slotDefinitions,
    });

    const signature = JSON.stringify(generated.assignments);

    if (seen.has(signature)) continue;
    seen.add(signature);

    const openRequiredSlots = countOpenRequiredSlots({
      monthDays,
      assignments: generated.assignments,
      rules,
      slotMode,
      slotDefinitions,
      residentsById,
    });

    const diagnostics = analyzeCombinationDiagnostics({
      combo: {
        assignments: generated.assignments,
        openRequiredSlots,
      },
      monthDays,
      residents,
      rules,
      availabilityByResident,
    });

    const score = scoreGeneratedSchedule({
      stats: generated.stats,
      assignments: generated.assignments,
      monthDays,
      rules,
      slotMode,
      diagnostics,
      slotDefinitions,
      residentsById,
    });

    combinations.push({
      rank: 0,
      generationVersion: attemptVersion,
      isComplete: openRequiredSlots === 0,
      isValid: diagnostics.hardErrors === 0,
      score,
      openRequiredSlots,
      hardErrorCount: diagnostics.hardErrors,
      warningCount: diagnostics.warnings,
      assignments: generated.assignments,
      stats: generated.stats,
      diagnostics,
    });
  }

  const rankedCombinations = combinations
    .sort((a, b) => {
      if (a.hardErrorCount !== b.hardErrorCount) {
        return a.hardErrorCount - b.hardErrorCount;
      }

      if (a.openRequiredSlots !== b.openRequiredSlots) {
        return a.openRequiredSlots - b.openRequiredSlots;
      }

      return a.score - b.score;
    })
    .map((combo, index) => ({
      ...combo,
      rank: index + 1,
    }));

  const completeCombinations = rankedCombinations.filter(
    (combo) => combo.isComplete && combo.isValid
  );

  const topCombinations = rankedCombinations.slice(0, 5);

  const best = topCombinations[0];

    return {
    assignments: best?.assignments ?? {},
    stats: best?.stats ?? [],
    generationReport: {
      attemptsRun: ATTEMPTS,
      uniqueCombinations: rankedCombinations.length,
      completeCombinationCount: completeCombinations.length,
      topCombinations,
      topCombinationSummaries: topCombinations.map((combo) =>
        summarizeCombinationForAI(
          combo,
          monthDays,
          residents,
          rules,
          availabilityByResident
        )
      ),
      selectedCombinationSummary: best
        ? summarizeCombinationForAI(
            best,
            monthDays,
            residents,
            rules,
            availabilityByResident
          )
        : null,
      scoringNotes: {
        primaryWeight: PRIMARY_WEIGHT,
        backupWeight: BACKUP_WEIGHT,
        weekendPrimaryWeight: WEEKEND_PRIMARY_WEIGHT,
        weekendBackupWeight: WEEKEND_BACKUP_WEIGHT,
        pgyAdjustment:
          "Lower PGY residents are allowed higher expected burden before fairness penalties increase. Backup call is weighted substantially less than primary call.",
      },
      selectionSummary: {
        selectedRank: best?.rank ?? null,
        selectedIsValid: best?.isValid ?? null,
        selectedHardErrorCount: best?.hardErrorCount ?? null,
        selectedWarningCount: best?.warningCount ?? null,
        selectedOpenRequiredSlots: best?.openRequiredSlots ?? null,
      },
    },
  };
}
