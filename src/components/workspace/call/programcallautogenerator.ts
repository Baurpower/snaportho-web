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
  makeEngineHelpers,
  type EngineHelpers,
} from "@/lib/workspace/call/policy/policy-runtime";

/**
 * CALL_POLICY_V2: the active policy engine for the in-flight generation attempt.
 * generateSingleCallSchedule runs fully synchronously (no await), and the public
 * generateCallSchedule invokes it in a synchronous loop, so a module-scoped handle
 * set at the start of each attempt (and cleared before returning) is safe and avoids
 * threading `engine` through every candidate-selection helper. Null = legacy path.
 */
let activeGeneratorEngine: EngineHelpers | null = null;

/** Engine-backed hard eligibility for a candidate, or the legacy evaluator when off. */
function generatorEligible(
  resident: ResidentOption,
  slot: Slot,
  dateKey: string,
  assignments: Record<string, DraftDayAssignment>,
  rules: ProgramRule[],
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"]
): boolean {
  if (activeGeneratorEngine) {
    return activeGeneratorEngine.isSelectable(resident, slot, dateKey);
  }
  return isResidentAllowedForSlot({
    resident,
    slot,
    dateKey,
    assignments,
    rules,
    availabilityByResident,
  });
}
import {
  DEFAULT_SLOT_DEFINITIONS,
  getEffectiveRules,
  getSlotStatusForDay,
  type ProgramCallSlotDefinition,
} from "@/lib/workspace/call/rule-definitions"; // Phase 9 alignment
import {
  getBuddyDateStatesForMonth,
  getBuddyRequirementsForMonth,
  resolveBuddyPolicy,
  type BuddyDateState,
} from "@/lib/workspace/call/buddy-requirements";
import {
  countUniqueWeekendBuckets,
  evaluateDayOfWeekPreferenceForResident,
  evaluateMonthlyLimitForResident,
  evaluateMonthlyLoadTargetForResident,
  evaluatePgyEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  evaluateWeekendPairingForResident,
  getAdjacentWeekendDateKey,
  getDateDiffInDays,
  getRequiredCallTypesFromRules,
  getResidentPgyYear,
  getRuleSeverity,
  isRuleEnabled,
  resolveMatchingRules,
} from "@/lib/workspace/call/rule-evaluator";

// Rule codes that configure minimum spacing between a resident's calls. When any
// of these is active, spacing is scored by the config-respecting penalty in
// getRulePenalty; the generic gap heuristic in scoreResident is suppressed to
// avoid double-counting (see #3).
const SPACING_RULE_CODES = [
  "min_days_between_assignments",
  "minimum_spacing",
  "avoid_consecutive_call",
];

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
  /**
   * Phase 3: when true, run the local-search optimizer on the best complete +
   * valid greedy result to further balance fairness. Opt-in / default off so
   * existing behavior is unchanged until enabled behind a flag.
   */
  enableLocalSearch?: boolean;
  /** Iteration budget for the local-search optimizer (Phase 3). */
  localSearchMaxIterations?: number;
  /**
   * CALL_POLICY_V2: when true, enforce the policy engine's buddy hard cap
   * (globals.buddy.maxWeekendsPerInternMonth) — no intern may exceed that many
   * buddy weekends per month. Fixes #3 (buddy on every weekend). Off by default so
   * the legacy path is byte-unchanged.
   */
  useCallPolicyV2?: boolean;
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

  // PGY burden multiplier resolved once for the scheduled month (see #1).
  expectedBurdenMultiplier: number;
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
  generationDebug: GenerationDebug;
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

type GenerationDaySlotDebug = {
  considered: boolean;
  attempted: boolean;
  successful: boolean;
  reason: string | null;
  eligibleResidentIds: string[];
  blockedResidents: Array<{
    residentId: string;
    residentName: string;
    reasons: string[];
  }>;
};

