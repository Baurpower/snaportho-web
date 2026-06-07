import type {
  AssignmentFlag,
  CallType,
  DraftDayAssignment,
  ProgramRule,
  ResidentAvailabilityForDate,
  ResidentAvailabilityMap,
  ResidentOption,
  RuleEvaluationBlock,
} from "@/components/workspace/call/programcalltypes";
import {
  countUniqueWeekendBuckets,
  evaluateDayOfWeekPreferenceForResident,
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
  getWeekendBucket,
  isWeekendDateKey,
} from "@/lib/workspace/call/rule-evaluator";

type EvaluateResidentForSlotParams = {
  resident: ResidentOption;
  slot: CallType;
  dateKey: string;
  assignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  availabilityByResident: ResidentAvailabilityMap;
};

export type EvaluatedResidentSlot = {
  allowed: boolean;
  blocked: boolean;
  warning: boolean;
  flags: AssignmentFlag[];
  blocks: RuleEvaluationBlock[];
  warnings: RuleEvaluationBlock[];
  availability: ResidentAvailabilityForDate | null;
};

function getAssignedDatesForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
) {
  return Object.entries(assignments)
    .filter(
      ([, assignment]) =>
        assignment?.primaryRosterId === residentId ||
        assignment?.backupRosterId === residentId
    )
    .map(([dateKey]) => dateKey)
    .sort();
}

function countPrimaryAssignmentsForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
): number {
  return Object.values(assignments).filter(
    (a) => a?.primaryRosterId === residentId
  ).length;
}

function countBackupAssignmentsForResident(
  residentId: string,
  assignments: Record<string, DraftDayAssignment>
): number {
  return Object.values(assignments).filter(
    (a) => a?.backupRosterId === residentId
  ).length;
}

function getAvailabilityDay(
  availabilityByResident: ResidentAvailabilityMap,
  residentId: string,
  dateKey: string
): ResidentAvailabilityForDate | null {
  return availabilityByResident?.[residentId]?.[dateKey] ?? null;
}

function getAvailabilityBlocks(
  availability: ResidentAvailabilityForDate | null
) {
  if (!availability) return [] as RuleEvaluationBlock[];

  if (Array.isArray(availability.blocks) && availability.blocks.length > 0) {
    return availability.blocks;
  }

  if (Array.isArray(availability.ruleBlocks)) {
    return availability.ruleBlocks.filter((block) => block.isHardRule);
  }

  return [] as RuleEvaluationBlock[];
}

function getAvailabilityWarnings(
  availability: ResidentAvailabilityForDate | null
) {
  if (!availability) return [] as RuleEvaluationBlock[];

  if (Array.isArray(availability.warnings) && availability.warnings.length > 0) {
    return availability.warnings;
  }

  if (Array.isArray(availability.ruleBlocks)) {
    return availability.ruleBlocks.filter((block) => !block.isHardRule);
  }

  return [] as RuleEvaluationBlock[];
}

function pushFlag(flags: AssignmentFlag[], next: AssignmentFlag) {
  if (!flags.some((flag) => flag.key === next.key)) {
    flags.push(next);
  }
}

function pushBlock(blocks: RuleEvaluationBlock[], next: RuleEvaluationBlock) {
  if (
    !blocks.some(
      (block) =>
        block.ruleId === next.ruleId &&
        block.ruleType === next.ruleType &&
        block.message === next.message
    )
  ) {
    blocks.push(next);
  }
}

function addRuleResult(params: {
  rule: ProgramRule;
  block: RuleEvaluationBlock;
  flags: AssignmentFlag[];
  blocks: RuleEvaluationBlock[];
  warnings: RuleEvaluationBlock[];
  setBlocked: () => void;
  setWarning: () => void;
  flag: AssignmentFlag;
}) {
  const { rule, block, flags, blocks, warnings, setBlocked, setWarning, flag } =
    params;

  if (rule.is_hard_rule) {
    setBlocked();
    pushBlock(blocks, block);
  } else {
    setWarning();
    pushBlock(warnings, block);
  }

  pushFlag(flags, flag);
}

