import type {
  DraftDayAssignment,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import {
  getVisibleCallSlotsForDay,
  getSlotStatusForDay,
  getEffectiveRules,
} from "@/lib/workspace/call/rule-definitions";
import {
  getBuddyDateStatesForMonth,
  getBuddyRequirementsForMonth,
  type BuddyDateState,
  type BuddyRequirement,
  BUDDY_PRIMARY_PARTNER_PGY,
} from "@/lib/workspace/call/buddy-requirements";
import {
  countUniqueWeekendBuckets,
  evaluateMonthlyLimitForResident,
  evaluateMonthlyLoadTargetForResident,
  evaluatePgyEligibility,
  evaluateRotationCallLimitForResident,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  evaluateWeekendPairingForResident,
  getAdjacentWeekendDateKey,
  getResidentPgyYear,
  isWeekendDateKey,
} from "@/lib/workspace/call/rule-evaluator";
import {
  getRotationAssignmentForDate,
  getRotationDisplayLabel,
} from "@/lib/workspace/call/resident-display";
import { getResidentStatusDetails } from "@/lib/workspace/pgy";

type Slot = "Primary" | "Backup" | "Buddy";

type RotationLike = {
  residentId?: string | null;
  rosterId?: string | null;
  roster_id?: string | null;
  residentName?: string | null;
  rotationId?: string | null;
  rotation_id?: string | null;
  rotationName?: string | null;
  rotation_name?: string | null;
  rotationShortName?: string | null;
  rotation_short_name?: string | null;
  teamLabel?: string | null;
  team_label?: string | null;
  siteLabel?: string | null;
  site_label?: string | null;
  startDate?: string | null;
  start_date?: string | null;
  endDate?: string | null;
  end_date?: string | null;
};

type GenerationDaySlotDebug = {
  considered?: boolean;
  attempted?: boolean;
  successful?: boolean;
  reason?: string | null;
  eligibleResidentIds?: string[];
  blockedResidents?: Array<{
    residentId: string;
    residentName: string;
    reasons: string[];
  }>;
};

type GenerationDebugPayload = {
  candidateSlotsConsideredByType?: Record<string, number>;
  candidateAssignmentsAttemptedByType?: Record<string, number>;
  successfulAssignmentsByType?: Record<string, number>;
  rejectedAssignmentsByType?: Record<string, number>;
  rejectionReasonsByType?: Record<string, Record<string, number>>;
  daySlotOutcomes?: Record<string, Partial<Record<Slot, GenerationDaySlotDebug>>>;
  phaseTimings?: Array<{
    phase: string;
    durationMs: number;
    details?: string;
  }>;
  buddyPass?: {
    residentsDetected?: Array<{
      residentId: string;
      residentName: string;
      requiredBuddyDays: number;
      maxBuddyDays: number;
      assignedBuddyDays: number;
      remainingNeeded: number;
      remainingCapacity: number;
    }>;
    visibleBuddySlotCount?: number;
    attemptedAssignments?: number;
    skippedAssignments?: Array<{
      residentId: string;
      residentName: string;
      phase?: "required" | "optional";
      dateKey: string | null;
      reason: string;
    }>;
    finalBuddyCounts?: Array<{
      residentId: string;
      residentName: string;
      assignedBuddyDays: number;
      requiredBuddyDays: number;
      maxBuddyDays: number;
    }>;
    loopExitReasons?: Array<{
      phase: "required" | "optional";
      iterations: number;
      reason: string;
    }>;
  };
};

type GeneratedAssignmentsInput =
  | Record<string, DraftDayAssignment>
  | {
      assignments: Record<string, DraftDayAssignment>;
      generationDebug?: GenerationDebugPayload | null;
    };

type DebugReportResident = {
  residentId: string;
  name: string;
  rosterId: string | null;
  membershipId: string | null;
  programMembershipId: string | null;
  pgy: number | null;
  rotation: string | null;
};

type DebugReportBlockedResident = {
  resident: string;
  residentId: string;
  reasons: string[];
};

type DebugReportDay = {
  date: string;
  dayOfWeek: string;
  requiredSlotsFromDefinitions: Slot[];
  visibleSlots: Slot[];
  existingAssignments: {
    Primary: string | null;
    Backup: string | null;
    Buddy: string | null;
  };
  primaryResident: string | null;
  primaryResidentPgy: number | null;
  eligibleBuddyRequirements: Array<{
    residentName: string;
    remainingNeededBeforeDate: number;
    eligibleDates: string[];
    assignedDates: string[];
  }>;
  assignedBuddyResident: string | null;
  assignedPrimaryPartner: string | null;
  backupRequired: boolean;
  backupReason: string;
  buddyRequired: boolean;
  buddyReason: string;
  eligibleResidentsBySlot: Record<Slot, string[]>;
  blockedResidentsBySlot: Record<Slot, DebugReportBlockedResident[]>;
  finalStatus: Record<Slot, "filled" | "open" | "not-required">;
};

type DebugReportBuddyPass = {
  pgy1ResidentsDetected: Array<{
    residentId: string;
    residentName: string;
    requiredBuddyDays: number;
    maxBuddyDays: number;
    assignedBuddyDays: number;
    remainingNeeded: number;
    remainingCapacity: number;
    reason: string;
  }>;
  availableBuddySlotCount: number;
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

type BuddySlotFillAuditRow = {
  date: string;
  slotId: string | null;
  slotKey: "Buddy";
  visibility: "hidden" | "optional" | "required";
  generatorAttemptedAssignment: boolean;
  generatorAssignmentSuccessful: boolean;
  eligiblePgy1Candidates: string[];
  candidateAudit: Array<{
    residentId: string;
    residentName: string;
    gradYear: number | null;
    computedPgyOnDate: number | null;
    statusOnDate: string;
    activeOnDate: boolean;
    rotationOnDate: string | null;
    eligibleForBuddy: boolean;
    exclusionReason: string | null;
  }>;
  rejectedPgy1Candidates: Array<{
    resident: string;
    reasons: string[];
  }>;
  selectedResident: string | null;
  finalPersistedBuddyRosterId: string | null;
  dynamicSlotAssignmentValue: string | null;
  reviewModalWillRender: string;
  reason: string;
};

export type CallGenerationDebugReport = {
  month: string;
  programId: string | null;
  slotDefinitionsLoaded: Array<{
    id: string;
    label: string;
    callType: string;
    requiredMode: string;
    requiredWhenVisible: boolean;
    daysOfWeek: number[] | null;
    condition: ProgramCallSlotDefinition["condition"] | null;
  }>;
  activeRulesLoaded: Array<{
    id: string;
    name: string;
    type: string;
    isHardRule: boolean;
    config: ProgramRule["config"];
  }>;
  residentsByPgy: Record<string, DebugReportResident[]>;
  rotationsByResident: Record<string, string[]>;
  buddyRequirements: BuddyRequirement[];
  buddyPass: DebugReportBuddyPass;
  phaseTimings: Array<{
    phase: string;
    durationMs: number;
    details?: string;
  }>;
  buddySlotFillAudit: {
    generatorPass: BuddySlotFillAuditRow[];
    finalDraftPass: BuddySlotFillAuditRow[];
  };
  days: DebugReportDay[];
  summary: {
    requiredPrimary: number;
    filledPrimary: number;
    requiredBackup: number;
    filledBackup: number;
    requiredBuddy: number;
    filledBuddy: number;
    openRequiredSlots: number;
    topBlockReasons: Array<{ reason: string; count: number }>;
  };
  generatorDebug: GenerationDebugPayload | null;
};

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getMonthDates(year: number, month: number) {
  const totalDays = new Date(year, month, 0).getDate();
  return Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(year, month - 1, dayNumber);
    return {
      key: toDateKey(year, month, dayNumber),
      date,
    };
  });
}