type GenerationDebug = {
  candidateSlotsConsideredByType: Record<string, number>;
  candidateAssignmentsAttemptedByType: Record<string, number>;
  successfulAssignmentsByType: Record<string, number>;
  rejectedAssignmentsByType: Record<string, number>;
  rejectionReasonsByType: Record<string, Record<string, number>>;
  daySlotOutcomes: Record<string, Partial<Record<Slot, GenerationDaySlotDebug>>>;
  phaseTimings: Array<{
    phase: string;
    durationMs: number;
    details?: string;
  }>;
  buddyPass: {
    residentsDetected: Array<{
      residentId: string;
      residentName: string;
      requiredBuddyDays: number;
      maxBuddyDays: number;
      assignedBuddyDays: number;
      remainingNeeded: number;
      remainingCapacity: number;
    }>;
    visibleBuddySlotCount: number;
    attemptedAssignments: number;
    skippedAssignments: Array<{
      residentId: string;
      residentName: string;
      phase: "required" | "optional";
      dateKey: string | null;
      reason: string;
    }>;
    finalBuddyCounts: Array<{
      residentId: string;
      residentName: string;
      assignedBuddyDays: number;
      requiredBuddyDays: number;
      maxBuddyDays: number;
    }>;
    loopExitReasons: Array<{
      phase: "required" | "optional";
      iterations: number;
      reason: string;
    }>;
  };
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

function createGenerationDebug(): GenerationDebug {
  return {
    candidateSlotsConsideredByType: {},
    candidateAssignmentsAttemptedByType: {},
    successfulAssignmentsByType: {},
    rejectedAssignmentsByType: {},
    rejectionReasonsByType: {},
    daySlotOutcomes: {},
    phaseTimings: [],
    buddyPass: {
      residentsDetected: [],
      visibleBuddySlotCount: 0,
      attemptedAssignments: 0,
      skippedAssignments: [],
      finalBuddyCounts: [],
      loopExitReasons: [],
    },
  };
}

function incrementDebugCounter(
  record: Record<string, number>,
  key: string,
  amount = 1
) {
  record[key] = (record[key] ?? 0) + amount;
}

function incrementDebugReason(
  record: Record<string, Record<string, number>>,
  slot: Slot,
  reason: string
) {
  const next = record[slot] ?? {};
  next[reason] = (next[reason] ?? 0) + 1;
  record[slot] = next;
}

function recordDaySlotDebug(
  debug: GenerationDebug,
  dateKey: string,
  slot: Slot,
  details: Partial<GenerationDaySlotDebug>
) {
  const currentDay = debug.daySlotOutcomes[dateKey] ?? {};
  const currentSlot = currentDay[slot] ?? {
    considered: false,
    attempted: false,
    successful: false,
    reason: null,
    eligibleResidentIds: [],
    blockedResidents: [],
  };

  currentDay[slot] = {
    ...currentSlot,
    ...details,
  };
  debug.daySlotOutcomes[dateKey] = currentDay;
}

function recordPhaseTiming(
  debug: GenerationDebug,
  phase: string,
  startedAt: number,
  details?: string
) {
  debug.phaseTimings.push({
    phase,
    durationMs: Date.now() - startedAt,
    details,
  });
}

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


const PRIMARY_WEIGHT = 1;
const BACKUP_WEIGHT = 0.25;
const WEEKEND_PRIMARY_WEIGHT = 1;
const WEEKEND_BACKUP_WEIGHT = 0.3;
const MAX_BUDDY_PHASE_ITERATIONS = 250;

function getResidentYearValue(
  resident: ResidentOption,
  effectiveDate?: string | null
) {
  return getResidentPgyYear(resident, effectiveDate) ?? 99;
}

function getExpectedPgyBurdenMultiplier(
  resident: ResidentOption,
  effectiveDate?: string | null
) {
  // Resolve PGY as of the scheduled month, not "now". Without the effective date
  // this mis-weights fairness across the academic-year boundary (e.g. July).
  const pgy = getResidentYearValue(resident, effectiveDate);

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
  return getWeightedMonthBurden(entry) / entry.expectedBurdenMultiplier;
}

function getAdjustedWeekendBurden(entry: ResidentAutoStats) {
  return getWeightedWeekendBurden(entry) / entry.expectedBurdenMultiplier;
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
  historicalStats: ExistingResidentStats[],
  effectiveDate?: string | null
) {
  const stats = new Map<string, ResidentAutoStats>();

  for (const resident of residents) {
    const baseline = historicalStats.find(
      (item) => item.residentId === resident.residentId
    );

    stats.set(resident.residentId, {
  resident,
  expectedBurdenMultiplier: getExpectedPgyBurdenMultiplier(resident, effectiveDate),
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

function removeDateOnce(dates: string[], dateKey: string) {
  const index = dates.indexOf(dateKey);
  if (index >= 0) dates.splice(index, 1);
}

/**
 * Exact inverse of updateStats — reverts a single (resident, slot, day)
 * assignment. Used by the local-search optimizer to apply/undo neighborhood
 * moves in O(1) so it never has to rebuild stats from scratch (Phase 3).
 */
function undoStats(
  stats: Map<string, ResidentAutoStats>,
  residentId: string,
  slot: Slot,
  day: CalendarDay,
  countsTowardWorkload = true
) {
  const entry = stats.get(residentId);
  if (!entry) return;

  if (slot === "Primary") {
    entry.monthPrimary -= 1;
    entry.yearPrimary -= 1;
    removeDateOnce(entry.primaryDates, day.key);
  } else if (slot === "Backup") {
    entry.monthBackup -= 1;
    entry.yearBackup -= 1;
    removeDateOnce(entry.backupDates, day.key);
  } else {
    entry.monthBuddy -= 1;
    entry.yearBuddy -= 1;
    removeDateOnce(entry.buddyDates, day.key);
  }

  if (countsTowardWorkload) {
    entry.monthTotal -= 1;
    entry.yearTotal -= 1;
    removeDateOnce(entry.assignedDates, day.key);
  }

  if (countsTowardWorkload && day.isWeekend) {
    entry.monthWeekend -= 1;
    entry.yearWeekend -= 1;

    if (slot === "Primary") {
      entry.monthWeekendPrimary -= 1;
      entry.yearWeekendPrimary -= 1;
    } else if (slot === "Backup") {
      entry.monthWeekendBackup -= 1;
      entry.yearWeekendBackup -= 1;
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

  const residentPgy = getResidentYearValue(resident, day.key);
  const residentPgyForFilter = residentPgy < 99 ? residentPgy : null;

  // Rotation eligibility is enforced during candidate filtering
  // (isResidentAllowedForSlot → canonical availability source), so it is no
  // longer double-counted as a scoring penalty here.

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

  // Monthly load target by PGY — per-PGY hard/soft max.
  if (slot === "Primary" || slot === "Backup") {
    const currentSlotCount =
      slot === "Primary" ? entry.monthPrimary : entry.monthBackup;
    const projectedSlotCount = currentSlotCount + 1;

    for (const violation of evaluateMonthlyLoadTargetForResident({
      residentPgyYear: residentPgyForFilter,
      callType: slot,
      projectedCount: projectedSlotCount,
      rules,
    })) {
      const hardMultiplier = violation.severity === "error" ? 10 : 1;
      penalty += 50000 * hardMultiplier;
    }
  }

  // Day-of-week preference — soft penalty for scheduling on disfavored weekdays.
  for (const violation of evaluateDayOfWeekPreferenceForResident({
    dateKey: day.key,
    callType: slot,
    rotationIds: [getResidentRotationId(resident, day.key)],
    residentPgyYear: residentPgyForFilter,
    rules,
  })) {
    // Always soft — add a modest penalty so the generator avoids these days when possible.
    penalty += 80 * softSlotWeight * (violation.severity === "error" ? 10 : 1);
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

  // When an explicit spacing rule is configured, spacing is scored by the
  // config-respecting penalty inside getRulePenalty. Suppress this generic
  // gap heuristic in that case so spacing isn't weighted twice (#3); the
  // same-day (gap 0) guard always applies.
  const spacingRuleActive =
    resolveMatchingRules(rules, SPACING_RULE_CODES).length > 0;

  for (const assignedDate of entry.assignedDates) {
    const gap = daysBetween(day.key, assignedDate);

    if (gap === 0) {
      score += 99999;
      continue;
    }

    if (spacingRuleActive) continue;

    if (gap === 1) score += 90 * spacingMultiplier;
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

function getBuddyDateStateMap(
  monthDays: CalendarDay[],
  residents: ResidentOption[],
  rules: ProgramRule[],
  slotDefinitions: ProgramCallSlotDefinition[],
  assignments: Record<string, DraftDayAssignment>
) {
  const firstDay = monthDays[0];
  if (!firstDay) return new Map<string, BuddyDateState>();

  const states = getBuddyDateStatesForMonth({
    year: firstDay.date.getFullYear(),
    month: firstDay.date.getMonth() + 1,
    residents,
    rotations: residents.flatMap((resident) =>
      (resident.rotationAssignments ?? []).map((assignment) => ({
        residentId: resident.residentId,
        rosterId: resident.residentId,
        ...assignment,
      }))
    ),
    rules,
    slotDefinitions,
    assignments,
  });

  return new Map(states.map((state) => [state.dateKey, state]));
}

function selectBuddyPrimaryPartner({
  residents,
  day,
  current,
  assignments,
  rules,
  availabilityByResident,
  stats,
  generationVersion,
  partnerPgyYear,
}: {
  residents: ResidentOption[];
  day: CalendarDay;
  current: DraftDayAssignment;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  stats: Map<string, ResidentAutoStats>;
  generationVersion: number;
  partnerPgyYear: number;
}) {
  const partnerResidents = residents.filter(
    (resident) =>
      getResidentPgyYear(resident, day.key) === partnerPgyYear &&
      resident.residentId !== current.buddyRosterId
  );

  if (partnerResidents.length === 0) return null;

  return pickBestResident({
    residents: partnerResidents,
    slot: "Primary",
    day,
    assignments,
    rules,
    availabilityByResident,
    stats,
    generationVersion,
  });
}

function getSecondarySlotContext({
  day,
  current,
  residentsById,
  slotDefinitions,
  buddyDateState,
}: {
  day: CalendarDay;
  current: DraftDayAssignment;
  residentsById: Map<string, ResidentOption>;
  slotDefinitions: ProgramCallSlotDefinition[];
  buddyDateState?: BuddyDateState | null;
}) {
  const primaryResident = current.primaryRosterId
    ? residentsById.get(current.primaryRosterId)
    : null;
  const primaryPgyYear = primaryResident
    ? getResidentPgyYear(primaryResident, day.key)
    : null;
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
      buddyDateState,
    });
    return isVisible;
  });

  const backupDef = visibleBackupDefs[0] ?? null;
  const buddyDef = visibleBuddyDefs[0] ?? null;
  const buddyActive = Boolean(
    buddyDateState?.isVisible || current.buddyRosterId
  );

  return {
    backupDef: buddyActive ? null : backupDef,
    buddyDef,
    buddyCountsTowardWorkload: buddyDef?.countsTowardWorkload ?? false,
  };
}

function inspectCandidatePool({
  residents,
  slot,
  day,
  current,
  assignments,
  rules,
  availabilityByResident,
}: {
  residents: ResidentOption[];
  slot: Slot;
  day: CalendarDay;
  current: DraftDayAssignment;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
}) {
  const eligible: ResidentOption[] = [];
  const blocked: Array<{
    residentId: string;
    residentName: string;
    reasons: string[];
  }> = [];

  for (const resident of residents) {
    const reasons: string[] = [];

    if (
      slot === "Backup" &&
      (resident.residentId === current.primaryRosterId ||
        assignments[day.key]?.primaryRosterId === resident.residentId)
    ) {
      reasons.push("Already assigned to Primary on this day.");
    }

    if (
      slot === "Buddy" &&
      (resident.residentId === current.primaryRosterId ||
        resident.residentId === current.backupRosterId ||
        resident.residentId === current.buddyRosterId ||
        assignments[day.key]?.primaryRosterId === resident.residentId ||
        assignments[day.key]?.backupRosterId === resident.residentId)
    ) {
      reasons.push("Already assigned to another slot on this day.");
    }

    if (
      slot === "Primary" &&
      (assignments[day.key]?.backupRosterId === resident.residentId ||
        assignments[day.key]?.buddyRosterId === resident.residentId)
    ) {
      reasons.push("Already assigned to another slot on this day.");
    }

    // Rotation blocking is reported by evaluateResidentForSlot below (canonical
    // availability source). Under CALL_POLICY_V2, eligibility (incl. temporal /
    // grey-zone tiers + Buddy roster gate) comes from the policy engine instead.
    if (activeGeneratorEngine) {
      const ev = activeGeneratorEngine.evaluate(resident, slot, day.key);
      for (const block of ev.blocks) reasons.push(block.message);
      if (!activeGeneratorEngine.isSelectable(resident, slot, day.key) && ev.blocks.length === 0) {
        reasons.push(`Not eligible for ${slot} on this date.`);
      }
    } else {
      const evaluation = evaluateResidentForSlot({
        resident,
        slot,
        dateKey: day.key,
        assignments,
        rules,
        availabilityByResident,
      });
      for (const block of evaluation.blocks) {
        reasons.push(block.message);
      }
    }

    if (reasons.length > 0) {
      blocked.push({
        residentId: resident.residentId,
        residentName: resident.displayName,
        reasons: Array.from(new Set(reasons)),
      });
      continue;
    }

    eligible.push(resident);
  }

  return { eligible, blocked };
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
  const eligible = residents.filter((resident) =>
    // Rotation eligibility is enforced inside isResidentAllowedForSlot →
    // evaluateResidentForSlot, which reads the canonical availability rotation
    // data. Under CALL_POLICY_V2 this routes through the policy engine instead
    // (tiers + temporal/grey-zone eligibility).
    generatorEligible(resident, slot, day.key, assignments, rules, availabilityByResident)
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

type OpenRequiredSlot = { dateKey: string; slot: Slot };

/**
 * Lists every required-and-open (date, slot) cell for a schedule. This is the
 * single source of truth for "what still needs filling"; countOpenRequiredSlots
 * is just its length, and Phase-A repair consumes the list directly.
 */
function listOpenRequiredSlots({
  monthDays,
  residents,
  assignments,
  rules,
  slotMode,
  slotDefinitions = DEFAULT_SLOT_DEFINITIONS,
  residentsById,
}: {
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  slotMode: QuickAssignSlotMode;
  slotDefinitions?: ProgramCallSlotDefinition[];
  residentsById?: Map<string, ResidentOption>;
}): OpenRequiredSlot[] {
  const open: OpenRequiredSlot[] = [];

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
  const buddyDefs = slotDefinitions.filter((def) => def.callType === "Buddy");
  const buddyDateStateByDate = getBuddyDateStateMap(
    monthDays,
    residents,
    rules,
    slotDefinitions,
    assignments
  );

  for (const day of monthDays) {
    const assignment = assignments[day.key];
    const buddyDateState = buddyDateStateByDate.get(day.key) ?? null;

    if (shouldCheckPrimary && !assignment?.primaryRosterId) {
      open.push({ dateKey: day.key, slot: "Primary" });
    }

    if (!assignment?.backupRosterId) {
      if (hasCustomBackupDefs) {
        // Per-day conditional check: only count as open if this slot is visible AND required.
        const primaryResident =
          assignment?.primaryRosterId && residentsById
            ? residentsById.get(assignment.primaryRosterId) ?? null
            : null;
        const primaryPgyYear =
          primaryResident ? getResidentPgyYear(primaryResident, day.key) : null;
        const dayOfWeek = day.date.getDay();
        const hasRequiredOpenBackup = customBackupDefs.some((def) => {
          if (buddyDateState?.isVisible || assignment?.buddyRosterId) {
            return false;
          }
          const { isRequired } = getSlotStatusForDay({
            def,
            dayOfWeek,
            primaryPgyYear,
            hasAssignment: false,
          });
          return isRequired;
        });
        if (hasRequiredOpenBackup) open.push({ dateKey: day.key, slot: "Backup" });
      } else if (globalBackupRequired && !buddyDateState?.isVisible && !assignment?.buddyRosterId) {
        open.push({ dateKey: day.key, slot: "Backup" });
      }
    }

    if (!assignment?.buddyRosterId && buddyDefs.length > 0) {
      const primaryResident =
        assignment?.primaryRosterId && residentsById
          ? residentsById.get(assignment.primaryRosterId) ?? null
          : null;
      const primaryPgyYear =
        primaryResident ? getResidentPgyYear(primaryResident, day.key) : null;
      const hasRequiredOpenBuddy = buddyDefs.some((def) => {
        const { isRequired } = getSlotStatusForDay({
          def,
          dayOfWeek: day.date.getDay(),
          primaryPgyYear,
          hasAssignment: false,
          buddyDateState,
        });
        return isRequired;
      });
      if (hasRequiredOpenBuddy) open.push({ dateKey: day.key, slot: "Buddy" });
    }
  }

  return open;
}

function countOpenRequiredSlots(params: {
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  slotMode: QuickAssignSlotMode;
  slotDefinitions?: ProgramCallSlotDefinition[];
  residentsById?: Map<string, ResidentOption>;
}) {
  return listOpenRequiredSlots(params).length;
}

/**
 * Soft (fairness) portion of the schedule objective — the terms that depend only
 * on per-resident stats, not on hard-rule diagnostics. Extracted so the
 * local-search optimizer minimizes the exact same fairness objective that
 * scoreGeneratedSchedule uses to rank greedy attempts.
 */
function softStatsScore(stats: ResidentAutoStats[]) {
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
    adjustedBurdenSpread * 800 +
    adjustedWeekendSpread * 1000 +
    primarySpread * 650 +
    backupSpread * 120 +
    totalWeightedBurden * 5 +
    totalWeightedWeekendBurden * 12
  );
}

function scoreGeneratedSchedule({
  stats,
  assignments,
  monthDays,
  residents,
  rules,
  slotMode,
  diagnostics,
  slotDefinitions,
  residentsById,
}: {
  stats: ResidentAutoStats[];
  assignments: Record<string, DraftDayAssignment>;
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  rules: ProgramRule[];
  slotMode: QuickAssignSlotMode;
  diagnostics: CombinationDiagnostics;
  slotDefinitions?: ProgramCallSlotDefinition[];
  residentsById?: Map<string, ResidentOption>;
}) {
  const openRequiredSlots = countOpenRequiredSlots({
    monthDays,
    residents,
    assignments,
    rules,
    slotMode,
    slotDefinitions,
    residentsById,
  });

  return (
    diagnostics.hardErrors * 1000000 +
    diagnostics.invalidAssignments * 250000 +
    openRequiredSlots * 100000 +
    diagnostics.warnings * 300 +
    softStatsScore(stats)
  );
}

/**
 * CALL_POLICY_V2 (#3): given the final assignments, return the excess buddy
 * (dateKey, rosterId) pairs that exceed `cap` buddy days for any one intern —
 * keeping each intern's earliest `cap` buddy weekends. Pure + exported for testing.
 */
export function computeBuddyCapTrim(
  assignments: Record<string, DraftDayAssignment>,
  cap: number
): Array<{ dateKey: string; rosterId: string }> {
  const datesByResident = new Map<string, string[]>();
  for (const [dateKey, assignment] of Object.entries(assignments)) {
    const rosterId = assignment?.buddyRosterId;
    if (!rosterId) continue;
    const dates = datesByResident.get(rosterId) ?? [];
    dates.push(dateKey);
    datesByResident.set(rosterId, dates);
  }

  const trim: Array<{ dateKey: string; rosterId: string }> = [];
  for (const [rosterId, dates] of datesByResident) {
    if (dates.length <= cap) continue;
    for (const dateKey of [...dates].sort().slice(Math.max(0, cap))) {
      trim.push({ dateKey, rosterId });
    }
  }
  return trim;
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
  useCallPolicyV2 = false,
}: GenerateParams) {
  const enabledRules = rules.filter(isRuleEnabled);
  const buddyPolicy = resolveBuddyPolicy(enabledRules);
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

  // CALL_POLICY_V2: activate the policy engine for this attempt. Built with
  // nextAssignments as a LIVE ref so presence/pairing/slot-occupant reads reflect
  // assignments as the generator mutates them. Cleared before every return below.
  activeGeneratorEngine = useCallPolicyV2
    ? makeEngineHelpers({
        rules: enabledRules,
        slotDefinitions: effectiveSlotDefinitions,
        residents,
        availability: availabilityByResident,
        assignments: nextAssignments,
      })
    : null;

  const stats = buildInitialStats(
    residents,
    historicalStats,
    monthDays[0]?.key ?? null
  );
  const generationDebug = createGenerationDebug();

  if (!forceRegenerate) {
    applyExistingAssignmentsToStats(
      stats,
      monthDays,
      nextAssignments,
      effectiveSlotDefinitions
    );
  }

  const monthDayByKey = new Map(monthDays.map((day) => [day.key, day]));
  const buddyRequirementsStartedAt = Date.now();
  const buddyRequirements = getBuddyRequirementsForMonth({
    year: monthDays[0]?.date.getFullYear() ?? new Date().getFullYear(),
    month: (monthDays[0]?.date.getMonth() ?? new Date().getMonth()) + 1,
    residents,
    rotations: residents.flatMap((resident) =>
      (resident.rotationAssignments ?? []).map((assignment) => ({
        residentId: resident.residentId,
        rosterId: resident.residentId,
        ...assignment,
      }))
    ),
    rules: enabledRules,
    slotDefinitions: effectiveSlotDefinitions,
    assignments: nextAssignments,
  });
  recordPhaseTiming(
    generationDebug,
    "buddy_requirements",
    buddyRequirementsStartedAt,
    `${buddyRequirements.length} requirement(s)`
  );
  generationDebug.buddyPass.residentsDetected = buddyRequirements.map(
    (requirement) => ({
      residentId: requirement.pgy1RosterId,
      residentName: requirement.residentName,
      requiredBuddyDays: requirement.requiredBuddyDays,
      maxBuddyDays: requirement.maxBuddyDays,
      assignedBuddyDays: requirement.assignedDates.length,
      remainingNeeded: requirement.remainingNeeded,
      remainingCapacity: requirement.remainingCapacity,
    })
  );
  generationDebug.buddyPass.visibleBuddySlotCount = new Set(
    buddyRequirements.flatMap((requirement) => requirement.eligibleDates)
  ).size;

  const buddyCountsTowardWorkload =
    effectiveSlotDefinitions.find((definition) => definition.callType === "Buddy")
      ?.countsTowardWorkload ?? false;
  let buddyDateStateCache: Map<string, BuddyDateState> | null = null;

  function getLiveBuddyDateStateMap() {
    if (buddyDateStateCache) return buddyDateStateCache;

    buddyDateStateCache = getBuddyDateStateMap(
      monthDays,
      residents,
      enabledRules,
      effectiveSlotDefinitions,
      nextAssignments
    );

    return buddyDateStateCache;
  }

  function invalidateBuddyDateStateMap() {
    buddyDateStateCache = null;
  }

  function getAssignedBuddyCount(residentId: string, eligibleDates: string[]) {
    const eligibleDateSet = new Set(eligibleDates);
    return Object.entries(nextAssignments).filter(
      ([dateKey, assignment]) =>
        eligibleDateSet.has(dateKey) && assignment.buddyRosterId === residentId
    ).length;
  }

  function assignBuddyForRequirement(
    requirement: (typeof buddyRequirements)[number],
    phase: "required" | "optional"
  ) {
    const buddyResident = residentsById.get(requirement.pgy1RosterId);
    if (!buddyResident) {
      generationDebug.buddyPass.skippedAssignments.push({
        residentId: requirement.pgy1RosterId,
        residentName: requirement.residentName,
        phase,
        dateKey: null,
        reason: "Resident was not loaded into the generator pool.",
      });
      return false;
    }

    const targetCount =
      phase === "required"
        ? requirement.requiredBuddyDays
        : requirement.maxBuddyDays;
    const currentAssigned = getAssignedBuddyCount(
      requirement.pgy1RosterId,
      requirement.eligibleDates
    );

    if (currentAssigned >= targetCount) {
      return false;
    }

    incrementDebugCounter(
      generationDebug.candidateSlotsConsideredByType,
      "Buddy"
    );
    incrementDebugCounter(
      generationDebug.candidateAssignmentsAttemptedByType,
      "Buddy"
    );
    generationDebug.buddyPass.attemptedAssignments += 1;

    const skippedReasons: Array<{ dateKey: string; reason: string }> = [];
    const candidateDates = requirement.eligibleDates
      .map((dateKey) => {
        const day = monthDayByKey.get(dateKey);
        if (!day) {
          skippedReasons.push({ dateKey, reason: "Missing month day." });
          return null;
        }

        const current = nextAssignments[dateKey] ?? {
          primaryRosterId: null,
          backupRosterId: null,
          buddyRosterId: null,
        };

        if (current.buddyRosterId === buddyResident.residentId) {
          skippedReasons.push({
            dateKey,
            reason: "Buddy slot already assigned to this resident.",
          });
          return null;
        }

        if (current.buddyRosterId && current.buddyRosterId !== buddyResident.residentId) {
          skippedReasons.push({
            dateKey,
            reason: "Buddy slot already assigned.",
          });
          return null;
        }

        // CALL_POLICY_V2: buddy eligibility (incl. the "first Gen-Ortho month only"
        // temporal tier) comes from the engine, so a 2nd-month intern is skipped here
        // even though the legacy buddy roster still lists them.
        const buddyEvaluation = activeGeneratorEngine
          ? {
              allowed: activeGeneratorEngine.isSelectable(buddyResident, "Buddy", dateKey),
              blocks: activeGeneratorEngine.evaluate(buddyResident, "Buddy", dateKey).blocks,
            }
          : evaluateResidentForSlot({
              resident: buddyResident,
              slot: "Buddy",
              dateKey,
              assignments: nextAssignments,
              rules: enabledRules,
              availabilityByResident,
            });
        if (!buddyEvaluation.allowed) {
          skippedReasons.push({
            dateKey,
            reason:
              buddyEvaluation.blocks.map((block) => block.message).join("; ") ||
              "Blocked by Buddy eligibility rules.",
          });
          return null;
        }

        const existingPrimary =
          current.primaryRosterId ? residentsById.get(current.primaryRosterId) ?? null : null;
        const existingPrimaryPgy = existingPrimary
          ? getResidentPgyYear(existingPrimary, dateKey)
          : null;

        // #2: apply the same partner-PGY guard in both incremental and
        // force-regenerate modes. Previously force-regenerate bypassed this,
        // which could pair a buddy with a non-partner Primary. A manually-set
        // Primary that is not the partner PGY always blocks buddy placement here.
        if (
          existingPrimary &&
          existingPrimaryPgy !== buddyPolicy.partnerPgyYear
        ) {
          skippedReasons.push({
            dateKey,
            reason: `Existing Primary is PGY-${existingPrimaryPgy ?? "unknown"}, not PGY-${buddyPolicy.partnerPgyYear}.`,
          });
          return null;
        }

        const partner =
          existingPrimaryPgy === buddyPolicy.partnerPgyYear
            ? existingPrimary
            : selectBuddyPrimaryPartner({
                residents,
                day,
                current: {
                  ...current,
                  buddyRosterId: buddyResident.residentId,
                },
                assignments: {
                  ...nextAssignments,
                  [dateKey]: {
                    ...current,
                    buddyRosterId: buddyResident.residentId,
                  },
                },
                rules: enabledRules,
                availabilityByResident,
                stats,
                generationVersion,
                partnerPgyYear: buddyPolicy.partnerPgyYear,
              });

        if (!partner) {
          skippedReasons.push({
            dateKey,
            reason: `No eligible PGY-${buddyPolicy.partnerPgyYear} Primary partner available.`,
          });
          return null;
        }

        const partnerStats = stats.get(partner.residentId);
        const randomizedRank = seededNoise({
          residentId: buddyResident.residentId,
          dateKey,
          slot: "Buddy",
          generationVersion,
        });

        return {
          day,
          current,
          partner,
          score:
            randomizedRank * 1000 +
            (partnerStats?.monthPrimary ?? 0) * 25 +
            (current.primaryRosterId ? 0 : 10) +
            (current.backupRosterId ? 20 : 0),
        };
      })
      .filter(
        (
          entry
        ): entry is {
          day: CalendarDay;
          current: DraftDayAssignment;
          partner: ResidentOption;
          score: number;
        } => Boolean(entry)
      )
      .sort((left, right) => {
        if (left.score !== right.score) return left.score - right.score;
        return left.day.key.localeCompare(right.day.key);
      });

    const selected = candidateDates[0];
    if (!selected) {
      const reason =
        skippedReasons[0]?.reason ??
        `No eligible Buddy dates remain for ${requirement.residentName}.`;
      incrementDebugCounter(
        generationDebug.rejectedAssignmentsByType,
        "Buddy"
      );
      incrementDebugReason(
        generationDebug.rejectionReasonsByType,
        "Buddy",
        reason
      );
      if (skippedReasons.length > 0) {
        for (const skipped of skippedReasons) {
          generationDebug.buddyPass.skippedAssignments.push({
            residentId: requirement.pgy1RosterId,
            residentName: requirement.residentName,
            phase,
            dateKey: skipped.dateKey,
            reason: skipped.reason,
          });
        }
      } else {
        generationDebug.buddyPass.skippedAssignments.push({
          residentId: requirement.pgy1RosterId,
          residentName: requirement.residentName,
          phase,
          dateKey: null,
          reason,
        });
      }
      return false;
    }

    const { day, current, partner } = selected;
    const nextCurrent = {
      ...current,
      primaryRosterId: current.primaryRosterId ?? partner.residentId,
      backupRosterId: null,
      buddyRosterId: buddyResident.residentId,
    };

    if (!current.primaryRosterId) {
      updateStats(stats, partner.residentId, "Primary", day);
    }
    if (!current.buddyRosterId) {
      updateStats(
        stats,
        buddyResident.residentId,
        "Buddy",
        day,
        buddyCountsTowardWorkload
      );
    }

    nextAssignments[day.key] = nextCurrent;
    invalidateBuddyDateStateMap();
    incrementDebugCounter(
      generationDebug.successfulAssignmentsByType,
      "Buddy"
    );
    recordDaySlotDebug(generationDebug, day.key, "Buddy", {
      considered: true,
      attempted: true,
      successful: true,
      reason: `Selected ${phase} Buddy date for ${buddyResident.displayName} with PGY-4 partner ${partner.displayName}`,
      eligibleResidentIds: [buddyResident.residentId],
    });
    return true;
  }

  function assignBuddyToExistingPrimaryDay(day: CalendarDay) {
    const current = nextAssignments[day.key] ?? {
      primaryRosterId: null,
      backupRosterId: null,
      buddyRosterId: null,
    };
    if (!current.primaryRosterId || current.buddyRosterId) {
      return false;
    }

    const primaryResident = residentsById.get(current.primaryRosterId) ?? null;
    const primaryPgy = primaryResident
      ? getResidentPgyYear(primaryResident, day.key)
      : null;
    if (primaryPgy !== buddyPolicy.partnerPgyYear) {
      return false;
    }

    const liveBuddyState = getLiveBuddyDateStateMap().get(day.key) ?? null;

    if (!liveBuddyState?.isVisible) {
      return false;
    }

    const candidateRosterIds =
      liveBuddyState.eligibleRequirementRosterIds.length > 0
        ? liveBuddyState.eligibleRequirementRosterIds
        : liveBuddyState.visibleEligibleRosterIds;

    if (candidateRosterIds.length === 0) {
      recordDaySlotDebug(generationDebug, day.key, "Buddy", {
        considered: true,
        attempted: true,
        successful: false,
        reason: "Buddy visible but no PGY-1 candidate still has Buddy capacity.",
      });
      return false;
    }

    const candidateResidents = candidateRosterIds
      .map((residentId) => residentsById.get(residentId) ?? null)
      .filter((resident): resident is ResidentOption => Boolean(resident));

    if (candidateResidents.length === 0) {
      recordDaySlotDebug(generationDebug, day.key, "Buddy", {
        considered: true,
        attempted: true,
        successful: false,
        reason: "Buddy visible but candidate resident records were not loaded.",
      });
      return false;
    }

    const buddyPool = inspectCandidatePool({
      residents: candidateResidents,
      slot: "Buddy",
      day,
      current,
      assignments: nextAssignments,
      rules: enabledRules,
      availabilityByResident,
    });
    incrementDebugCounter(
      generationDebug.candidateSlotsConsideredByType,
      "Buddy"
    );
    incrementDebugCounter(
      generationDebug.candidateAssignmentsAttemptedByType,
      "Buddy"
    );
    generationDebug.buddyPass.attemptedAssignments += 1;
    recordDaySlotDebug(generationDebug, day.key, "Buddy", {
      considered: true,
      attempted: true,
      eligibleResidentIds: buddyPool.eligible.map((resident) => resident.residentId),
      blockedResidents: buddyPool.blocked,
    });

    const picked = pickBestResident({
      residents: candidateResidents,
      slot: "Buddy",
      day,
      assignments: nextAssignments,
      rules: enabledRules,
      availabilityByResident,
      stats,
      generationVersion,
    });

    if (!picked) {
      incrementDebugCounter(
        generationDebug.rejectedAssignmentsByType,
        "Buddy"
      );
      const reason =
        buddyPool.blocked[0]?.reasons[0] ??
        "Buddy visible after Primary assignment, but no candidate could be scheduled.";
      incrementDebugReason(
        generationDebug.rejectionReasonsByType,
        "Buddy",
        reason
      );
      recordDaySlotDebug(generationDebug, day.key, "Buddy", {
        successful: false,
        reason,
      });
      return false;
    }

    current.buddyRosterId = picked.residentId;
    current.backupRosterId = null;
    nextAssignments[day.key] = current;
    invalidateBuddyDateStateMap();
    updateStats(
      stats,
      picked.residentId,
      "Buddy",
      day,
      buddyCountsTowardWorkload
    );
    incrementDebugCounter(
      generationDebug.successfulAssignmentsByType,
      "Buddy"
    );
    recordDaySlotDebug(generationDebug, day.key, "Buddy", {
      successful: true,
      reason: `Assigned ${picked.displayName} after Primary settled with ${primaryResident?.displayName ?? current.primaryRosterId} as PGY-4 Primary.`,
      eligibleResidentIds: [picked.residentId],
    });
    return true;
  }

  const buddyPrepassStartedAt = Date.now();
  for (const phase of ["required", "optional"] as const) {
    let progress = true;
    let iterationCount = 0;

    while (progress && iterationCount < MAX_BUDDY_PHASE_ITERATIONS) {
      progress = false;
      iterationCount += 1;
      const orderedRequirements = [...buddyRequirements].sort((left, right) => {
        const leftAssigned = getAssignedBuddyCount(
          left.pgy1RosterId,
          left.eligibleDates
        );
        const rightAssigned = getAssignedBuddyCount(
          right.pgy1RosterId,
          right.eligibleDates
        );
        const leftTarget =
          phase === "required" ? left.requiredBuddyDays : left.maxBuddyDays;
        const rightTarget =
          phase === "required" ? right.requiredBuddyDays : right.maxBuddyDays;
        const leftRemaining = Math.max(0, leftTarget - leftAssigned);
        const rightRemaining = Math.max(0, rightTarget - rightAssigned);

        if (leftRemaining !== rightRemaining) {
          return rightRemaining - leftRemaining;
        }

        const leftSeed = seededNoise({
          residentId: left.pgy1RosterId,
          dateKey: monthDays[0]?.key ?? "month",
          slot: "Buddy",
          generationVersion,
        });
        const rightSeed = seededNoise({
          residentId: right.pgy1RosterId,
          dateKey: monthDays[0]?.key ?? "month",
          slot: "Buddy",
          generationVersion,
        });

        if (leftSeed !== rightSeed) return leftSeed - rightSeed;
        return left.residentName.localeCompare(right.residentName);
      });

      for (const requirement of orderedRequirements) {
        if (assignBuddyForRequirement(requirement, phase)) {
          progress = true;
        }
      }
    }

    generationDebug.buddyPass.loopExitReasons.push({
      phase,
      iterations: iterationCount,
      reason: progress
        ? `Stopped after reaching max iterations (${MAX_BUDDY_PHASE_ITERATIONS}).`
        : "Stopped because no further Buddy assignments could be made.",
    });
  }
  recordPhaseTiming(
    generationDebug,
    "buddy_prepass",
    buddyPrepassStartedAt,
    generationDebug.buddyPass.loopExitReasons
      .map((entry) => `${entry.phase}:${entry.iterations}`)
      .join(", ")
  );

  generationDebug.buddyPass.finalBuddyCounts = buddyRequirements.map(
    (requirement) => ({
      residentId: requirement.pgy1RosterId,
      residentName: requirement.residentName,
      assignedBuddyDays: getAssignedBuddyCount(
        requirement.pgy1RosterId,
        requirement.eligibleDates
      ),
      requiredBuddyDays: requirement.requiredBuddyDays,
      maxBuddyDays: requirement.maxBuddyDays,
    })
  );

  const assignmentPassStartedAt = Date.now();
  const buddyDateStateByDate = getLiveBuddyDateStateMap();

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
      incrementDebugCounter(
        generationDebug.candidateSlotsConsideredByType,
        "Primary"
      );
      const primaryPool = inspectCandidatePool({
        residents,
        slot: "Primary",
        day,
        current,
        assignments: nextAssignments,
        rules: enabledRules,
        availabilityByResident,
      });
      recordDaySlotDebug(generationDebug, day.key, "Primary", {
        considered: true,
        eligibleResidentIds: primaryPool.eligible.map((resident) => resident.residentId),
        blockedResidents: primaryPool.blocked,
      });
      incrementDebugCounter(
        generationDebug.candidateAssignmentsAttemptedByType,
        "Primary"
      );
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
        incrementDebugCounter(
          generationDebug.successfulAssignmentsByType,
          "Primary"
        );
        recordDaySlotDebug(generationDebug, day.key, "Primary", {
          attempted: true,
          successful: true,
          reason: `Assigned ${picked.displayName}`,
        });
      } else {
        incrementDebugCounter(
          generationDebug.rejectedAssignmentsByType,
          "Primary"
        );
        incrementDebugReason(
          generationDebug.rejectionReasonsByType,
          "Primary",
          primaryPool.eligible.length === 0
            ? "No eligible residents found"
            : "Eligible residents existed but no assignment was selected"
        );
        recordDaySlotDebug(generationDebug, day.key, "Primary", {
          attempted: true,
          successful: false,
          reason:
            primaryPool.eligible.length === 0
              ? "No eligible residents found"
              : "Eligible residents existed but no assignment was selected",
        });
      }
    }

    assignBuddyToExistingPrimaryDay(day);

    // Phase 2: Determine which secondary slots are visible AFTER Primary is known.
    const { backupDef, buddyDef } =
      getSecondarySlotContext({
        day,
        current,
        residentsById,
        slotDefinitions: effectiveSlotDefinitions,
        buddyDateState: buddyDateStateByDate.get(day.key) ?? null,
      });
    const buddyActiveThisDay = Boolean(current.buddyRosterId || buddyDef);

    // Fill Backup when:
    //   - custom slot defs: use per-day visibility from getSecondarySlotContext
    //   - no custom slot defs: use legacy global flag (globalBackupRequired)
    const shouldFillBackupThisDay = !current.backupRosterId && (
      hasCustomBackupDefs
        ? backupDef !== null
        : globalBackupRequired && !buddyActiveThisDay
    );

    if (!current.backupRosterId) {
      const backupReason = hasCustomBackupDefs
        ? backupDef !== null
          ? "Backup slot visible from slot definitions"
          : "Backup slot not visible from slot definitions"
        : globalBackupRequired
        ? "Backup required from required_daily_call_slots"
        : "Backup not required by rule configuration";
      recordDaySlotDebug(generationDebug, day.key, "Backup", {
        considered: shouldFillBackupThisDay,
        reason: backupReason,
      });
      if (shouldFillBackupThisDay) {
        incrementDebugCounter(
          generationDebug.candidateSlotsConsideredByType,
          "Backup"
        );
      } else {
        incrementDebugReason(
          generationDebug.rejectionReasonsByType,
          "Backup",
          backupReason
        );
      }
    }

    if (process.env.NODE_ENV === "development" && hasCustomBackupDefs) {
      const primaryResident = current.primaryRosterId
        ? residentsById.get(current.primaryRosterId)
        : null;
      console.debug("[auto-gen]", day.key, {
        primaryName: primaryResident?.displayName ?? null,
        primaryPgy: primaryResident
          ? getResidentPgyYear(primaryResident, day.key)
          : null,
        backupDefVisible: backupDef !== null,
        shouldFillBackup: shouldFillBackupThisDay,
        backupAssignedAfter: current.backupRosterId ?? "(none)",
      });
    }

    if (shouldFillBackupThisDay) {
      const backupPool = inspectCandidatePool({
        residents: residents.filter(
          (resident) => resident.residentId !== current.primaryRosterId
        ),
        slot: "Backup",
        day,
        current,
        assignments: nextAssignments,
        rules: enabledRules,
        availabilityByResident,
      });
      recordDaySlotDebug(generationDebug, day.key, "Backup", {
        considered: true,
        attempted: true,
        eligibleResidentIds: backupPool.eligible.map((resident) => resident.residentId),
        blockedResidents: backupPool.blocked,
      });
      incrementDebugCounter(
        generationDebug.candidateAssignmentsAttemptedByType,
        "Backup"
      );
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
        incrementDebugCounter(
          generationDebug.successfulAssignmentsByType,
          "Backup"
        );
        recordDaySlotDebug(generationDebug, day.key, "Backup", {
          successful: true,
          reason: `Assigned ${picked.displayName}`,
        });
      } else {
        if (process.env.NODE_ENV === "development" && hasCustomBackupDefs) {
          console.debug("[auto-gen] backup slot visible but no eligible resident found:", day.key);
        }
        incrementDebugCounter(
          generationDebug.rejectedAssignmentsByType,
          "Backup"
        );
        incrementDebugReason(
          generationDebug.rejectionReasonsByType,
          "Backup",
          backupPool.eligible.length === 0
            ? "No eligible residents found"
            : "Eligible residents existed but no assignment was selected"
        );
        recordDaySlotDebug(generationDebug, day.key, "Backup", {
          successful: false,
          reason:
            backupPool.eligible.length === 0
              ? "No eligible residents found"
              : "Eligible residents existed but no assignment was selected",
        });
      }
    }

    if (!current.buddyRosterId && !buddyDef) {
      const buddyReason =
        buddyDateStateByDate.get(day.key)?.reason ??
        "Buddy slot not visible from slot definitions";
      incrementDebugReason(
        generationDebug.rejectionReasonsByType,
        "Buddy",
        buddyReason
      );
      recordDaySlotDebug(generationDebug, day.key, "Buddy", {
        considered: false,
        attempted: false,
        successful: false,
        reason: buddyReason,
      });
    } else if (current.buddyRosterId) {
      recordDaySlotDebug(generationDebug, day.key, "Buddy", {
        considered: true,
        attempted: true,
        successful: true,
        reason:
          generationDebug.daySlotOutcomes[day.key]?.Buddy?.reason ??
          `Assigned ${residentsById.get(current.buddyRosterId)?.displayName ?? current.buddyRosterId}`,
        eligibleResidentIds: [current.buddyRosterId],
      });
    } else if (buddyDef) {
      const buddyState = buddyDateStateByDate.get(day.key) ?? null;
      const buddyPool = inspectCandidatePool({
        residents,
        slot: "Buddy",
        day,
        current,
        assignments: nextAssignments,
        rules: enabledRules,
        availabilityByResident,
      });
      recordDaySlotDebug(generationDebug, day.key, "Buddy", {
        considered: true,
        attempted: false,
        successful: false,
        reason:
          buddyState?.isRequired
            ? "Buddy day remained open after the PGY-1 Buddy pass."
            : "Optional Buddy slot remained open after all eligible PGY-1 residents were assigned or blocked.",
        eligibleResidentIds: buddyPool.eligible.map((resident) => resident.residentId),
        blockedResidents: buddyPool.blocked,
      });
    }

    nextAssignments[day.key] = current;
  }
  recordPhaseTiming(
    generationDebug,
    "primary_backup_buddy_fill",
    assignmentPassStartedAt,
    `${monthDays.length} day(s)`
  );

  // CALL_POLICY_V2 (#3): enforce the buddy hard cap. Both buddy assignment paths
  // (the required/optional prepass and assignBuddyToExistingPrimaryDay) can place a
  // buddy, and the legacy optional target derived from the generic monthly cap could
  // exceed the intended maximum. Trim any intern beyond the policy cap here, keeping
  // their earliest buddy weekends. Buddy is optional (never required), so clearing an
  // excess buddy day introduces no missing-required-slot violation.
  if (useCallPolicyV2) {
    const trim = computeBuddyCapTrim(
      nextAssignments,
      buddyPolicy.requiredDaysPerMonth
    );
    for (const { dateKey, rosterId } of trim) {
      const current = nextAssignments[dateKey];
      const day = monthDayByKey.get(dateKey);
      if (!current || !day) continue;
      nextAssignments[dateKey] = { ...current, buddyRosterId: null };
      undoStats(stats, rosterId, "Buddy", day, buddyCountsTowardWorkload);
    }
    if (trim.length > 0) {
      recordDaySlotDebug(generationDebug, trim[0].dateKey, "Buddy", {
        considered: true,
        attempted: false,
        successful: false,
        reason: `Buddy cap enforced: trimmed ${trim.length} buddy day(s) over the ${buddyPolicy.requiredDaysPerMonth}-weekend/intern max.`,
      });
      invalidateBuddyDateStateMap();
    }
  }

  // Clear the per-attempt engine handle before returning (repair/optimize, which run
  // after in the wrapper, use the legacy path).
  activeGeneratorEngine = null;

  return {
    assignments: nextAssignments,
    stats: Array.from(stats.values()),
    generationDebug,
  };
}

// ---------------------------------------------------------------------------
// Phase 3: local-search optimizer
//
// Takes an already hard-feasible, complete schedule and improves its fairness
// (softStatsScore) via simulated annealing over Primary/Backup reassign and
// swap moves. Hard constraints are invariants — a move is only ever accepted
// if the affected cells remain hard-eligible (evaluateResidentForSlot). Buddy
// days are frozen (their Primary is the partner-PGY resident and Backup is
// disabled), so they are excluded from moves. Deterministic for a given seed.
// ---------------------------------------------------------------------------

type OptimizerSlot = "Primary" | "Backup";

/** Deterministic PRNG (mulberry32) — no Math.random/Date in the optimize loop. */
function createSeededRng(seed: number) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function cloneAssignments(
  assignments: Record<string, DraftDayAssignment>
): Record<string, DraftDayAssignment> {
  const next: Record<string, DraftDayAssignment> = {};
  for (const [dateKey, assignment] of Object.entries(assignments)) {
    next[dateKey] = {
      primaryRosterId: assignment.primaryRosterId ?? null,
      backupRosterId: assignment.backupRosterId ?? null,
      buddyRosterId: assignment.buddyRosterId ?? null,
    };
  }
  return next;
}

export type OptimizeCallScheduleParams = {
  assignments: Record<string, DraftDayAssignment>;
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  historicalStats: ExistingResidentStats[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  seed?: number;
  maxIterations?: number;
  /** Annealing start temperature and geometric cooling factor per iteration. */
  startTemperature?: number;
  coolingRate?: number;
};

export type OptimizeCallScheduleResult = {
  assignments: Record<string, DraftDayAssignment>;
  stats: ResidentAutoStats[];
  iterations: number;
  acceptedMoves: number;
  improvedMoves: number;
  softScoreBefore: number;
  softScoreAfter: number;
};

export function optimizeCallSchedule({
  assignments,
  monthDays,
  residents,
  rules,
  availabilityByResident,
  historicalStats,
  slotDefinitions = DEFAULT_SLOT_DEFINITIONS,
  seed = 1,
  maxIterations = 4000,
  startTemperature = 500,
  coolingRate = 0.9995,
}: OptimizeCallScheduleParams): OptimizeCallScheduleResult {
  const enabledRules = getEffectiveRules(rules, { includeDisabled: false });
  const effectiveSlotDefinitions =
    slotDefinitions.length > 0 ? slotDefinitions : DEFAULT_SLOT_DEFINITIONS;

  const current = cloneAssignments(assignments);
  const monthDayByKey = new Map(monthDays.map((day) => [day.key, day]));

  // Build the live stats map for the starting schedule (matches how the greedy
  // generator accounts for existing assignments).
  const stats = buildInitialStats(
    residents,
    historicalStats,
    monthDays[0]?.key ?? null
  );
  applyExistingAssignmentsToStats(
    stats,
    monthDays,
    current,
    effectiveSlotDefinitions
  );

  const startScore = softStatsScore(Array.from(stats.values()));

  // Movable cells: filled Primary/Backup cells on non-buddy days. Buddy days are
  // frozen (buddyRosterId set → Primary is the locked partner, Backup disabled).
  const movableCells: Array<{ dateKey: string; slot: OptimizerSlot }> = [];
  for (const day of monthDays) {
    const assignment = current[day.key];
    if (!assignment || assignment.buddyRosterId) continue;
    if (assignment.primaryRosterId) {
      movableCells.push({ dateKey: day.key, slot: "Primary" });
    }
    if (assignment.backupRosterId) {
      movableCells.push({ dateKey: day.key, slot: "Backup" });
    }
  }

  const emptyResult: OptimizeCallScheduleResult = {
    assignments: current,
    stats: Array.from(stats.values()),
    iterations: 0,
    acceptedMoves: 0,
    improvedMoves: 0,
    softScoreBefore: startScore,
    softScoreAfter: startScore,
  };

  if (movableCells.length === 0 || residents.length < 2) {
    return emptyResult;
  }

  const rng = createSeededRng(seed);
  const pick = <T>(items: T[]) => items[Math.floor(rng() * items.length)];

  function getSlotRoster(dateKey: string, slot: OptimizerSlot) {
    const assignment = current[dateKey];
    return slot === "Primary"
      ? assignment?.primaryRosterId ?? null
      : assignment?.backupRosterId ?? null;
  }

  function setSlotRoster(
    dateKey: string,
    slot: OptimizerSlot,
    rosterId: string | null
  ) {
    const assignment = current[dateKey];
    if (!assignment) return;
    if (slot === "Primary") assignment.primaryRosterId = rosterId;
    else assignment.backupRosterId = rosterId;
  }

  function residentsAssignedOn(dateKey: string) {
    const assignment = current[dateKey];
    const ids = new Set<string>();
    if (assignment?.primaryRosterId) ids.add(assignment.primaryRosterId);
    if (assignment?.backupRosterId) ids.add(assignment.backupRosterId);
    if (assignment?.buddyRosterId) ids.add(assignment.buddyRosterId);
    return ids;
  }

  // Primary/Backup always count toward workload in the stats model (matches
  // applyExistingAssignmentsToStats), so cell moves use countsTowardWorkload=true.
  function isHardEligible(
    residentId: string,
    slot: OptimizerSlot,
    dateKey: string
  ) {
    const resident = residents.find((r) => r.residentId === residentId);
    if (!resident) return false;
    return !evaluateResidentForSlot({
      resident,
      slot,
      dateKey,
      assignments: current,
      rules: enabledRules,
      availabilityByResident,
    }).blocked;
  }

  let currentScore = startScore;
  let bestScore = startScore;
  let bestAssignments = cloneAssignments(current);
  let temperature = startTemperature;
  let acceptedMoves = 0;
  let improvedMoves = 0;

  function acceptDelta(delta: number) {
    if (delta <= 0) return true;
    return rng() < Math.exp(-delta / Math.max(temperature, 1e-6));
  }

  for (let iteration = 0; iteration < maxIterations; iteration += 1) {
    temperature *= coolingRate;

    const doSwap = rng() < 0.5;

    if (!doSwap) {
      // Reassign: replace the resident in a random movable cell.
      const cell = pick(movableCells);
      const day = monthDayByKey.get(cell.dateKey);
      if (!day) continue;

      const currentRoster = getSlotRoster(cell.dateKey, cell.slot);
      if (!currentRoster) continue;

      const occupied = residentsAssignedOn(cell.dateKey);
      const candidatePool = residents.filter(
        (r) => r.residentId !== currentRoster && !occupied.has(r.residentId)
      );
      if (candidatePool.length === 0) continue;
      const candidate = pick(candidatePool);

      // Apply tentatively.
      setSlotRoster(cell.dateKey, cell.slot, candidate.residentId);
      undoStats(stats, currentRoster, cell.slot, day);
      updateStats(stats, candidate.residentId, cell.slot, day);

      const eligible = isHardEligible(
        candidate.residentId,
        cell.slot,
        cell.dateKey
      );
      const nextScore = eligible
        ? softStatsScore(Array.from(stats.values()))
        : Number.POSITIVE_INFINITY;
      const delta = nextScore - currentScore;

      if (eligible && acceptDelta(delta)) {
        currentScore = nextScore;
        acceptedMoves += 1;
        if (delta < 0) improvedMoves += 1;
        if (currentScore < bestScore) {
          bestScore = currentScore;
          bestAssignments = cloneAssignments(current);
        }
      } else {
        // Revert.
        setSlotRoster(cell.dateKey, cell.slot, currentRoster);
        undoStats(stats, candidate.residentId, cell.slot, day);
        updateStats(stats, currentRoster, cell.slot, day);
      }
      continue;
    }

    // Swap: exchange residents between two movable cells on different dates.
    const cellA = pick(movableCells);
    const cellB = pick(movableCells);
    if (cellA.dateKey === cellB.dateKey) continue;

    const dayA = monthDayByKey.get(cellA.dateKey);
    const dayB = monthDayByKey.get(cellB.dateKey);
    if (!dayA || !dayB) continue;

    const rosterA = getSlotRoster(cellA.dateKey, cellA.slot);
    const rosterB = getSlotRoster(cellB.dateKey, cellB.slot);
    if (!rosterA || !rosterB || rosterA === rosterB) continue;

    // Neither resident may already hold another slot on the other's date.
    if (residentsAssignedOn(cellA.dateKey).has(rosterB)) continue;
    if (residentsAssignedOn(cellB.dateKey).has(rosterA)) continue;

    // Apply tentatively.
    setSlotRoster(cellA.dateKey, cellA.slot, rosterB);
    setSlotRoster(cellB.dateKey, cellB.slot, rosterA);
    undoStats(stats, rosterA, cellA.slot, dayA);
    undoStats(stats, rosterB, cellB.slot, dayB);
    updateStats(stats, rosterB, cellA.slot, dayA);
    updateStats(stats, rosterA, cellB.slot, dayB);

    const eligible =
      isHardEligible(rosterB, cellA.slot, cellA.dateKey) &&
      isHardEligible(rosterA, cellB.slot, cellB.dateKey);
    const nextScore = eligible
      ? softStatsScore(Array.from(stats.values()))
      : Number.POSITIVE_INFINITY;
    const delta = nextScore - currentScore;

    if (eligible && acceptDelta(delta)) {
      currentScore = nextScore;
      acceptedMoves += 1;
      if (delta < 0) improvedMoves += 1;
      if (currentScore < bestScore) {
        bestScore = currentScore;
        bestAssignments = cloneAssignments(current);
      }
    } else {
      // Revert.
      setSlotRoster(cellA.dateKey, cellA.slot, rosterA);
      setSlotRoster(cellB.dateKey, cellB.slot, rosterB);
      undoStats(stats, rosterB, cellA.slot, dayA);
      undoStats(stats, rosterA, cellB.slot, dayB);
      updateStats(stats, rosterA, cellA.slot, dayA);
      updateStats(stats, rosterB, cellB.slot, dayB);
    }
  }

  // Recompute stats cleanly for the best schedule found.
  const bestStats = buildInitialStats(
    residents,
    historicalStats,
    monthDays[0]?.key ?? null
  );
  applyExistingAssignmentsToStats(
    bestStats,
    monthDays,
    bestAssignments,
    effectiveSlotDefinitions
  );

  return {
    assignments: bestAssignments,
    stats: Array.from(bestStats.values()),
    iterations: maxIterations,
    acceptedMoves,
    improvedMoves,
    softScoreBefore: startScore,
    softScoreAfter: bestScore,
  };
}

// ---------------------------------------------------------------------------
// Phase 3: Phase-A feasibility repair
//
// Takes a possibly incomplete/invalid schedule and drives it to a complete,
// hard-feasible one (for Primary/Backup) — or reports exactly which required
// slots could not be filled. Three stages: purge hard-violating occupants,
// directly fill open required slots with the best eligible resident, then
// swap-to-unstick slots that stayed open because their only eligible resident
// was already used elsewhere. Buddy slots are left to the buddy pre-pass.
// ---------------------------------------------------------------------------

export type RepairInfeasibleSlot = {
  dateKey: string;
  slot: OptimizerSlot;
  reason: string;
};

export type RepairCallScheduleResult = {
  assignments: Record<string, DraftDayAssignment>;
  stats: ResidentAutoStats[];
  feasible: boolean;
  filledSlots: number;
  swapUnsticks: number;
  purgedViolations: number;
  infeasibleSlots: RepairInfeasibleSlot[];
};

export function repairCallSchedule({
  assignments,
  monthDays,
  residents,
  rules,
  availabilityByResident,
  historicalStats,
  slotDefinitions = DEFAULT_SLOT_DEFINITIONS,
  slotMode = "Both",
  seed = 1,
  maxRounds = 200,
}: {
  assignments: Record<string, DraftDayAssignment>;
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  historicalStats: ExistingResidentStats[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  slotMode?: QuickAssignSlotMode;
  seed?: number;
  maxRounds?: number;
}): RepairCallScheduleResult {
  const enabledRules = getEffectiveRules(rules, { includeDisabled: false });
  const effectiveSlotDefinitions =
    slotDefinitions.length > 0 ? slotDefinitions : DEFAULT_SLOT_DEFINITIONS;
  const residentsById = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );
  const monthDayByKey = new Map(monthDays.map((day) => [day.key, day]));

  const current = cloneAssignments(assignments);
  const stats = buildInitialStats(
    residents,
    historicalStats,
    monthDays[0]?.key ?? null
  );
  applyExistingAssignmentsToStats(
    stats,
    monthDays,
    current,
    effectiveSlotDefinitions
  );

  function getSlotRoster(dateKey: string, slot: OptimizerSlot) {
    const assignment = current[dateKey];
    return slot === "Primary"
      ? assignment?.primaryRosterId ?? null
      : assignment?.backupRosterId ?? null;
  }

  function setSlotRoster(
    dateKey: string,
    slot: OptimizerSlot,
    rosterId: string | null
  ) {
    const assignment = current[dateKey] ?? {
      primaryRosterId: null,
      backupRosterId: null,
      buddyRosterId: null,
    };
    if (slot === "Primary") assignment.primaryRosterId = rosterId;
    else assignment.backupRosterId = rosterId;
    current[dateKey] = assignment;
  }

  function residentsAssignedOn(dateKey: string) {
    const assignment = current[dateKey];
    const ids = new Set<string>();
    if (assignment?.primaryRosterId) ids.add(assignment.primaryRosterId);
    if (assignment?.backupRosterId) ids.add(assignment.backupRosterId);
    if (assignment?.buddyRosterId) ids.add(assignment.buddyRosterId);
    return ids;
  }

  function isBlocked(residentId: string, slot: OptimizerSlot, dateKey: string) {
    const resident = residentsById.get(residentId);
    if (!resident) return true;
    return evaluateResidentForSlot({
      resident,
      slot,
      dateKey,
      assignments: current,
      rules: enabledRules,
      availabilityByResident,
    }).blocked;
  }

  // --- Stage 1: purge hard-violating Primary/Backup occupants ---
  let purgedViolations = 0;
  for (const day of monthDays) {
    if (current[day.key]?.buddyRosterId) continue; // buddy days handled elsewhere
    for (const slot of ["Primary", "Backup"] as OptimizerSlot[]) {
      const roster = getSlotRoster(day.key, slot);
      if (roster && isBlocked(roster, slot, day.key)) {
        setSlotRoster(day.key, slot, null);
        undoStats(stats, roster, slot, day);
        purgedViolations += 1;
      }
    }
  }

  function bestEligibleFor(dateKey: string, slot: OptimizerSlot) {
    const day = monthDayByKey.get(dateKey);
    if (!day) return null;
    const occupied = residentsAssignedOn(dateKey);
    const pool = residents.filter((r) => !occupied.has(r.residentId));
    if (pool.length === 0) return null;
    return pickBestResident({
      residents: pool,
      slot,
      day,
      assignments: current,
      rules: enabledRules,
      availabilityByResident,
      stats,
      generationVersion: seed,
    });
  }

  function openPrimaryBackup(): OpenRequiredSlot[] {
    return listOpenRequiredSlots({
      monthDays,
      residents,
      assignments: current,
      rules: enabledRules,
      slotMode,
      slotDefinitions: effectiveSlotDefinitions,
      residentsById,
    }).filter((entry) => entry.slot === "Primary" || entry.slot === "Backup");
  }

  let filledSlots = 0;
  let swapUnsticks = 0;

  // --- Stage 2 + 3: fill, then swap-to-unstick ---
  for (let round = 0; round < maxRounds; round += 1) {
    const openSlots = openPrimaryBackup();
    if (openSlots.length === 0) break;

    let progress = false;

    // Stage 2: direct fill.
    for (const openSlot of openSlots) {
      const dateKey = openSlot.dateKey;
      const slot = openSlot.slot as OptimizerSlot;
      if (getSlotRoster(dateKey, slot)) continue; // filled earlier this round
      const day = monthDayByKey.get(dateKey);
      if (!day) continue;
      const picked = bestEligibleFor(dateKey, slot);
      if (picked) {
        setSlotRoster(dateKey, slot, picked.residentId);
        updateStats(stats, picked.residentId, slot, day);
        filledSlots += 1;
        progress = true;
      }
    }

    if (progress) continue;

    // Stage 3: swap-to-unstick the first still-open slot.
    const target = openPrimaryBackup()[0];
    if (!target) break;
    if (attemptSwapUnstick(target.dateKey, target.slot as OptimizerSlot)) {
      swapUnsticks += 1;
      continue;
    }

    break; // no direct fill and no swap possible → stuck
  }

  function attemptSwapUnstick(dateKey: string, slot: OptimizerSlot): boolean {
    const targetDay = monthDayByKey.get(dateKey);
    if (!targetDay) return false;
    const occupiedOnTarget = residentsAssignedOn(dateKey);

    // Candidate movers: residents currently in a movable (non-buddy) Primary/Backup
    // cell elsewhere who could legally take the target slot.
    for (const sourceDay of monthDays) {
      if (sourceDay.key === dateKey) continue;
      if (current[sourceDay.key]?.buddyRosterId) continue;

      for (const sourceSlot of ["Primary", "Backup"] as OptimizerSlot[]) {
        const mover = getSlotRoster(sourceDay.key, sourceSlot);
        if (!mover || occupiedOnTarget.has(mover)) continue;

        // Tentatively move the mover from source → target.
        setSlotRoster(sourceDay.key, sourceSlot, null);
        undoStats(stats, mover, sourceSlot, sourceDay);

        const moverEligible = !isBlocked(mover, slot, dateKey);
        if (!moverEligible) {
          // revert
          setSlotRoster(sourceDay.key, sourceSlot, mover);
          updateStats(stats, mover, sourceSlot, sourceDay);
          continue;
        }

        setSlotRoster(dateKey, slot, mover);
        updateStats(stats, mover, slot, targetDay);

        // Refill the vacated source cell with a different eligible resident.
        const refill = bestEligibleFor(sourceDay.key, sourceSlot);
        if (refill) {
          setSlotRoster(sourceDay.key, sourceSlot, refill.residentId);
          updateStats(stats, refill.residentId, sourceSlot, sourceDay);
          return true;
        }

        // Could not refill → revert the whole swap and try the next candidate.
        setSlotRoster(dateKey, slot, null);
        undoStats(stats, mover, slot, targetDay);
        setSlotRoster(sourceDay.key, sourceSlot, mover);
        updateStats(stats, mover, sourceSlot, sourceDay);
      }
    }

    return false;
  }

  const remainingOpen = openPrimaryBackup();
  const infeasibleSlots: RepairInfeasibleSlot[] = remainingOpen.map((entry) => {
    const day = monthDayByKey.get(entry.dateKey);
    const occupied = residentsAssignedOn(entry.dateKey);
    const anyEligible =
      day != null &&
      residents.some(
        (r) =>
          !occupied.has(r.residentId) &&
          !isBlocked(r.residentId, entry.slot as OptimizerSlot, entry.dateKey)
      );
    return {
      dateKey: entry.dateKey,
      slot: entry.slot as OptimizerSlot,
      reason: anyEligible
        ? "No feasible arrangement filled this required slot (over-constrained)."
        : "No eligible resident is available for this required slot on this date.",
    };
  });

  return {
    assignments: current,
    stats: Array.from(stats.values()),
    feasible: infeasibleSlots.length === 0,
    filledSlots,
    swapUnsticks,
    purgedViolations,
    infeasibleSlots,
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
  enableLocalSearch = false,
  localSearchMaxIterations = 4000,
  useCallPolicyV2 = false,
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
      useCallPolicyV2,
    });

    const signature = JSON.stringify(generated.assignments);

    if (seen.has(signature)) continue;
    seen.add(signature);

    const openRequiredSlots = countOpenRequiredSlots({
      monthDays,
      residents,
      assignments: generated.assignments,
      // #4: score/diagnose against the same effective rule set generation used,
      // so scoring can never silently disagree with what was generated.
      rules: effectiveRules,
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
      rules: effectiveRules,
      availabilityByResident,
    });

    const score = scoreGeneratedSchedule({
      stats: generated.stats,
      assignments: generated.assignments,
      monthDays,
      residents,
      rules: effectiveRules,
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
      generationDebug: generated.generationDebug,
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

  // Phase 3 (opt-in) pipeline: repair-then-optimize.
  //   A) If the best greedy result is incomplete/invalid, run feasibility repair
  //      (fills open required slots + swap-to-unstick), adopting it only if it
  //      reaches a fully complete, hard-feasible schedule.
  //   B) On a complete + valid schedule, run local search to improve fairness.
  // Both stages re-verify feasibility before adopting; the default path
  // (enableLocalSearch off) is byte-unchanged.
  let selectedAssignments = best?.assignments ?? {};
  let selectedStats = best?.stats ?? [];
  let optimizationReport: {
    applied: boolean;
    softScoreBefore: number;
    softScoreAfter: number;
    acceptedMoves: number;
    improvedMoves: number;
    iterations: number;
  } | null = null;
  let repairReport: {
    applied: boolean;
    feasible: boolean;
    filledSlots: number;
    swapUnsticks: number;
    purgedViolations: number;
    infeasibleSlots: RepairInfeasibleSlot[];
  } | null = null;

  if (enableLocalSearch && best) {
    let workingAssignments = best.assignments;
    let workingComplete = best.isComplete;
    let workingValid = best.isValid;

    // Stage A: feasibility repair for incomplete/invalid results.
    if (!(best.isComplete && best.isValid)) {
      const repaired = repairCallSchedule({
        assignments: best.assignments,
        monthDays,
        residents,
        rules: effectiveRules,
        availabilityByResident,
        historicalStats,
        slotDefinitions,
        slotMode,
        seed: generationVersion,
      });

      const repairedOpenSlots = countOpenRequiredSlots({
        monthDays,
        residents,
        assignments: repaired.assignments,
        rules: effectiveRules,
        slotMode,
        slotDefinitions,
        residentsById,
      });
      const repairedDiagnostics = analyzeCombinationDiagnostics({
        combo: {
          assignments: repaired.assignments,
          openRequiredSlots: repairedOpenSlots,
        },
        monthDays,
        residents,
        rules: effectiveRules,
        availabilityByResident,
      });

      const fullyFeasible =
        repairedDiagnostics.hardErrors === 0 && repairedOpenSlots === 0;

      repairReport = {
        applied: true,
        feasible: fullyFeasible,
        filledSlots: repaired.filledSlots,
        swapUnsticks: repaired.swapUnsticks,
        purgedViolations: repaired.purgedViolations,
        infeasibleSlots: repaired.infeasibleSlots,
      };

      if (fullyFeasible) {
        workingAssignments = repaired.assignments;
        workingComplete = true;
        workingValid = true;
        selectedAssignments = repaired.assignments;
        selectedStats = repaired.stats;
      }
    }

    // Stage B: local-search fairness optimization on a complete + valid schedule.
    if (workingComplete && workingValid) {
      const optimized = optimizeCallSchedule({
        assignments: workingAssignments,
        monthDays,
        residents,
        rules: effectiveRules,
        availabilityByResident,
        historicalStats,
        slotDefinitions,
        seed: generationVersion,
        maxIterations: localSearchMaxIterations,
      });

      const optimizedOpenSlots = countOpenRequiredSlots({
        monthDays,
        residents,
        assignments: optimized.assignments,
        rules: effectiveRules,
        slotMode,
        slotDefinitions,
        residentsById,
      });
      const optimizedDiagnostics = analyzeCombinationDiagnostics({
        combo: {
          assignments: optimized.assignments,
          openRequiredSlots: optimizedOpenSlots,
        },
        monthDays,
        residents,
        rules: effectiveRules,
        availabilityByResident,
      });

      if (optimizedDiagnostics.hardErrors === 0 && optimizedOpenSlots === 0) {
        selectedAssignments = optimized.assignments;
        selectedStats = optimized.stats;
        optimizationReport = {
          applied: true,
          softScoreBefore: optimized.softScoreBefore,
          softScoreAfter: optimized.softScoreAfter,
          acceptedMoves: optimized.acceptedMoves,
          improvedMoves: optimized.improvedMoves,
          iterations: optimized.iterations,
        };
      }
    }
  }

    return {
    assignments: selectedAssignments,
    stats: selectedStats,
    generationReport: {
      attemptsRun: ATTEMPTS,
      uniqueCombinations: rankedCombinations.length,
      completeCombinationCount: completeCombinations.length,
      optimization: optimizationReport,
      repair: repairReport,
      topCombinations,
      topCombinationSummaries: topCombinations.map((combo) =>
        summarizeCombinationForAI(
          combo,
          monthDays,
          residents,
          effectiveRules,
          availabilityByResident
        )
      ),
      generationDebug: best?.generationDebug ?? null,
      selectedCombinationSummary: best
        ? summarizeCombinationForAI(
            best,
            monthDays,
            residents,
            effectiveRules,
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
