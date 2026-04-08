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

function getDateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function toDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getDateDiffInDays(a: string, b: string) {
  const aDate = getDateFromKey(a);
  const bDate = getDateFromKey(b);
  const diffMs = Math.abs(aDate.getTime() - bDate.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

function isWeekend(dateKey: string) {
  const day = getDateFromKey(dateKey).getDay();
  return day === 0 || day === 6;
}

function isAdjacentWeekendPair(a: string, b: string) {
  const dateA = getDateFromKey(a);
  const dateB = getDateFromKey(b);

  const diff =
    Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);

  if (diff !== 1) return false;

  const dayA = dateA.getDay();
  const dayB = dateB.getDay();

  return (dayA === 6 && dayB === 0) || (dayA === 0 && dayB === 6);
}

function getWeekendBucket(dateKey: string): string | null {
  const date = getDateFromKey(dateKey);
  const day = date.getDay();

  if (day === 6) {
    return dateKey;
  }

  if (day === 0) {
    const saturday = new Date(date);
    saturday.setDate(saturday.getDate() - 1);
    return toDateKey(saturday);
  }

  return null;
}

function countUniqueWeekendBuckets(dateKeys: string[]) {
  const buckets = new Set<string>();

  for (const dateKey of dateKeys) {
    const bucket = getWeekendBucket(dateKey);
    if (bucket) buckets.add(bucket);
  }

  return buckets.size;
}

function getResidentYearValue(resident: ResidentOption) {
  if (typeof resident.pgyYear === "number") return resident.pgyYear;

  const match = resident.trainingLevel?.match(/(\d+)/);
  if (match) return Number(match[1]);

  return null;
}

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

  const residentId = resident.membershipId;
  const residentYear = getResidentYearValue(resident);
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

    for (const block of availability.blocks ?? []) {
      pushBlock(blocks, block);
    }

    for (const item of availability.warnings ?? []) {
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

  for (const rule of rules) {
    if (!rule.is_enabled) continue;

    const config = rule.config ?? {};

    if (rule.rule_type === "restrict_call_type_by_pgy") {
      const restrictedYears = config.restrictedPgyYears ?? [];
      const allowedCallTypes = config.allowedCallTypes ?? [];

      const isRestrictedYear =
        typeof residentYear === "number" &&
        restrictedYears.includes(residentYear);

      if (isRestrictedYear) {
        const allowsNoCall = allowedCallTypes.length === 0;
        const slotAllowed = allowedCallTypes.includes(slot);
        const violatesPgyRule = allowsNoCall || !slotAllowed;

        if (violatesPgyRule) {
          const message = allowsNoCall
            ? `PGY-${residentYear} is not allowed to take call`
            : `PGY-${residentYear} cannot take ${slot} call`;

          const nextBlock: RuleEvaluationBlock = {
            ruleId: rule.id,
            ruleType: rule.rule_type,
            ruleName: rule.name,
            message,
            isHardRule: rule.is_hard_rule,
          };

          addRuleResult({
            rule,
            block: nextBlock,
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
              key: `rule-${rule.id}-${dateKey}-${slot}-pgy`,
              label: "PGY Restriction",
              tone: rule.is_hard_rule ? "rose" : "amber",
              description: message,
              category: "rule",
            },
          });
        }
      }
    }

    if (rule.rule_type === "min_days_between_assignments") {
      const minDays = Math.max(1, config.minDays ?? 2);
      const excludeAdjacentWeekendPairing =
        config.excludeAdjacentWeekendPairing ?? true;

      const violatesSpacing = assignedDates.some((otherDate) => {
        if (otherDate === dateKey) return false;

        if (
          excludeAdjacentWeekendPairing &&
          isAdjacentWeekendPair(otherDate, dateKey)
        ) {
          return false;
        }

        return getDateDiffInDays(otherDate, dateKey) <= minDays;
      });

      if (violatesSpacing) {
        const message = excludeAdjacentWeekendPairing
          ? `Violates minimum spacing (${minDays} days, ignoring paired Sat/Sun)`
          : `Violates minimum spacing (${minDays} days)`;

        const nextBlock: RuleEvaluationBlock = {
          ruleId: rule.id,
          ruleType: rule.rule_type,
          ruleName: rule.name,
          message,
          isHardRule: rule.is_hard_rule,
        };

        addRuleResult({
          rule,
          block: nextBlock,
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
            key: `rule-${rule.id}-${dateKey}-spacing`,
            label: "Spacing",
            tone: rule.is_hard_rule ? "rose" : "amber",
            description: message,
            category: "rule",
          },
        });
      }
    }

    if (rule.rule_type === "max_calls_per_month") {
      const maxCalls = config.maxCalls;

      if (typeof maxCalls === "number") {
        const wouldExceed = alreadyAssignedOnDate
          ? assignedDates.length > maxCalls
          : assignedDates.length >= maxCalls;

        if (wouldExceed) {
          const message = `Monthly call limit reached (${assignedDates.length}/${maxCalls})`;

          const nextBlock: RuleEvaluationBlock = {
            ruleId: rule.id,
            ruleType: rule.rule_type,
            ruleName: rule.name,
            message,
            isHardRule: rule.is_hard_rule,
          };

          addRuleResult({
            rule,
            block: nextBlock,
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
              key: `rule-${rule.id}-${dateKey}-month-limit`,
              label: "Month Limit",
              tone: rule.is_hard_rule ? "rose" : "amber",
              description: message,
              category: "rule",
            },
          });
        }
      }
    }

    if (rule.rule_type === "max_weekends_per_month" && isWeekend(dateKey)) {
      const maxWeekends = config.maxWeekends;

      if (typeof maxWeekends === "number") {
        const wouldExceed = alreadyAssignedInWeekendBucket
          ? assignedWeekendCount > maxWeekends
          : assignedWeekendCount >= maxWeekends;

        if (wouldExceed) {
          const message = `Weekend limit reached (${assignedWeekendCount}/${maxWeekends})`;

          const nextBlock: RuleEvaluationBlock = {
            ruleId: rule.id,
            ruleType: rule.rule_type,
            ruleName: rule.name,
            message,
            isHardRule: rule.is_hard_rule,
          };

          addRuleResult({
            rule,
            block: nextBlock,
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
              key: `rule-${rule.id}-${dateKey}-weekend-limit`,
              label: "Weekend Limit",
              tone: rule.is_hard_rule ? "rose" : "amber",
              description: message,
              category: "rule",
            },
          });
        }
      }
    }

    if (
      rule.rule_type === "weekend_pairing" &&
      config.sameResidentForWeekend &&
      isWeekend(dateKey)
    ) {
      const dayOfWeek = getDateFromKey(dateKey).getDay();

      const adjacentDate =
        dayOfWeek === 6
          ? toDateKey(new Date(getDateFromKey(dateKey).setDate(getDateFromKey(dateKey).getDate() + 1)))
          : dayOfWeek === 0
          ? toDateKey(new Date(getDateFromKey(dateKey).setDate(getDateFromKey(dateKey).getDate() - 1)))
          : null;

      if (adjacentDate) {
        const adjacentAssignment = assignments[adjacentDate];
        const adjacentResidentId =
          slot === "Primary"
            ? adjacentAssignment?.primaryMembershipId
            : adjacentAssignment?.backupMembershipId;

        if (adjacentResidentId && adjacentResidentId !== residentId) {
          const message =
            "Weekend pairing requires the same resident on both days";

          const nextBlock: RuleEvaluationBlock = {
            ruleId: rule.id,
            ruleType: rule.rule_type,
            ruleName: rule.name,
            message,
            isHardRule: rule.is_hard_rule,
          };

          addRuleResult({
            rule,
            block: nextBlock,
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
              key: `rule-${rule.id}-${dateKey}-weekend-pairing-${slot}`,
              label: "Weekend Pairing",
              tone: rule.is_hard_rule ? "rose" : "amber",
              description: message,
              category: "rule",
            },
          });
        }
      }
    }
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