function getAssignmentRecord(input: GeneratedAssignmentsInput): {
  assignments: Record<string, DraftDayAssignment>;
  generationDebug: GenerationDebugPayload | null;
} {
  if ("assignments" in input) {
    const wrapped = input as {
      assignments: Record<string, DraftDayAssignment>;
      generationDebug?: GenerationDebugPayload | null;
    };
    return {
      assignments: wrapped.assignments,
      generationDebug: wrapped.generationDebug ?? null,
    };
  }

  return {
    assignments: input,
    generationDebug: null,
  };
}

function getRotationIdForDate(resident: ResidentOption, dateKey: string) {
  const assignment = getRotationAssignmentForDate(
    resident.rotationAssignments,
    dateKey
  ) as RotationLike | null;

  return assignment?.rotationId ?? assignment?.rotation_id ?? null;
}

function getRotationLabelForDate(resident: ResidentOption, dateKey: string) {
  return getRotationDisplayLabel(
    getRotationAssignmentForDate(resident.rotationAssignments, dateKey)
  );
}

function getAssignedDatesForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
) {
  const dates: string[] = [];

  for (const [dateKey, assignment] of Object.entries(assignments)) {
    if (
      assignment.primaryRosterId === residentId ||
      assignment.backupRosterId === residentId ||
      assignment.buddyRosterId === residentId
    ) {
      dates.push(dateKey);
    }
  }

  return dates.sort();
}

function getAssignedSlotDatesForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>,
  slot: Slot
) {
  const dates: string[] = [];

  for (const [dateKey, assignment] of Object.entries(assignments)) {
    if (
      (slot === "Primary" && assignment.primaryRosterId === residentId) ||
      (slot === "Backup" && assignment.backupRosterId === residentId) ||
      (slot === "Buddy" && assignment.buddyRosterId === residentId)
    ) {
      dates.push(dateKey);
    }
  }

  return dates.sort();
}

function pushReason(target: string[], value: string | null | undefined) {
  if (!value) return;
  if (!target.includes(value)) target.push(value);
}

function formatResidentLabel(resident: ResidentOption, effectiveDate: string) {
  const pgy = getResidentPgyYear(resident, effectiveDate);
  return `${resident.displayName}${pgy ? ` (PGY-${pgy})` : ""}`;
}

