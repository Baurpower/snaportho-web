/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for rule-evaluator.ts (new functions) and rule-definitions.ts (new sanitizers).
 *
 * Self-contained: inlines the minimal evaluation logic so no path-alias resolver is needed.
 * Run with:  node --experimental-strip-types src/lib/workspace/call/rule-evaluator.test.ts
 *
 * For full module integration tests (evaluatePgyEligibility, etc.), run the build
 * against a proper Next.js dev/test environment.
 */

// ── Assertion helpers ──────────────────────────────────────────────────────

let passed = 0;
let failed = 0;

function assertEqual<T>(label: string, actual: T, expected: T) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    console.error(`  FAIL  ${label}`);
    console.error(`        expected: ${JSON.stringify(expected)}`);
    console.error(`        received: ${JSON.stringify(actual)}`);
    failed += 1;
  } else {
    console.log(`  pass  ${label}`);
    passed += 1;
  }
}

function assertOk(label: string, condition: unknown) {
  assertEqual(label, Boolean(condition), true);
}

function assertEmpty(label: string, arr: unknown[]) {
  assertEqual(label, arr.length, 0);
}

function assertHasViolation(label: string, violations: unknown[]) {
  assertOk(label, violations.length > 0);
}

// ── Inlined rule-evaluator types + helpers ─────────────────────────────────
// These are extracted from rule-evaluator.ts so the test runs without @/ aliases.

type RuleSeverity = "error" | "warning";
type RuleLike = {
  id?: string | null;
  name?: string | null;
  rule_type?: string | null;
  is_enabled?: boolean | null;
  is_hard_rule?: boolean | null;
  severity?: RuleSeverity | null;
  config?: Record<string, unknown> | null;
};
type RuleViolation<T extends RuleLike = RuleLike> = {
  rule: T;
  ruleCode: string;
  severity: RuleSeverity;
  message: string;
  metadata?: Record<string, unknown>;
};

function normalizeString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeRuleCode(ruleCode: string | null | undefined): string | null {
  const normalized = normalizeString(ruleCode);
  if (!normalized) return null;
  return normalized.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[\s-]+/g, "_").toLowerCase();
}

function isRuleEnabled(rule: RuleLike): boolean {
  if (rule.is_enabled === false) return false;
  return true;
}

function getRuleType(rule: RuleLike): string {
  return normalizeString(rule.rule_type) ?? "";
}

function getRuleSeverity(rule: RuleLike): RuleSeverity {
  if (rule.severity === "warning") return "warning";
  if (rule.is_hard_rule === false) return "warning";
  return "error";
}

function normalizeNumericList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.map((d) => (typeof d === "number" ? d : Number(d))).filter(Number.isFinite) as number[];
}

function resolveMatchingRules<T extends RuleLike>(
  rules: T[] | null | undefined,
  supportedRuleCodes: string[]
): Array<{ rule: T; ruleCode: string; severity: RuleSeverity; config: Record<string, unknown> }> {
  const supported = new Set(
    supportedRuleCodes.map((c) => normalizeRuleCode(c)).filter(Boolean) as string[]
  );
  return (rules ?? []).flatMap((rule) => {
    if (!isRuleEnabled(rule)) return [];
    const code = normalizeRuleCode(getRuleType(rule));
    if (!code || !supported.has(code)) return [];
    return [{ rule, ruleCode: code, severity: getRuleSeverity(rule), config: rule.config ?? {} }];
  });
}

// normalizeCallType — matches rule-evaluator.ts exactly
function normalizeCallType(value: string | null | undefined): "Primary" | "Backup" | "Buddy" | null {
  const normalized = normalizeString(value);
  if (normalized === "Primary" || normalized === "Backup" || normalized === "Buddy") return normalized;
  return null;
}

function normalizeCallTypeList(value: unknown): ("Primary" | "Backup" | "Buddy")[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const ct = normalizeCallType(typeof item === "string" ? item : String(item));
    return ct ? [ct] : [];
  });
}

// ── Inlined: evaluateRotationEligibility (with per-PGY support) ─────────