export function evaluateResidentForSlot(
  params: EvaluateResidentForSlotParams
): EvaluatedResidentSlot {
  const { resident, slot, dateKey, assignments, rules, availabilityByResident } =
    params;

  const residentId = resident.residentId;
  const assignedDates = getAssignedDatesForResident(residentId, assignments);
  const availability = getAvailabilityDay(
    availabilityByResident,
    residentId,
    dateKey
  );

  const flags: AssignmentFlag[] = [];
  const blocks: RuleEvaluationBlock[] = [];
  const warnings: RuleEvaluationBlock[] = [];

  let blocked = false;
  let warning = false;

  if (availability) {
    for (const flag of availability.flags ?? []) {
      pushFlag(flags, flag);
    }

    for (const block of getAvailabilityBlocks(availability)) {
      pushBlock(blocks, block);
    }

    for (const item of getAvailabilityWarnings(availability)) {
      pushBlock(warnings, item);
    }

    if (availability.isBlocked) blocked = true;
    if (availability.isWarning) warning = true;
  }

  const alreadyAssignedOnDate = assignedDates.includes(dateKey);
  const currentWeekendBucket = getWeekendBucket(dateKey);
  const alreadyAssignedInWeekendBucket =
    currentWeekendBucket !== null &&
    assignedDates.some(
      (assignedDate) => getWeekendBucket(assignedDate) === currentWeekendBucket
    );
  const assignedWeekendCount = countUniqueWeekendBuckets(assignedDates);
  const adjacentDateKey = getAdjacentWeekendDateKey(dateKey);
  const adjacentAssignment = adjacentDateKey ? assignments[adjacentDateKey] : null;
  const adjacentResidentId =
    slot === "Primary"
      ? adjacentAssignment?.primaryRosterId ?? null
      : adjacentAssignment?.backupRosterId ?? null;

  for (const violation of evaluatePgyEligibility({
    resident,
    callType: slot,
    rules,
    effectiveDate: dateKey,
  })) {
    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: violation.message,
        isHardRule: violation.severity === "error",
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-${slot}-pgy`,
        label: "PGY Restriction",
        tone: violation.severity === "error" ? "rose" : "amber",
        description: violation.message,
        category: "rule",
      },
    });
  }

  for (const violation of evaluateSpacingForResident({
    assignedDates: assignedDates.filter((assignedDate) => assignedDate !== dateKey),
    dateKey,
    rules,
  })) {
    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: violation.message,
        isHardRule: violation.severity === "error",
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-spacing`,
        label: "Spacing",
        tone: violation.severity === "error" ? "rose" : "amber",
        description: violation.message,
        category: "rule",
      },
    });
  }

  const projectedMonthCount = alreadyAssignedOnDate
    ? assignedDates.length
    : assignedDates.length + 1;
  for (const violation of evaluateMonthlyLimitForResident({
    assignmentCount: projectedMonthCount,
    rules,
  })) {
    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: violation.message,
        isHardRule: violation.severity === "error",
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-month-limit`,
        label: "Month Limit",
        tone: violation.severity === "error" ? "rose" : "amber",
        description: violation.message,
        category: "rule",
      },
    });
  }

  const projectedWeekendCount = alreadyAssignedInWeekendBucket
    ? assignedWeekendCount
    : assignedWeekendCount + (currentWeekendBucket ? 1 : 0);
  for (const violation of evaluateWeekendLimitForResident({
    dateKey,
    weekendCount: projectedWeekendCount,
    rules,
  })) {
    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: violation.message,
        isHardRule: violation.severity === "error",
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-weekend-limit`,
        label: "Weekend Limit",
        tone: violation.severity === "error" ? "rose" : "amber",
        description: violation.message,
        category: "rule",
      },
    });
  }

  const residentPgyYear = getResidentPgyYear(resident, dateKey);
  const rotationConflictIds =
    availability?.rotationConflicts.map((conflict) => conflict.rotationId) ?? [];

  const rotationViolations = evaluateRotationEligibility({
    rotationIds: rotationConflictIds,
    callType: slot,
    rules,
    residentPgyYear,
  });
  for (const violation of rotationViolations) {
    const matchingRotation =
      availability?.rotationConflicts.find((conflict) =>
        (violation.metadata?.blockedRotationIds as string[] | undefined)?.includes(
          conflict.rotationId ?? ""
        )
      ) ?? availability?.rotationConflicts[0];

    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: matchingRotation
          ? `Blocked by rotation: ${matchingRotation.rotationName}`
          : violation.message,
        isHardRule: violation.severity === "error",
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-${slot}-rotation`,
        label: "Rotation Restriction",
        tone: violation.severity === "error" ? "rose" : "amber",
        description: matchingRotation?.rotationName ?? violation.message,
        category: "rotation",
      },
    });
  }

  // Per-rotation call-day limit (e.g. "Oncology residents get at most 1 weekend Primary/month").
  // Only runs when the resident is on a rotation on this date.
  if (rotationConflictIds.length > 0) {
    const isWeekend = isWeekendDateKey(dateKey);
    const weekendDates = assignedDates.filter((d) => isWeekendDateKey(d));
    const weekdayDates = assignedDates.filter((d) => !isWeekendDateKey(d));

    // Projected counts include the tentative new assignment.
    const projectedWeekendDays =
      isWeekend && !alreadyAssignedOnDate
        ? weekendDates.length + 1
        : weekendDates.length;
    const projectedWeekdayDays =
      !isWeekend && !alreadyAssignedOnDate
        ? weekdayDates.length + 1
        : weekdayDates.length;
    const projectedTotalDays = alreadyAssignedOnDate
      ? assignedDates.length
      : assignedDates.length + 1;

    for (const violation of evaluateRotationCallLimitForResident({
      rotationIds: rotationConflictIds,
      isWeekendDate: isWeekend,
      weekendCallDays: projectedWeekendDays,
      weekdayCallDays: projectedWeekdayDays,
      totalCallDays: projectedTotalDays,
      callType: slot,
      rules,
    })) {
      const matchedIds = (
        violation.metadata?.matchedRotationIds as string[] | undefined
      ) ?? [];
      const matchingRotation = availability?.rotationConflicts.find(
        (c) => c.rotationId && matchedIds.includes(c.rotationId)
      );

      addRuleResult({
        rule: violation.rule,
        block: {
          ruleId: violation.rule.id,
          ruleType: violation.rule.rule_type,
          ruleName: violation.rule.name,
          message: matchingRotation
            ? `${matchingRotation.rotationName}: ${violation.message}`
            : violation.message,
          isHardRule: violation.severity === "error",
        },
        flags,
        blocks,
        warnings,
        setBlocked: () => {
          blocked = true;
        },
        setWarning: () => {
          warning = true;
        },
        flag: {
          key: `rule-${violation.rule.id}-${dateKey}-${slot}-rotation-call-limit`,
          label: "Rotation Call Limit",
          tone: violation.severity === "error" ? "rose" : "amber",
          description: matchingRotation
            ? `${matchingRotation.rotationName}: ${violation.message}`
            : violation.message,
          category: "rule",
        },
      });
    }
  }

  for (const violation of evaluateWeekendPairingForResident({
    residentId,
    adjacentResidentId,
    dateKey,
    callType: slot,
    rules,
  })) {
    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: violation.message,
        isHardRule: violation.severity === "error",
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-weekend-pairing-${slot}`,
        label: "Weekend Pairing",
        tone: violation.severity === "error" ? "rose" : "amber",
        description: violation.message,
        category: "rule",
      },
    });
  }

  // Monthly load target by PGY — per-PGY hard/soft max per slot type.
  if (slot === "Primary" || slot === "Backup" || slot === "Buddy") {
    const currentSlotCount =
      slot === "Primary"
        ? countPrimaryAssignmentsForResident(residentId, assignments)
        : slot === "Backup"
        ? countBackupAssignmentsForResident(residentId, assignments)
        : 0;
    const projectedSlotCount = alreadyAssignedOnDate ? currentSlotCount : currentSlotCount + 1;

    for (const violation of evaluateMonthlyLoadTargetForResident({
      residentPgyYear,
      callType: slot,
      projectedCount: projectedSlotCount,
      rules,
    })) {
      addRuleResult({
        rule: violation.rule,
        block: {
          ruleId: violation.rule.id,
          ruleType: violation.rule.rule_type,
          ruleName: violation.rule.name,
          message: violation.message,
          isHardRule: violation.severity === "error",
        },
        flags,
        blocks,
        warnings,
        setBlocked: () => {
          blocked = true;
        },
        setWarning: () => {
          warning = true;
        },
        flag: {
          key: `rule-${violation.rule.id}-${dateKey}-${slot}-load-target`,
          label: "Monthly Load Target",
          tone: violation.severity === "error" ? "rose" : "amber",
          description: violation.message,
          category: "rule",
        },
      });
    }
  }

  // Day-of-week preference — soft rule (always warning, never block).
  for (const violation of evaluateDayOfWeekPreferenceForResident({
    dateKey,
    callType: slot,
    rotationIds: rotationConflictIds,
    residentPgyYear,
    rules,
  })) {
    addRuleResult({
      rule: violation.rule,
      block: {
        ruleId: violation.rule.id,
        ruleType: violation.rule.rule_type,
        ruleName: violation.rule.name,
        message: violation.message,
        isHardRule: false,
      },
      flags,
      blocks,
      warnings,
      setBlocked: () => {
        blocked = true;
      },
      setWarning: () => {
        warning = true;
      },
      flag: {
        key: `rule-${violation.rule.id}-${dateKey}-${slot}-dow-pref`,
        label: "Day Preference",
        tone: "amber",
        description: violation.message,
        category: "rule",
      },
    });
  }

  return {
    allowed: !blocked,
    blocked,
    warning,
    flags,
    blocks,
    warnings,
    availability,
  };
}

export function getFlagsForAssignedResident(
  params: EvaluateResidentForSlotParams
) {
  return evaluateResidentForSlot(params).flags;
}

export function isResidentAllowedForSlot(
  params: EvaluateResidentForSlotParams
) {
  return evaluateResidentForSlot(params).allowed;
}