function buildBuddyCandidateAudit(
  residents: ResidentOption[],
  dateKey: string,
  buddyPool: { eligible: string[]; blocked: DebugReportBlockedResident[] }
) {
  const blockedById = new Map(
    buddyPool.blocked.map((resident) => [resident.residentId, resident.reasons])
  );

  return residents.map((resident) => {
    const status = getResidentStatusDetails(resident.gradYear ?? null, dateKey);
    const rotationOnDate = getRotationLabelForDate(resident, dateKey);
    const eligibleForBuddy = buddyPool.eligible.includes(
      formatResidentLabel(resident, dateKey)
    );
    const blockedReasons = blockedById.get(resident.residentId) ?? [];

    return {
      residentId: resident.residentId,
      residentName: resident.displayName,
      gradYear: resident.gradYear ?? null,
      computedPgyOnDate: getResidentPgyYear(resident, dateKey),
      statusOnDate: status.statusLabel,
      activeOnDate: status.isActiveResident,
      rotationOnDate,
      eligibleForBuddy,
      exclusionReason: blockedReasons[0] ?? null,
    };
  });
}

function buildEligiblePoolForSlot(params: {
  slot: Slot;
  dateKey: string;
  dayOfWeek: number;
  assignments: Record<string, DraftDayAssignment>;
  residents: ResidentOption[];
  rules: ProgramRule[];
}): {
  eligible: string[];
  blocked: DebugReportBlockedResident[];
} {
  const { slot, dateKey, assignments, residents, rules } = params;
  const blocked: DebugReportBlockedResident[] = [];
  const eligible: string[] = [];
  const currentDay = assignments[dateKey];
  const isWeekend = isWeekendDateKey(dateKey);
  const adjacentDateKey = getAdjacentWeekendDateKey(dateKey);
  const adjacentAssignment = adjacentDateKey ? assignments[adjacentDateKey] : null;

  for (const resident of residents) {
    const reasons: string[] = [];
    const residentPgy = getResidentPgyYear(resident, dateKey);
    const residentRotationId = getRotationIdForDate(resident, dateKey);
    const assignedDates = getAssignedDatesForResident(resident.residentId, assignments);
    const slotDates = getAssignedSlotDatesForResident(
      resident.residentId,
      assignments,
      slot
    );
    const alreadyAssignedOnDate = assignedDates.includes(dateKey);
    const currentWeekendCount = countUniqueWeekendBuckets(assignedDates);
    const sameDayAssignments = [
      currentDay?.primaryRosterId,
      currentDay?.backupRosterId,
      currentDay?.buddyRosterId,
    ].filter(Boolean);

    if (sameDayAssignments.includes(resident.residentId)) {
      pushReason(reasons, "Already assigned to another slot on this day.");
    }

    if (slot === "Backup" && currentDay?.primaryRosterId === resident.residentId) {
      pushReason(reasons, "Already assigned to Primary on this day.");
    }

    if (slot === "Buddy") {
      if (resident.residentId === currentDay?.primaryRosterId) {
        pushReason(reasons, "Buddy cannot be the same resident as Primary.");
      }
      if (resident.residentId === currentDay?.backupRosterId) {
        pushReason(reasons, "Buddy cannot be the same resident as Backup.");
      }
    }

    for (const violation of evaluatePgyEligibility({
      resident,
      callType: slot,
      rules,
      effectiveDate: dateKey,
    })) {
      pushReason(reasons, violation.message);
    }

    for (const violation of evaluateSpacingForResident({
      assignedDates: assignedDates.filter((assignedDate) => assignedDate !== dateKey),
      dateKey,
      rules,
    })) {
      if (violation.severity === "error") pushReason(reasons, violation.message);
    }

    for (const violation of evaluateMonthlyLimitForResident({
      assignmentCount: alreadyAssignedOnDate ? assignedDates.length : assignedDates.length + 1,
      rules,
    })) {
      if (violation.severity === "error") pushReason(reasons, violation.message);
    }

    for (const violation of evaluateWeekendLimitForResident({
      dateKey,
      weekendCount:
        alreadyAssignedOnDate
          ? currentWeekendCount
          : currentWeekendCount + (isWeekend ? 1 : 0),
      rules,
    })) {
      if (violation.severity === "error") pushReason(reasons, violation.message);
    }

    for (const violation of evaluateMonthlyLoadTargetForResident({
      residentPgyYear: residentPgy,
      callType: slot,
      projectedCount: alreadyAssignedOnDate ? slotDates.length : slotDates.length + 1,
      rules,
    })) {
      if (violation.severity === "error") pushReason(reasons, violation.message);
    }

    for (const violation of evaluateRotationEligibility({
      rotationIds: residentRotationId ? [residentRotationId] : [],
      callType: slot,
      rules,
      residentPgyYear: residentPgy,
    })) {
      if (violation.severity === "error") {
        pushReason(
          reasons,
          `${getRotationLabelForDate(resident, dateKey)}: ${violation.message}`
        );
      }
    }

    const projectedWeekendDays =
      isWeekend && !alreadyAssignedOnDate
        ? assignedDates.filter((assignedDate) => isWeekendDateKey(assignedDate)).length + 1
        : assignedDates.filter((assignedDate) => isWeekendDateKey(assignedDate)).length;
    const projectedWeekdayDays =
      !isWeekend && !alreadyAssignedOnDate
        ? assignedDates.filter((assignedDate) => !isWeekendDateKey(assignedDate)).length + 1
        : assignedDates.filter((assignedDate) => !isWeekendDateKey(assignedDate)).length;

    for (const violation of evaluateRotationCallLimitForResident({
      rotationIds: residentRotationId ? [residentRotationId] : [],
      isWeekendDate: isWeekend,
      weekendCallDays: projectedWeekendDays,
      weekdayCallDays: projectedWeekdayDays,
      totalCallDays: alreadyAssignedOnDate ? assignedDates.length : assignedDates.length + 1,
      callType: slot,
      rules,
    })) {
      if (violation.severity === "error") {
        pushReason(
          reasons,
          `${getRotationLabelForDate(resident, dateKey)}: ${violation.message}`
        );
      }
    }

    const adjacentResidentId =
      slot === "Primary"
        ? adjacentAssignment?.primaryRosterId ?? null
        : adjacentAssignment?.backupRosterId ?? null;

    for (const violation of evaluateWeekendPairingForResident({
      residentId: resident.residentId,
      adjacentResidentId,
      dateKey,
      callType: slot,
      rules,
    })) {
      if (violation.severity === "error") pushReason(reasons, violation.message);
    }

    if (reasons.length > 0) {
      blocked.push({
        resident: formatResidentLabel(resident, dateKey),
        residentId: resident.residentId,
        reasons,
      });
    } else {
      eligible.push(formatResidentLabel(resident, dateKey));
    }
  }

  return { eligible, blocked };
}

