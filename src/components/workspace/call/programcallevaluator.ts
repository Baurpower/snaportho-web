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
  evaluateMonthlyLimitForResident,
  evaluatePgyEligibility,
  evaluateRotationEligibility,
  evaluateSpacingForResident,
  evaluateWeekendLimitForResident,
  evaluateWeekendPairingForResident,
  getAdjacentWeekendDateKey,
  getWeekendBucket,
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
        assignment?.primaryMembershipId === residentId ||
        assignment?.backupMembershipId === residentId
    )
    .map(([dateKey]) => dateKey)
    .sort();
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
      ? adjacentAssignment?.primaryMembershipId ?? null
      : adjacentAssignment?.backupMembershipId ?? null;

  for (const violation of evaluatePgyEligibility({
    resident,
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

  const rotationViolations = evaluateRotationEligibility({
    rotationIds: availability?.rotationConflicts.map((conflict) => conflict.rotationId) ?? [],
    callType: slot,
    rules,
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
