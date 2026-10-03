/**
 * Design-stage contract for the next call-policy authoring UI.
 *
 * This is intentionally not wired to production consumers. It lets us prove that
 * the proposed six-panel authoring model can account for every persisted field
 * before a migration or UI cutover is attempted.
 */

export type AuthoringPanel =
  | "slots"
  | "eligibility"
  | "rotationAvailability"
  | "workload"
  | "spacingPreferences"
  | "buddyPathway";

export type LegacyRuleForAuthoringAudit = {
  rule_type: string;
  name?: string | null;
  is_enabled?: boolean;
  is_hard_rule?: boolean;
  priority?: number;
  config?: Record<string, unknown> | null;
};

type LegacyAdapter = {
  panel: AuthoringPanel;
  configKeys: readonly string[];
};

export const LEGACY_AUTHORING_ADAPTERS: Readonly<Record<string, LegacyAdapter>> = {
  call_slot_definition: {
    panel: "slots",
    configKeys: [
      "slotLabel",
      "slotShortLabel",
      "slotCallType",
      "slotColorKey",
      "slotRequiredMode",
      "slotDaysOfWeek",
      "slotCondition",
      "slotCountsTowardWorkload",
      "slotMaxPerMonth",
      "slotSortOrder",
      "slotRequiredWhenVisible",
      "backupRequiredExplicit",
      "slotFallbackPgyYears",
      "slotFallbackLabel",
    ],
  },
  required_daily_call_slots: {
    panel: "slots",
    configKeys: ["requiredCallTypes", "backupRequiredExplicit"],
  },
  restrict_call_type_by_pgy: {
    panel: "eligibility",
    configKeys: ["restrictedPgyYears", "allowedCallTypes"],
  },
  restrict_call_by_rotation: {
    panel: "rotationAvailability",
    configKeys: ["rotationIds", "blockAllCall", "restrictedCallTypes", "restrictedPgyYears"],
  },
  max_calls_for_rotation: {
    panel: "rotationAvailability",
    configKeys: [
      "rotationCallLimitIds",
      "rotationCallLimitDayScope",
      "rotationCallLimitCallTypes",
      "rotationCallLimitMax",
      "rotationCallLimitPeriod",
    ],
  },
  monthly_load_target_by_pgy: {
    panel: "workload",
    configKeys: [
      "targetPgyYears",
      "targetCallType",
      "targetMinCalls",
      "targetMaxCalls",
      "targetHardMaxCalls",
    ],
  },
  min_days_between_assignments: {
    panel: "spacingPreferences",
    configKeys: ["minDays", "excludeAdjacentWeekendPairing"],
  },
  day_of_week_preference: {
    panel: "spacingPreferences",
    configKeys: [
      "preferenceDaysOfWeek",
      "preferenceCallTypes",
      "preferenceRotationIds",
      "preferencePgyYears",
    ],
  },
  weekend_pairing: {
    panel: "spacingPreferences",
    configKeys: ["sameResidentForWeekend"],
  },
  buddy_requirement: {
    panel: "buddyPathway",
    configKeys: [
      "requiredDaysPerMonth",
      "allowedDaysOfWeek",
      "buddyPgyYears",
      "partnerPgyYear",
      "partnerPgyYears",
      "eligibleRotationNameTokens",
      "eligibleServiceMonthIndices",
      "internPrimaryFromServiceMonthIndex",
      "internPrimaryServiceTokens",
    ],
  },
};

export type AuthoringCompatibilityIssue = {
  severity: "blocker" | "warning";
  code: string;
  message: string;
  ruleType?: string;
  ruleName?: string | null;
  fields?: string[];
};

export type AuthoringCompatibilityAudit = {
  schemaVersion: 2;
  panelCounts: Record<AuthoringPanel, number>;
  blockers: AuthoringCompatibilityIssue[];
  warnings: AuthoringCompatibilityIssue[];
};

const PANELS: AuthoringPanel[] = [
  "slots",
  "eligibility",
  "rotationAvailability",
  "workload",
  "spacingPreferences",
  "buddyPathway",
];