function getBackupReason(params: {
  dateKey: string;
  primaryResident: ResidentOption | null;
  buddyState: BuddyDateState | null;
  slotDefinitions: ProgramCallSlotDefinition[];
  backupEligible: string[];
  generationSlotDebug: GenerationDaySlotDebug | null;
}) {
  const {
    dateKey,
    primaryResident,
    buddyState,
    slotDefinitions,
    backupEligible,
    generationSlotDebug,
  } = params;

  if (!slotDefinitions.some((definition) => definition.callType === "Backup")) {
    return "Slot definition disabled/missing";
  }

  const backupDefs = slotDefinitions.filter(
    (definition) => definition.callType === "Backup"
  );
  if (backupDefs.length === 0) {
    return "Slot definition disabled/missing";
  }

  if (!primaryResident) {
    return "Backup not required because Primary is open";
  }

  const primaryPgy = getResidentPgyYear(primaryResident, dateKey);
  const buddyActive = Boolean(
    buddyState?.isVisible || buddyState?.selectedBuddyRosterId
  );
  if (buddyActive) {
    return "Backup not required because Buddy day is active";
  }

  if (primaryPgy !== 1 && primaryPgy !== 2) {
    return `Backup not required because Primary PGY is ${primaryPgy ?? "unknown"}`;
  }

  if (backupEligible.length === 0) {
    return "Backup required but no eligible residents found";
  }

  if (generationSlotDebug && generationSlotDebug.attempted === false) {
    return "Backup eligible but generator did not attempt assignment";
  }

  return `Backup required because Primary PGY is ${primaryPgy ?? "unknown"} and Buddy is not active`;
}

function getBuddyReason(params: {
  buddyState: BuddyDateState | null;
  buddyRequirementByRosterId: Map<string, BuddyRequirement>;
  primaryResident: ResidentOption | null;
  slotDefinitions: ProgramCallSlotDefinition[];
  generationSlotDebug: GenerationDaySlotDebug | null;
}) {
  const {
    buddyState,
    buddyRequirementByRosterId,
    primaryResident,
    slotDefinitions,
    generationSlotDebug,
  } = params;

  if (!slotDefinitions.some((definition) => definition.callType === "Buddy")) {
    return "Slot definition disabled/missing";
  }

  const buddyDefs = slotDefinitions.filter(
    (definition) => definition.callType === "Buddy"
  );
  if (buddyDefs.length === 0) {
    return "Slot definition disabled/missing";
  }

  if (!buddyState) {
    return "Rule config missing from backend response";
  }

  if (!buddyState.slotEnabled) {
    return "Buddy slot definition disabled/missing.";
  }

  if (!buddyState.isFridayOrSaturday) {
    return "Buddy not required because this is not Friday or Saturday.";
  }

  if (
    generationSlotDebug?.considered &&
    !generationSlotDebug.successful &&
    generationSlotDebug.reason
  ) {
    return generationSlotDebug.reason;
  }

  if (buddyState.eligibleRequirementRosterIds.length === 0) {
    if (buddyState.visibleEligibleRosterIds.length > 0) {
      return "Buddy slot visible for optional PGY-1 coverage, but no resident still needs required Buddy days.";
    }

    return "Buddy not created because no PGY-1 on Gen Ortho/Pager can take this Buddy date.";
  }

  if (buddyState.selectedBuddyRosterId) {
    const selectedRequirement = buddyRequirementByRosterId.get(
      buddyState.selectedBuddyRosterId
    );
    const primaryPgy = primaryResident
      ? getResidentPgyYear(primaryResident, buddyState.dateKey)
      : null;

    if (primaryPgy !== BUDDY_PRIMARY_PARTNER_PGY) {
      return `Buddy assigned but Primary PGY is ${primaryPgy ?? "unknown"} instead of PGY-${BUDDY_PRIMARY_PARTNER_PGY}.`;
    }

    return `Buddy assigned to ${selectedRequirement?.residentName ?? buddyState.selectedBuddyResidentName ?? buddyState.selectedBuddyRosterId} with PGY-${BUDDY_PRIMARY_PARTNER_PGY} Primary partner.`;
  }

  if (generationSlotDebug && generationSlotDebug.attempted === false) {
    return "Buddy eligible but generator did not attempt assignment";
  }

  if (generationSlotDebug?.attempted && !generationSlotDebug.successful) {
    return generationSlotDebug.reason ?? "Buddy required but assignment attempt failed";
  }

  if (!primaryResident) {
    return "Buddy required but no eligible PGY-4 Primary partner was assigned";
  }

  const primaryPgy = getResidentPgyYear(primaryResident, buddyState.dateKey);
  if (primaryPgy !== BUDDY_PRIMARY_PARTNER_PGY) {
    return `Buddy required but Primary PGY is ${primaryPgy ?? "unknown"} instead of PGY-${BUDDY_PRIMARY_PARTNER_PGY}.`;
  }

  return "Buddy required because an eligible PGY-1 still needs Buddy days.";
}