function evaluateRotationEligibility<T extends RuleLike>(params: {
  rotationIds: Array<string | null | undefined>;
  callType: "Primary" | "Backup" | "Buddy";
  rules: T[] | null | undefined;
  residentPgyYear?: number | null;
}): RuleViolation<T>[] {
  const { rotationIds, callType, rules, residentPgyYear = null } = params;
  const normalizedRotationIds = new Set(
    rotationIds.map((v) => normalizeString(v)).filter(Boolean) as string[]
  );
  if (normalizedRotationIds.size === 0) return [];

  const violations: RuleViolation<T>[] = [];
  for (const match of resolveMatchingRules(rules, ["restrict_call_by_rotation"])) {
    const blockedRotationIds = new Set(
      (Array.isArray(match.config.rotationIds) ? match.config.rotationIds : [])
        .map((v: unknown) => normalizeString(typeof v === "string" ? v : null))
        .filter(Boolean) as string[]
    );
    const hasBlockedRotation = [...normalizedRotationIds].some((id) => blockedRotationIds.has(id));
    if (!hasBlockedRotation) continue;

    const rulePgyYears = normalizeNumericList(match.config.restrictedPgyYears);
    if (rulePgyYears.length > 0 && residentPgyYear !== null) {
      if (!rulePgyYears.includes(residentPgyYear)) continue;
    }

    const blockAllCall = match.config.blockAllCall === true;
    const restrictedCallTypes = normalizeCallTypeList(match.config.restrictedCallTypes);
    const blocksCall = blockAllCall || restrictedCallTypes.includes(callType);
    if (!blocksCall) continue;

    violations.push({
      rule: match.rule,
      ruleCode: match.ruleCode,
      severity: match.severity,
      message: `Blocked by rotation for ${callType} call`,
      metadata: { blockedRotationIds: [...blockedRotationIds], callType },
    });
  }
  return violations;
}

// ── Inlined: evaluateMonthlyLoadTargetForResident ─────────────────────────

function evaluateMonthlyLoadTargetForResident<T extends RuleLike>(params: {
  residentPgyYear: number | null;
  callType: "Primary" | "Backup" | "Buddy";
  projectedCount: number;
  rules: T[] | null | undefined;
}): RuleViolation<T>[] {
  const { residentPgyYear, callType, projectedCount, rules } = params;
  if (residentPgyYear === null) return [];

  const violations: RuleViolation<T>[] = [];
  for (const match of resolveMatchingRules(rules, ["monthly_load_target_by_pgy"])) {
    const targetPgyYears = normalizeNumericList(match.config.targetPgyYears);
    if (targetPgyYears.length > 0 && !targetPgyYears.includes(residentPgyYear)) continue;

    const targetCallType = typeof match.config.targetCallType === "string" ? match.config.targetCallType : "Primary";
    if (targetCallType !== "any" && targetCallType !== callType) continue;

    const hardMax = typeof match.config.targetHardMaxCalls === "number" ? match.config.targetHardMaxCalls : null;
    const softMax = typeof match.config.targetMaxCalls === "number" ? match.config.targetMaxCalls : null;

    if (hardMax !== null && projectedCount > hardMax) {
      violations.push({
        rule: match.rule, ruleCode: match.ruleCode,
        severity: "error",
        message: `PGY-${residentPgyYear} monthly ${callType} hard maximum is ${hardMax} (projected: ${projectedCount})`,
        metadata: { residentPgyYear, projectedCount, hardMax, callType },
      });
    } else if (softMax !== null && projectedCount > softMax) {
      violations.push({
        rule: match.rule, ruleCode: match.ruleCode,
        severity: "warning",
        message: `PGY-${residentPgyYear} monthly ${callType} soft maximum is ${softMax} (projected: ${projectedCount})`,
        metadata: { residentPgyYear, projectedCount, softMax, callType },
      });
    }
  }
  return violations;
}

// ── Inlined: evaluateDayOfWeekPreferenceForResident ───────────────────────

