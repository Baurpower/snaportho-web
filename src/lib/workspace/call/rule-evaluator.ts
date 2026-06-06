import { resolvePgyFromSources } from "@/lib/workspace/pgy";

export type RuleSeverity = "error" | "warning";

export type EvaluatedCallType = "Primary" | "Backup" | "Buddy";

export type RuleLike = {
  id?: string | null;
  name?: string | null;
  rule_type?: string | null;
  ruleType?: string | null;
  ruleCode?: string | null;
  is_enabled?: boolean | null;
  isEnabled?: boolean | null;
  enabled?: boolean | null;
  is_hard_rule?: boolean | null;
  isHardRule?: boolean | null;
  severity?: RuleSeverity | null;
  config?: Record<string, unknown> | null;
};

export type ResidentLike = {
  gradYear?: number | null;
  effectiveDate?: string | Date | null;
  pgyYear?: number | null;
  trainingLevel?: string | null;
};

export type RuleEvaluationMatch<TRule extends RuleLike = RuleLike> = {
  rule: TRule;
  ruleCode: string;
  severity: RuleSeverity;
  config: Record<string, unknown>;
};

export type RuleViolation<TRule extends RuleLike = RuleLike> = {
  rule: TRule;
  ruleCode: string;
  severity: RuleSeverity;
  message: string;
  metadata?: Record<string, unknown>;
};

function normalizeString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function normalizeRuleCode(ruleCode: string | null | undefined) {
  const normalized = normalizeString(ruleCode);

  if (!normalized) return null;

  return normalized
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export function normalizeCallType(
  value: string | null | undefined
): EvaluatedCallType | null {
  const normalized = normalizeString(value);

  if (normalized === "Primary" || normalized === "Backup") {
    return normalized;
  }

  return null;
}

export function normalizeCallTypeList(value: unknown): EvaluatedCallType[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((item) => {
    const callType = normalizeCallType(
      typeof item === "string" ? item : String(item)
    );
    return callType ? [callType] : [];
  });
}

export function normalizeNumericList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => (typeof item === "number" ? item : Number(item)))
    .filter((item) => Number.isInteger(item));
}

export function getRuleType(rule: RuleLike) {
  return normalizeString(rule.rule_type ?? rule.ruleType) ?? "";
}

export function getRuleCode(rule: RuleLike) {
  return normalizeRuleCode(rule.ruleCode) ?? normalizeRuleCode(getRuleType(rule));
}

export function getRuleConfig(rule: RuleLike) {
  return rule.config && typeof rule.config === "object"
    ? (rule.config as Record<string, unknown>)
    : {};
}

export function isRuleEnabled(rule: RuleLike) {
  if (rule.is_enabled === false) return false;
  if (rule.isEnabled === false) return false;
  if (rule.enabled === false) return false;
  return true;
}

export function getRuleSeverity(rule: RuleLike): RuleSeverity {
  if (rule.severity === "warning") return "warning";
  if (rule.severity === "error") return "error";
  if (rule.is_hard_rule === false || rule.isHardRule === false) return "warning";
  return "error";
}

export function resolveMatchingRules<TRule extends RuleLike>(
  rules: TRule[] | null | undefined,
  supportedRuleCodes: string[]
): RuleEvaluationMatch<TRule>[] {
  const supported = new Set(
    supportedRuleCodes
      .map((ruleCode) => normalizeRuleCode(ruleCode))
      .filter((ruleCode): ruleCode is string => Boolean(ruleCode))
  );

  return (rules ?? []).flatMap((rule) => {
    if (!isRuleEnabled(rule)) return [];

    const ruleCode = getRuleCode(rule);
    if (!ruleCode || !supported.has(ruleCode)) return [];

    return [
      {
        rule,
        ruleCode,
        severity: getRuleSeverity(rule),
        config: getRuleConfig(rule),
      },
    ];
  });
}

function parseDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function toDateKey(date: Date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateDiffInDays(a: string, b: string) {
  const aDate = parseDateKey(a);
  const bDate = parseDateKey(b);
  const diffMs = Math.abs(aDate.getTime() - bDate.getTime());
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

export function isWeekendDateKey(dateKey: string) {
  const day = parseDateKey(dateKey).getDay();
  return day === 0 || day === 6;
}

export function isAdjacentWeekendPair(a: string, b: string) {
  const dateA = parseDateKey(a);
  const dateB = parseDateKey(b);
  const diff =
    Math.abs(dateA.getTime() - dateB.getTime()) / (1000 * 60 * 60 * 24);

  if (diff !== 1) return false;

  const dayA = dateA.getDay();
  const dayB = dateB.getDay();

  return (dayA === 6 && dayB === 0) || (dayA === 0 && dayB === 6);
}

export function getWeekendBucket(dateKey: string): string | null {
  const date = parseDateKey(dateKey);
  const day = date.getDay();

  if (day === 6) return dateKey;

  if (day === 0) {
    const saturday = new Date(date);
    saturday.setDate(saturday.getDate() - 1);
    return toDateKey(saturday);
  }

  return null;
}

export function countUniqueWeekendBuckets(dateKeys: string[]) {
  const buckets = new Set<string>();

  for (const dateKey of dateKeys) {
    const bucket = getWeekendBucket(dateKey);
    if (bucket) buckets.add(bucket);
  }

  return buckets.size;
}

export function getAdjacentWeekendDateKey(dateKey: string) {
  const date = parseDateKey(dateKey);
  const day = date.getDay();

  if (day !== 0 && day !== 6) return null;

  date.setDate(date.getDate() + (day === 6 ? 1 : -1));
  return toDateKey(date);
}

export function getResidentPgyYear(resident: ResidentLike) {
  return resolvePgyFromSources({
    gradYear: resident.gradYear ?? null,
    effectiveDate: resident.effectiveDate ?? undefined,
    storedPgyYear: resident.pgyYear ?? null,
    trainingLevel: resident.trainingLevel ?? null,
  });
}

export function getRequiredCallTypesFromRules<TRule extends RuleLike>(
  rules: TRule[] | null | undefined
): EvaluatedCallType[] {
  const required = new Set<EvaluatedCallType>();

  for (const { config } of resolveMatchingRules(rules, [
    "required_daily_call_slots",
  ])) {
    for (const callType of normalizeCallTypeList(config.requiredCallTypes)) {
      required.add(callType);
    }
  }

  return [...required];
}

export function evaluatePgyEligibility<TRule extends RuleLike>(params: {
  resident: ResidentLike;
  callType: EvaluatedCallType;
  rules: TRule[] | null | undefined;
}): RuleViolation<TRule>[] {
  const { resident, callType, rules } = params;
  const residentPgy = getResidentPgyYear(resident);

  if (typeof residentPgy !== "number") return [];

  const violations: RuleViolation<TRule>[] = [];

  for (const match of resolveMatchingRules(rules, [
    "restrict_call_type_by_pgy",
    "pgy_slot_restriction",
  ])) {
    const restrictedPgyYears = normalizeNumericList(
      match.config.restrictedPgyYears
    );
    if (!restrictedPgyYears.includes(residentPgy)) continue;
    if (!Array.isArray(match.config.allowedCallTypes)) continue;

    const allowedCallTypes = normalizeCallTypeList(match.config.allowedCallTypes);
    const allowsNoCall = allowedCallTypes.length === 0;
    const slotAllowed = allowedCallTypes.includes(callType);

    if (!allowsNoCall && slotAllowed) continue;

    violations.push({
      ...match,
      message: allowsNoCall
        ? `PGY-${residentPgy} is not allowed to take call`
        : `PGY-${residentPgy} cannot take ${callType} call`,
      metadata: {
        restrictedPgyYear: residentPgy,
        allowedCallTypes,
      },
    });
  }

  return violations;
}

export function evaluateSpacingForResident<TRule extends RuleLike>(params: {
  assignedDates: string[];
  dateKey: string;
  rules: TRule[] | null | undefined;
}): RuleViolation<TRule>[] {
  const { assignedDates, dateKey, rules } = params;
  const violations: RuleViolation<TRule>[] = [];

  for (const match of resolveMatchingRules(rules, [
    "min_days_between_assignments",
    "minimum_spacing",
    "avoid_consecutive_call",
  ])) {
    const minDays =
      typeof match.config.minDays === "number" &&
      Number.isFinite(match.config.minDays)
        ? Math.max(1, match.config.minDays)
        : null;

    if (minDays === null) continue;

    const excludeAdjacentWeekendPairing =
      match.config.excludeAdjacentWeekendPairing === true;

    const conflictingDateKey =
      assignedDates.find((otherDate) => {
        if (otherDate === dateKey) return false;
        if (
          excludeAdjacentWeekendPairing &&
          isAdjacentWeekendPair(otherDate, dateKey)
        ) {
          return false;
        }

        return getDateDiffInDays(otherDate, dateKey) <= minDays;
      }) ?? null;

    if (!conflictingDateKey) continue;

    violations.push({
      ...match,
      message: excludeAdjacentWeekendPairing
        ? `Violates minimum spacing (${minDays} days, ignoring paired Sat/Sun)`
        : `Violates minimum spacing (${minDays} days)`,
      metadata: {
        minDays,
        conflictingDateKey,
        excludeAdjacentWeekendPairing,
      },
    });
  }

  return violations;
}

export function evaluateMonthlyLimitForResident<TRule extends RuleLike>(params: {
  assignmentCount: number;
  rules: TRule[] | null | undefined;
}): RuleViolation<TRule>[] {
  const { assignmentCount, rules } = params;
  const violations: RuleViolation<TRule>[] = [];

  for (const match of resolveMatchingRules(rules, [
    "max_calls_per_month",
    "max_monthly_calls",
  ])) {
    const maxCalls =
      typeof match.config.maxCalls === "number" &&
      Number.isFinite(match.config.maxCalls)
        ? match.config.maxCalls
        : null;

    if (maxCalls === null || assignmentCount <= maxCalls) continue;

    violations.push({
      ...match,
      message: `Monthly call limit reached (${assignmentCount}/${maxCalls})`,
      metadata: {
        maxCalls,
        actualCalls: assignmentCount,
      },
    });
  }

  return violations;
}

export function evaluateWeekendLimitForResident<TRule extends RuleLike>(params: {
  dateKey: string;
  weekendCount: number;
  rules: TRule[] | null | undefined;
}): RuleViolation<TRule>[] {
  const { dateKey, weekendCount, rules } = params;

  if (!isWeekendDateKey(dateKey)) return [];

  const violations: RuleViolation<TRule>[] = [];

  for (const match of resolveMatchingRules(rules, [
    "max_weekends_per_month",
    "max_weekend_calls",
  ])) {
    const maxWeekends =
      typeof match.config.maxWeekends === "number" &&
      Number.isFinite(match.config.maxWeekends)
        ? match.config.maxWeekends
        : null;

    if (maxWeekends === null || weekendCount <= maxWeekends) continue;

    violations.push({
      ...match,
      message: `Weekend limit reached (${weekendCount}/${maxWeekends})`,
      metadata: {
        maxWeekends,
        actualWeekends: weekendCount,
      },
    });
  }

  return violations;
}

export function evaluateWeekendPairingForResident<TRule extends RuleLike>(params: {
  callType: EvaluatedCallType;
  dateKey: string;
  adjacentResidentId: string | null;
  residentId: string;
  rules: TRule[] | null | undefined;
}): RuleViolation<TRule>[] {
  const { dateKey, adjacentResidentId, residentId, rules } = params;

  if (!isWeekendDateKey(dateKey)) return [];

  const violations: RuleViolation<TRule>[] = [];

  for (const match of resolveMatchingRules(rules, ["weekend_pairing"])) {
    if (match.config.sameResidentForWeekend !== true) continue;
    if (!adjacentResidentId || adjacentResidentId === residentId) continue;

    violations.push({
      ...match,
      message: "Weekend pairing requires the same resident on both days",
      metadata: {
        adjacentResidentId,
      },
    });
  }

  return violations;
}

export function evaluateRotationEligibility<TRule extends RuleLike>(params: {
  rotationIds: Array<string | null | undefined>;
  callType: EvaluatedCallType;
  rules: TRule[] | null | undefined;
}): RuleViolation<TRule>[] {
  const { rotationIds, callType, rules } = params;
  const normalizedRotationIds = new Set(
    rotationIds
      .map((value) => normalizeString(value))
      .filter((value): value is string => Boolean(value))
  );

  if (normalizedRotationIds.size === 0) return [];

  const violations: RuleViolation<TRule>[] = [];

  for (const match of resolveMatchingRules(rules, ["restrict_call_by_rotation"])) {
    const blockedRotationIds = new Set(
      (Array.isArray(match.config.rotationIds) ? match.config.rotationIds : [])
        .map((value) => normalizeString(typeof value === "string" ? value : null))
        .filter((value): value is string => Boolean(value))
    );

    const hasBlockedRotation = [...normalizedRotationIds].some((rotationId) =>
      blockedRotationIds.has(rotationId)
    );

    if (!hasBlockedRotation) continue;

    const blockAllCall = match.config.blockAllCall === true;
    const restrictedCallTypes = normalizeCallTypeList(
      match.config.restrictedCallTypes
    );
    const blocksCall = blockAllCall || restrictedCallTypes.includes(callType);

    if (!blocksCall) continue;

    violations.push({
      ...match,
      message: `Blocked by rotation for ${callType} call`,
      metadata: {
        blockedRotationIds: [...blockedRotationIds],
        callType,
      },
    });
  }

  return violations;
}