export function debugCallGenerationMonth(params: {
  programId?: string | null;
  year: number;
  month: number;
  residents: ResidentOption[];
  rotations: RotationLike[];
  rules: ProgramRule[];
  slotDefinitions: ProgramCallSlotDefinition[];
  generatedAssignments: GeneratedAssignmentsInput;
}): CallGenerationDebugReport {
  const {
    programId = null,
    year,
    month,
    residents,
    rules,
    slotDefinitions,
    rotations,
  } = params;
  const { assignments, generationDebug } = getAssignmentRecord(
    params.generatedAssignments
  );
  const effectiveRules = getEffectiveRules(rules, { includeDisabled: false });
  const monthDates = getMonthDates(year, month);
  const residentLookup = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );
  const topBlockReasons = new Map<string, number>();

  const slotDefinitionsLoaded = slotDefinitions.map((definition) => ({
    id: definition.id,
    label: definition.label,
    callType: definition.callType,
    requiredMode: definition.requiredMode,
    requiredWhenVisible: definition.requiredWhenVisible !== false,
    daysOfWeek: definition.daysOfWeek ?? null,
    condition: definition.condition ?? null,
  }));

  const activeRulesLoaded = effectiveRules.map((rule) => ({
    id: rule.id,
    name: rule.name,
    type: rule.rule_type,
    isHardRule: rule.is_hard_rule,
    config: rule.config,
  }));

  const residentsByPgy = residents.reduce<Record<string, DebugReportResident[]>>(
    (acc, resident) => {
      const pgy = getResidentPgyYear(resident, toDateKey(year, month, 1));
      const key = pgy ? `PGY-${pgy}` : "Unknown";
      const rotation = getRotationLabelForDate(resident, toDateKey(year, month, 1));
      acc[key] ??= [];
      acc[key].push({
        residentId: resident.residentId,
        name: resident.displayName,
        rosterId: resident.rosterId ?? resident.residentId ?? null,
        membershipId: resident.membershipId ?? null,
        programMembershipId: resident.programMembershipId ?? null,
        pgy,
        rotation,
      });
      return acc;
    },
    {}
  );

  const rotationsByResident = residents.reduce<Record<string, string[]>>(
    (acc, resident) => {
      const residentRotations =
        resident.rotationAssignments?.map((assignment) =>
          getRotationDisplayLabel(assignment)
        ) ?? [];
      const extraRotations = rotations
        .filter((rotation) => {
          const rosterId = rotation.rosterId ?? rotation.roster_id ?? null;
          return rosterId === resident.residentId;
        })
        .map((rotation) => getRotationDisplayLabel(rotation));
      acc[resident.displayName] = Array.from(
        new Set([...residentRotations, ...extraRotations].filter(Boolean))
      );
      return acc;
    },
    {}
  );
  const buddyRequirements = getBuddyRequirementsForMonth({
    year,
    month,
    residents,
    rotations,
    rules: effectiveRules,
    slotDefinitions,
    assignments,
  });
  const buddyRequirementByRosterId = new Map(
    buddyRequirements.map((requirement) => [requirement.pgy1RosterId, requirement])
  );
  const buddyPass: DebugReportBuddyPass = {
    pgy1ResidentsDetected: buddyRequirements.map((requirement) => ({
      residentId: requirement.pgy1RosterId,
      residentName: requirement.residentName,
      requiredBuddyDays: requirement.requiredBuddyDays,
      maxBuddyDays: requirement.maxBuddyDays,
      assignedBuddyDays: requirement.assignedDates.length,
      remainingNeeded: requirement.remainingNeeded,
      remainingCapacity: requirement.remainingCapacity,
      reason: requirement.reason,
    })),
    availableBuddySlotCount:
      generationDebug?.buddyPass?.visibleBuddySlotCount ??
      new Set(
        buddyRequirements.flatMap((requirement) => requirement.eligibleDates)
      ).size,
    attemptedAssignments: generationDebug?.buddyPass?.attemptedAssignments ?? 0,
    skippedAssignments:
      generationDebug?.buddyPass?.skippedAssignments?.map((entry) => ({
        residentId: entry.residentId,
        residentName: entry.residentName,
        phase: entry.phase ?? "optional",
        dateKey: entry.dateKey,
        reason: entry.reason,
      })) ?? [],
    finalBuddyCounts:
      generationDebug?.buddyPass?.finalBuddyCounts?.map((entry) => ({
        residentId: entry.residentId,
        residentName: entry.residentName,
        assignedBuddyDays: entry.assignedBuddyDays,
        requiredBuddyDays: entry.requiredBuddyDays,
        maxBuddyDays: entry.maxBuddyDays,
      })) ??
      buddyRequirements.map((requirement) => ({
        residentId: requirement.pgy1RosterId,
        residentName: requirement.residentName,
        assignedBuddyDays: requirement.assignedDates.length,
        requiredBuddyDays: requirement.requiredBuddyDays,
        maxBuddyDays: requirement.maxBuddyDays,
      })),
    loopExitReasons: generationDebug?.buddyPass?.loopExitReasons ?? [],
  };
  const buddySlotDefinitions = slotDefinitions.filter(
    (definition) => definition.callType === "Buddy"
  );
  const buddyDateStateByDate = new Map(
    getBuddyDateStatesForMonth({
      year,
      month,
      residents,
      rotations,
      rules: effectiveRules,
      slotDefinitions,
      assignments,
    }).map((state) => [state.dateKey, state])
  );

  let requiredPrimary = 0;
  let filledPrimary = 0;
  let requiredBackup = 0;
  let filledBackup = 0;
  let requiredBuddy = 0;
  let filledBuddy = 0;

  const days: DebugReportDay[] = monthDates.map(({ key: dateKey, date }) => {
    const assignment = assignments[dateKey];
    const dayOfWeek = date.getDay();
    const assignedCallTypeKeys = new Set<string>();
    if (assignment?.primaryRosterId) assignedCallTypeKeys.add("primary");
    if (assignment?.backupRosterId) assignedCallTypeKeys.add("backup");
    if (assignment?.buddyRosterId) assignedCallTypeKeys.add("buddy");

    const primaryResident = assignment?.primaryRosterId
      ? residentLookup.get(assignment.primaryRosterId) ?? null
      : null;
    const primaryPgy = primaryResident
      ? getResidentPgyYear(primaryResident, dateKey)
      : null;
    const buddyDateState = buddyDateStateByDate.get(dateKey) ?? null;

    const visibleSlotDefs = getVisibleCallSlotsForDay({
      dayOfWeek,
      primaryCallPgyYear: primaryPgy,
      assignedCallTypeKeys,
      slotDefinitions,
      buddyDateState,
    });
    const requiredSlotsFromDefinitions = visibleSlotDefs
      .filter((definition) => definition.requiredWhenVisible !== false)
      .map((definition) => definition.callType as Slot);
    const visibleSlots = visibleSlotDefs.map(
      (definition) => definition.callType as Slot
    );

    const backupDefs = slotDefinitions.filter(
      (definition) => definition.callType === "Backup"
    );
    const buddyDefs = slotDefinitions.filter(
      (definition) => definition.callType === "Buddy"
    );

    const backupRequired =
      !buddyDateState?.isVisible &&
      !assignment?.buddyRosterId &&
      backupDefs.some((definition) =>
        getSlotStatusForDay({
          def: definition,
          dayOfWeek,
          primaryPgyYear: primaryPgy,
          hasAssignment: Boolean(assignment?.backupRosterId),
        }).isRequired
      );
    const buddyRequired = buddyDefs.some((definition) =>
      getSlotStatusForDay({
        def: definition,
        dayOfWeek,
        primaryPgyYear: primaryPgy,
        hasAssignment: Boolean(assignment?.buddyRosterId),
        buddyDateState,
      }).isRequired
    );

    const primaryPool = buildEligiblePoolForSlot({
      slot: "Primary",
      dateKey,
      dayOfWeek,
      assignments,
      residents,
      rules: effectiveRules,
    });
    const backupPool = buildEligiblePoolForSlot({
      slot: "Backup",
      dateKey,
      dayOfWeek,
      assignments,
      residents,
      rules: effectiveRules,
    });
    const buddyPool = buildEligiblePoolForSlot({
      slot: "Buddy",
      dateKey,
      dayOfWeek,
      assignments,
      residents,
      rules: effectiveRules,
    });

    const generationDayDebug = generationDebug?.daySlotOutcomes?.[dateKey] ?? null;
    const backupReason = getBackupReason({
      dateKey,
      primaryResident,
      buddyState: buddyDateState,
      slotDefinitions,
      backupEligible: backupPool.eligible,
      generationSlotDebug: generationDayDebug?.Backup ?? null,
    });
    const buddyReason = getBuddyReason({
      buddyState: buddyDateState,
      buddyRequirementByRosterId,
      primaryResident,
      slotDefinitions,
      generationSlotDebug: generationDayDebug?.Buddy ?? null,
    });

    pushReason(
      [],
      assignment?.primaryRosterId ? null : "Primary open"
    );
    topBlockReasons.set(
      backupReason,
      (topBlockReasons.get(backupReason) ?? 0) + (backupRequired && !assignment?.backupRosterId ? 1 : 0)
    );
    topBlockReasons.set(
      buddyReason,
      (topBlockReasons.get(buddyReason) ?? 0) + (!assignment?.buddyRosterId && visibleSlots.includes("Buddy") ? 1 : 0)
    );

    if (requiredSlotsFromDefinitions.includes("Primary")) requiredPrimary += 1;
    if (assignment?.primaryRosterId) filledPrimary += 1;
    if (backupRequired) requiredBackup += 1;
    if (assignment?.backupRosterId) filledBackup += 1;
    if (buddyRequired) requiredBuddy += 1;
    if (assignment?.buddyRosterId) filledBuddy += 1;

    return {
      date: dateKey,
      dayOfWeek: date.toLocaleDateString("en-US", { weekday: "long" }),
      requiredSlotsFromDefinitions,
      visibleSlots,
      existingAssignments: {
        Primary: assignment?.primaryRosterId
          ? residentLookup.get(assignment.primaryRosterId)?.displayName ?? assignment.primaryRosterId
          : null,
        Backup: assignment?.backupRosterId
          ? residentLookup.get(assignment.backupRosterId)?.displayName ?? assignment.backupRosterId
          : null,
        Buddy: assignment?.buddyRosterId
          ? residentLookup.get(assignment.buddyRosterId)?.displayName ?? assignment.buddyRosterId
          : null,
      },
      primaryResident: primaryResident?.displayName ?? null,
      primaryResidentPgy: primaryPgy,
      eligibleBuddyRequirements: (buddyDateState?.eligibleRequirementRosterIds ?? [])
        .map((rosterId) => {
          const requirement = buddyRequirementByRosterId.get(rosterId);
          return requirement
            ? {
                residentName: requirement.residentName,
                remainingNeededBeforeDate:
                  buddyDateState?.remainingNeededByResidentBefore[rosterId] ?? 0,
                eligibleDates: requirement.eligibleDates,
                assignedDates: requirement.assignedDates,
              }
            : null;
        })
        .filter(
          (
            value
          ): value is DebugReportDay["eligibleBuddyRequirements"][number] =>
            Boolean(value)
        ),
      assignedBuddyResident: buddyDateState?.selectedBuddyResidentName ?? null,
      assignedPrimaryPartner: primaryResident?.displayName ?? null,
      backupRequired,
      backupReason,
      buddyRequired,
      buddyReason,
      eligibleResidentsBySlot: {
        Primary: primaryPool.eligible,
        Backup: backupPool.eligible,
        Buddy: buddyPool.eligible,
      },
      blockedResidentsBySlot: {
        Primary: primaryPool.blocked,
        Backup: backupPool.blocked,
        Buddy: buddyPool.blocked,
      },
      finalStatus: {
        Primary: requiredSlotsFromDefinitions.includes("Primary")
          ? assignment?.primaryRosterId
            ? "filled"
            : "open"
          : "not-required",
        Backup: backupRequired
          ? assignment?.backupRosterId
            ? "filled"
            : "open"
          : "not-required",
        Buddy: buddyRequired
          ? assignment?.buddyRosterId
            ? "filled"
            : "open"
          : "not-required",
      },
    };
  });

  const buddySlotFillAuditRows: BuddySlotFillAuditRow[] = monthDates.map(
    ({ key: dateKey }) => {
      const assignment = assignments[dateKey];
      const buddyDateState = buddyDateStateByDate.get(dateKey) ?? null;
      const buddyDefinition = buddySlotDefinitions[0] ?? null;
      const generationDayDebug = generationDebug?.daySlotOutcomes?.[dateKey] ?? null;
      const buddySlotDebug = generationDayDebug?.Buddy ?? null;
      const buddyPool = buildEligiblePoolForSlot({
        slot: "Buddy",
        dateKey,
        dayOfWeek: new Date(`${dateKey}T00:00:00`).getDay(),
        assignments,
        residents,
        rules: effectiveRules,
      });
      const visible = Boolean(buddyDateState?.isVisible || assignment?.buddyRosterId);

      return {
        date: dateKey,
        slotId: buddyDefinition?.id ?? null,
        slotKey: "Buddy",
        visibility: !visible
          ? "hidden"
          : buddyDateState?.isRequired
          ? "required"
          : "optional",
        generatorAttemptedAssignment: buddySlotDebug?.attempted ?? false,
        generatorAssignmentSuccessful: buddySlotDebug?.successful ?? false,
        eligiblePgy1Candidates: buddyPool.eligible,
        candidateAudit: buildBuddyCandidateAudit(residents, dateKey, buddyPool),
        rejectedPgy1Candidates: buddyPool.blocked.map((resident) => ({
          resident: resident.resident,
          reasons: resident.reasons,
        })),
        selectedResident: assignment?.buddyRosterId
          ? residentLookup.get(assignment.buddyRosterId)?.displayName ??
            assignment.buddyRosterId
          : null,
        finalPersistedBuddyRosterId: assignment?.buddyRosterId ?? null,
        dynamicSlotAssignmentValue: null,
        reviewModalWillRender: visible
          ? `Bud: ${
              assignment?.buddyRosterId
                ? residentLookup.get(assignment.buddyRosterId)?.displayName ??
                  assignment.buddyRosterId
                : "Open"
            }`
          : "Hidden",
        reason:
          buddySlotDebug?.reason ??
          buddyDateState?.reason ??
          "Buddy slot hidden.",
      };
    }
  );
  const visibleBuddySlotFillAudit = buddySlotFillAuditRows.filter(
    (row) => row.visibility !== "hidden" || row.finalPersistedBuddyRosterId !== null
  );

  const summary = {
    requiredPrimary,
    filledPrimary,
    requiredBackup,
    filledBackup,
    requiredBuddy,
    filledBuddy,
    openRequiredSlots:
      (requiredPrimary - filledPrimary) +
      (requiredBackup - filledBackup) +
      (requiredBuddy - filledBuddy),
    topBlockReasons: Array.from(topBlockReasons.entries())
      .map(([reason, count]) => ({ reason, count }))
      .filter((entry) => entry.count > 0)
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
  };

  const report: CallGenerationDebugReport = {
    month: `${year}-${String(month).padStart(2, "0")}`,
    programId,
    slotDefinitionsLoaded,
    activeRulesLoaded,
    residentsByPgy,
    rotationsByResident,
    buddyRequirements,
    buddyPass,
    phaseTimings: generationDebug?.phaseTimings ?? [],
    buddySlotFillAudit: {
      generatorPass: visibleBuddySlotFillAudit,
      finalDraftPass: visibleBuddySlotFillAudit,
    },
    days,
    summary,
    generatorDebug: generationDebug,
  };

  if (process.env.NODE_ENV !== "production") {
    console.table(
      slotDefinitionsLoaded.map((definition) => ({
        id: definition.id,
        callType: definition.callType,
        requiredMode: definition.requiredMode,
        requiredWhenVisible: definition.requiredWhenVisible,
        condition: definition.condition
          ? JSON.stringify(definition.condition)
          : "none",
      }))
    );
    console.table(
      activeRulesLoaded.map((rule) => ({
        id: rule.id,
        type: rule.type,
        name: rule.name,
        isHardRule: rule.isHardRule,
      }))
    );
    console.table(
      residents.map((resident) => ({
        resident: resident.displayName,
        roster_id: resident.residentId,
        membership_id: resident.programMembershipId ?? resident.membershipId ?? null,
        pgy: getResidentPgyYear(resident, toDateKey(year, month, 1)),
        rotation: getRotationLabelForDate(resident, toDateKey(year, month, 1)),
      }))
    );
    console.table(
      buddyPass.pgy1ResidentsDetected.map((resident) => ({
        resident: resident.residentName,
        requiredBuddyDays: resident.requiredBuddyDays,
        maxBuddyDays: resident.maxBuddyDays,
        assignedBuddyDays: resident.assignedBuddyDays,
        remainingNeeded: resident.remainingNeeded,
        remainingCapacity: resident.remainingCapacity,
        reason: resident.reason,
      }))
    );
    console.table(
      days
        .filter(
          (day) =>
            day.finalStatus.Backup === "open" || day.finalStatus.Buddy === "open"
        )
        .map((day) => ({
          date: day.date,
          backup: day.finalStatus.Backup,
          backupReason: day.backupReason,
          buddy: day.finalStatus.Buddy,
          buddyReason: day.buddyReason,
        }))
    );
    console.table(
      days
        .flatMap((day) =>
          day.blockedResidentsBySlot.Backup
            .filter((resident) => resident.resident.includes("(PGY-5)"))
            .map((resident) => ({
              date: day.date,
              resident: resident.resident,
              reasons: resident.reasons.join(" | "),
            }))
        )
    );
    console.table(
      buddyPass.skippedAssignments.map((entry) => ({
        resident: entry.residentName,
        phase: entry.phase,
        date: entry.dateKey ?? "(none)",
        reason: entry.reason,
      }))
    );
    console.table(
      (generationDebug?.phaseTimings ?? []).map((entry) => ({
        phase: entry.phase,
        durationMs: entry.durationMs,
        details: entry.details ?? "",
      }))
    );
    console.table(
      buddyPass.loopExitReasons.map((entry) => ({
        phase: entry.phase,
        iterations: entry.iterations,
        reason: entry.reason,
      }))
    );
    console.table(
      visibleBuddySlotFillAudit.map((entry) => ({
        date: entry.date,
        visibility: entry.visibility,
        attempted: entry.generatorAttemptedAssignment,
        successful: entry.generatorAssignmentSuccessful,
        selectedResident: entry.selectedResident ?? "(open)",
        persistedBuddyRosterId: entry.finalPersistedBuddyRosterId ?? "(null)",
        dynamicSlotAssignmentValue: entry.dynamicSlotAssignmentValue ?? "(null)",
        reviewModalWillRender: entry.reviewModalWillRender,
        reason: entry.reason,
      }))
    );
    console.table(
      visibleBuddySlotFillAudit.flatMap((entry) =>
        entry.candidateAudit.map((candidate) => ({
          date: entry.date,
          resident: candidate.residentName,
          gradYear: candidate.gradYear,
          computedPgyOnDate: candidate.computedPgyOnDate,
          statusOnDate: candidate.statusOnDate,
          activeOnDate: candidate.activeOnDate,
          rotationOnDate: candidate.rotationOnDate ?? "No rotation listed",
          eligibleForBuddy: candidate.eligibleForBuddy,
          exclusionReason: candidate.exclusionReason ?? "",
        }))
      )
    );
  }

  return report;
}