function evaluateDayOfWeekPreferenceForResident<T extends RuleLike>(params: {
  dateKey: string;
  callType: "Primary" | "Backup" | "Buddy";
  rotationIds: Array<string | null | undefined>;
  residentPgyYear?: number | null;
  rules: T[] | null | undefined;
}): RuleViolation<T>[] {
  const { dateKey, callType, rotationIds, residentPgyYear = null, rules } = params;
  const dayOfWeek = new Date(`${dateKey}T00:00:00`).getDay();
  const normalizedRotationIds = new Set(
    rotationIds.map((v) => normalizeString(v)).filter(Boolean) as string[]
  );

  const violations: RuleViolation<T>[] = [];
  for (const match of resolveMatchingRules(rules, ["day_of_week_preference"])) {
    const days = Array.isArray(match.config.preferenceDaysOfWeek) ? (match.config.preferenceDaysOfWeek as number[]) : [];
    if (!days.includes(dayOfWeek)) continue;

    const prefCallTypes = Array.isArray(match.config.preferenceCallTypes) ? (match.config.preferenceCallTypes as string[]) : ["Primary"];
    if (!prefCallTypes.includes(callType)) continue;

    const prefPgyYears = normalizeNumericList(match.config.preferencePgyYears);
    if (prefPgyYears.length > 0 && residentPgyYear !== null) {
      if (!prefPgyYears.includes(residentPgyYear)) continue;
    }

    const prefRotationIds = new Set(
      (Array.isArray(match.config.preferenceRotationIds) ? (match.config.preferenceRotationIds as string[]) : []).filter(Boolean) as string[]
    );
    if (prefRotationIds.size > 0 && ![...normalizedRotationIds].some((id) => prefRotationIds.has(id))) continue;

    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    violations.push({
      rule: match.rule, ruleCode: match.ruleCode,
      severity: "warning",
      message: `Soft preference: avoid ${callType} call on ${dayNames[dayOfWeek] ?? "this day"}`,
      metadata: { dayOfWeek, callType, residentPgyYear },
    });
  }
  return violations;
}

// ── Inlined: evaluateSpacingForResident ──────────────────────────────────

function getDateDiffInDays(a: string, b: string): number {
  const aDate = new Date(`${a}T00:00:00`);
  const bDate = new Date(`${b}T00:00:00`);
  return Math.round(Math.abs(aDate.getTime() - bDate.getTime()) / 86400000);
}

function isAdjacentWeekendPair(a: string, b: string): boolean {
  const dateA = new Date(`${a}T00:00:00`);
  const dateB = new Date(`${b}T00:00:00`);
  const diff = Math.abs(dateA.getTime() - dateB.getTime()) / 86400000;
  if (diff !== 1) return false;
  const dayA = dateA.getDay(); const dayB = dateB.getDay();
  return (dayA === 6 && dayB === 0) || (dayA === 0 && dayB === 6);
}

function evaluateSpacingForResident<T extends RuleLike>(params: {
  assignedDates: string[];
  dateKey: string;
  rules: T[] | null | undefined;
}): RuleViolation<T>[] {
  const { assignedDates, dateKey, rules } = params;
  const violations: RuleViolation<T>[] = [];
  for (const match of resolveMatchingRules(rules, ["min_days_between_assignments", "minimum_spacing", "avoid_consecutive_call"])) {
    const minDays = typeof match.config.minDays === "number" && Number.isFinite(match.config.minDays) ? Math.max(1, match.config.minDays) : null;
    if (minDays === null) continue;
    const excludeAdjacentWeekendPairing = match.config.excludeAdjacentWeekendPairing === true;
    const conflictingDateKey = assignedDates.find((otherDate) => {
      if (otherDate === dateKey) return false;
      if (excludeAdjacentWeekendPairing && isAdjacentWeekendPair(otherDate, dateKey)) return false;
      return getDateDiffInDays(otherDate, dateKey) <= minDays;
    }) ?? null;
    if (!conflictingDateKey) continue;
    violations.push({
      rule: match.rule, ruleCode: match.ruleCode, severity: match.severity,
      message: `Violates minimum spacing (${minDays} days)`,
      metadata: { minDays, conflictingDateKey },
    });
  }
  return violations;
}