export function auditRulesForAuthoringV2(
  rules: LegacyRuleForAuthoringAudit[]
): AuthoringCompatibilityAudit {
  const panelCounts = Object.fromEntries(PANELS.map((panel) => [panel, 0])) as Record<
    AuthoringPanel,
    number
  >;
  const blockers: AuthoringCompatibilityIssue[] = [];
  const warnings: AuthoringCompatibilityIssue[] = [];

  for (const rule of rules) {
    const adapter = LEGACY_AUTHORING_ADAPTERS[rule.rule_type];
    if (!adapter) {
      blockers.push({
        severity: "blocker",
        code: "unsupported_rule_type",
        message: `No v2 authoring adapter exists for ${rule.rule_type}.`,
        ruleType: rule.rule_type,
        ruleName: rule.name,
      });
      continue;
    }

    panelCounts[adapter.panel] += 1;
    const knownKeys = new Set(adapter.configKeys);
    const unknownKeys = Object.keys(rule.config ?? {}).filter((key) => !knownKeys.has(key));
    if (unknownKeys.length > 0) {
      blockers.push({
        severity: "blocker",
        code: "unmapped_config_fields",
        message: `${rule.rule_type} contains fields the v2 model would not preserve.`,
        ruleType: rule.rule_type,
        ruleName: rule.name,
        fields: unknownKeys,
      });
    }
  }

  const slotRules = rules.filter((rule) => rule.rule_type === "call_slot_definition");
  const requiredTypes = new Set(
    rules
      .filter((rule) => rule.rule_type === "required_daily_call_slots")
      .flatMap((rule) =>
        Array.isArray(rule.config?.requiredCallTypes)
          ? rule.config.requiredCallTypes.map(String)
          : []
      )
  );
  const duplicateRequiredness = slotRules
    .filter(
      (rule) =>
        rule.config?.slotRequiredWhenVisible === true &&
        requiredTypes.has(String(rule.config?.slotCallType ?? ""))
    )
    .map((rule) => String(rule.config?.slotCallType ?? rule.name ?? "slot"));
  if (duplicateRequiredness.length > 0) {
    warnings.push({
      severity: "warning",
      code: "duplicate_requiredness_source",
      message: "Requiredness is stored both on the slot and in required_daily_call_slots.",
      fields: duplicateRequiredness,
    });
  }

  const buddy = rules.find((rule) => rule.rule_type === "buddy_requirement");
  const buddySlot = slotRules.find((rule) => rule.config?.slotCallType === "Buddy");
  const storedPartnerYears =
    buddySlot?.config?.slotCondition &&
    typeof buddySlot.config.slotCondition === "object" &&
    Array.isArray((buddySlot.config.slotCondition as { pgyYears?: unknown }).pgyYears)
      ? ((buddySlot.config.slotCondition as { pgyYears: unknown[] }).pgyYears).map(Number)
      : [];
  const effectivePartnerYears = Array.isArray(buddy?.config?.partnerPgyYears)
    ? buddy.config.partnerPgyYears.map(Number)
    : [];
  if (
    storedPartnerYears.length > 0 &&
    effectivePartnerYears.length > 0 &&
    JSON.stringify(storedPartnerYears) !== JSON.stringify(effectivePartnerYears)
  ) {
    warnings.push({
      severity: "warning",
      code: "buddy_partner_source_drift",
      message:
        "Buddy slot visibility and Buddy pairing store different partner PGYs; v2 must derive both from one relationship.",
      fields: ["slotCondition.pgyYears", "partnerPgyYears"],
    });
  }

  if (buddy && buddySlot?.config?.slotRequiredMode === "conditional") {
    warnings.push({
      severity: "warning",
      code: "buddy_presence_requires_relationship_migration",
      message:
        "Persisted Buddy presence currently relies on legacy/runtime synthesis; v2 must materialize it from the Buddy relationship.",
      fields: ["slotRequiredMode", "slotCondition", "partnerPgyYears"],
    });
  }

  const duplicatePriorities = Object.entries(
    rules.reduce<Record<string, number>>((counts, rule) => {
      const key = String(rule.priority ?? "unset");
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {})
  )
    .filter(([, count]) => count > 1)
    .map(([priority]) => priority);
  if (duplicatePriorities.length > 0) {
    warnings.push({
      severity: "warning",
      code: "priority_is_not_dependency_order",
      message: "Multiple rules share a priority; v2 must use explicit relationships, not list order.",
      fields: duplicatePriorities,
    });
  }

  return { schemaVersion: 2, panelCounts, blockers, warnings };
}