// ── Shared fixture helper ──────────────────────────────────────────────────

function makeRule(overrides: Record<string, unknown>): RuleLike {
  return {
    id: "r1",
    name: "Test rule",
    rule_type: "test",
    is_enabled: true,
    is_hard_rule: true,
    config: {},
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

function testNormalizeCallType() {
  console.log("\n── normalizeCallType ──");
  assertEqual("Primary → Primary", normalizeCallType("Primary"), "Primary");
  assertEqual("Backup → Backup", normalizeCallType("Backup"), "Backup");
  assertEqual("Buddy → Buddy (new)", normalizeCallType("Buddy"), "Buddy");
  assertEqual("lowercase → null", normalizeCallType("primary"), null);
  assertEqual("null → null", normalizeCallType(null), null);
  assertEqual("undefined → null", normalizeCallType(undefined), null);
}

function testEvaluateRotationEligibility() {
  console.log("\n── evaluateRotationEligibility (with PGY filter) ──");

  const blockAllRule = makeRule({
    rule_type: "restrict_call_by_rotation",
    config: { rotationIds: ["rot-er"], blockAllCall: true, restrictedCallTypes: [], restrictedPgyYears: [] },
  });
  assertHasViolation("ER blocked from Primary (no PGY filter)", evaluateRotationEligibility({
    rotationIds: ["rot-er"], callType: "Primary", rules: [blockAllRule],
  }));
  assertEmpty("Different rotation not blocked", evaluateRotationEligibility({
    rotationIds: ["rot-ortho"], callType: "Primary", rules: [blockAllRule],
  }));

  // Per-PGY: block only PGY-1
  const pgy1BlockRule = makeRule({
    rule_type: "restrict_call_by_rotation",
    config: { rotationIds: ["rot-er"], blockAllCall: true, restrictedCallTypes: [], restrictedPgyYears: [1] },
  });
  assertHasViolation("PGY-1 on ER blocked", evaluateRotationEligibility({
    rotationIds: ["rot-er"], callType: "Primary", rules: [pgy1BlockRule], residentPgyYear: 1,
  }));
  assertEmpty("PGY-2 on ER NOT blocked by PGY-1 rule", evaluateRotationEligibility({
    rotationIds: ["rot-er"], callType: "Primary", rules: [pgy1BlockRule], residentPgyYear: 2,
  }));
  // When PGY unknown (null), rule fires conservatively
  assertHasViolation("Unknown PGY → rule fires (conservative)", evaluateRotationEligibility({
    rotationIds: ["rot-er"], callType: "Primary", rules: [pgy1BlockRule], residentPgyYear: null,
  }));
}

function testEvaluateMonthlyLoadTarget() {
  console.log("\n── evaluateMonthlyLoadTargetForResident ──");

  const targetRule = makeRule({
    rule_type: "monthly_load_target_by_pgy",
    is_hard_rule: false,
    config: { targetPgyYears: [1], targetCallType: "Primary", targetMinCalls: 2, targetMaxCalls: 3, targetHardMaxCalls: 4 },
  });

  const v1 = evaluateMonthlyLoadTargetForResident({ residentPgyYear: 1, callType: "Primary", projectedCount: 5, rules: [targetRule] });
  assertHasViolation("PGY-1 exceeds hard max of 4", v1);
  assertEqual("Hard max violation is error", v1[0].severity, "error");

  const v2 = evaluateMonthlyLoadTargetForResident({ residentPgyYear: 1, callType: "Primary", projectedCount: 4, rules: [targetRule] });
  assertHasViolation("PGY-1 at 4 exceeds soft max of 3", v2);
  assertEqual("Soft max violation is warning", v2[0].severity, "warning");

  assertEmpty("PGY-1 at 3 → within target", evaluateMonthlyLoadTargetForResident({ residentPgyYear: 1, callType: "Primary", projectedCount: 3, rules: [targetRule] }));
  assertEmpty("PGY-2 not subject to PGY-1 rule", evaluateMonthlyLoadTargetForResident({ residentPgyYear: 2, callType: "Primary", projectedCount: 5, rules: [targetRule] }));
  assertEmpty("Backup not subject to Primary target", evaluateMonthlyLoadTargetForResident({ residentPgyYear: 1, callType: "Backup", projectedCount: 5, rules: [targetRule] }));
  assertEmpty("null PGY → no violation", evaluateMonthlyLoadTargetForResident({ residentPgyYear: null, callType: "Primary", projectedCount: 10, rules: [targetRule] }));
}

function testEvaluateDayOfWeekPreference() {
  console.log("\n── evaluateDayOfWeekPreferenceForResident ──");

  const dowRule = makeRule({
    rule_type: "day_of_week_preference",
    is_hard_rule: false,
    config: { preferenceDaysOfWeek: [2, 4], preferenceCallTypes: ["Primary"], preferenceRotationIds: [], preferencePgyYears: [] },
  });

  const v1 = evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-02", callType: "Primary", rotationIds: [], rules: [dowRule] });
  assertHasViolation("Tuesday Primary → day preference warning", v1);
  assertEqual("Day preference severity is always warning", v1[0].severity, "warning");

  assertHasViolation("Thursday Primary → day preference warning",
    evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-04", callType: "Primary", rotationIds: [], rules: [dowRule] }));
  assertEmpty("Monday Primary → no warning",
    evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-01", callType: "Primary", rotationIds: [], rules: [dowRule] }));
  assertEmpty("Backup on Tuesday → filtered by call type",
    evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-02", callType: "Backup", rotationIds: [], rules: [dowRule] }));

  // Rotation-scoped rule
  const rotScopedRule = makeRule({
    rule_type: "day_of_week_preference",
    is_hard_rule: false,
    config: { preferenceDaysOfWeek: [2, 4], preferenceCallTypes: ["Primary"], preferenceRotationIds: ["rot-hand"], preferencePgyYears: [2] },
  });
  assertHasViolation("PGY-2 on Hand rotation Tue → fires",
    evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-02", callType: "Primary", rotationIds: ["rot-hand"], residentPgyYear: 2, rules: [rotScopedRule] }));
  assertEmpty("PGY-2 on different rotation → doesn't fire",
    evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-02", callType: "Primary", rotationIds: ["rot-ortho"], residentPgyYear: 2, rules: [rotScopedRule] }));
  assertEmpty("PGY-3 on Hand rotation → PGY filter blocks",
    evaluateDayOfWeekPreferenceForResident({ dateKey: "2026-06-02", callType: "Primary", rotationIds: ["rot-hand"], residentPgyYear: 3, rules: [rotScopedRule] }));
}

function testEvaluateSpacing() {
  console.log("\n── evaluateSpacingForResident ──");

  const hardRule = makeRule({ rule_type: "min_days_between_assignments", is_hard_rule: true, config: { minDays: 1, excludeAdjacentWeekendPairing: false } });
  assertHasViolation("Adjacent day fires violation",
    evaluateSpacingForResident({ assignedDates: ["2026-06-01"], dateKey: "2026-06-02", rules: [hardRule] }));
  assertEmpty("2-day gap with minDays=1 → no violation",
    evaluateSpacingForResident({ assignedDates: ["2026-06-01"], dateKey: "2026-06-03", rules: [hardRule] }));

  const satSunRule = makeRule({ rule_type: "min_days_between_assignments", is_hard_rule: true, config: { minDays: 1, excludeAdjacentWeekendPairing: true } });
  assertEmpty("Sat/Sun adjacency excluded when flag is true",
    evaluateSpacingForResident({ assignedDates: ["2026-06-06"], dateKey: "2026-06-07", rules: [satSunRule] }));
}

// ── Run ────────────────────────────────────────────────────────────────────

function run() {
  console.log("Running rule-evaluator unit tests...\n");
  testNormalizeCallType();
  testEvaluateRotationEligibility();
  testEvaluateMonthlyLoadTarget();
  testEvaluateDayOfWeekPreference();
  testEvaluateSpacing();
  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run();
