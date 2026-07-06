// lib/workspace/call/rule-definitions.ts
import type { BuddyDateState } from "@/lib/workspace/call/buddy-requirements";

export type CallTypeOption = "Primary" | "Backup" | "Buddy";

export type RuleType =
  | "required_daily_call_slots"
  | "min_days_between_assignments"
  | "max_calls_per_month"
  | "max_weekends_per_month"
  | "restrict_call_type_by_pgy"
  | "weekend_pairing"
  | "restrict_call_by_rotation"
  | "call_slot_definition"
  | "max_calls_for_rotation"
  | "monthly_load_target_by_pgy"
  | "day_of_week_preference";

export type SlotCondition = {
  type: "when_pgy_scheduled";
  pgyYears: number[];
  sourceSlotCallTypes?: string[];
};

export type ProgramCallSlotDefinition = {
  id: string;
  label: string;
  shortLabel: string;
  callType: string;
  colorKey: string;
  /**
   * Controls when the slot is visible on the calendar:
   *   "always"      — shown every day
   *   "optional"    — shown only when already assigned
   *   "conditional" — shown when condition evaluates true for that day
   */
  requiredMode: "always" | "optional" | "conditional";
  daysOfWeek?: number[];
  condition?: SlotCondition;
  countsTowardWorkload: boolean;
  maxPerMonth?: number | null;
  sortOrder?: number;
  /**
   * When true (default), a visible slot must be filled.
   * Auto-generation must attempt to fill it and validation flags it if empty.
   * When false, a visible slot is optional: auto-generation may fill it but
   * validation never flags it as missing.
   */
  requiredWhenVisible: boolean;
};

export type RuleConfig = {
  requiredCallTypes?: CallTypeOption[];
  /** Set when an admin explicitly requires Backup via rules UI. */
  backupRequiredExplicit?: boolean;

  minDays?: number;
  excludeAdjacentWeekendPairing?: boolean;

  maxCalls?: number;
  maxWeekends?: number;

  restrictedPgyYears?: number[];
  allowedCallTypes?: CallTypeOption[];

  sameResidentForWeekend?: boolean;

  rotationIds?: string[];
  blockAllCall?: boolean;
  restrictedCallTypes?: CallTypeOption[];

  // call_slot_definition fields
  slotLabel?: string;
  slotShortLabel?: string;
  slotCallType?: string;
  slotColorKey?: string;
  slotRequiredMode?: "always" | "optional" | "conditional";
  slotDaysOfWeek?: number[];
  slotCondition?: SlotCondition;
  slotCountsTowardWorkload?: boolean;
  slotMaxPerMonth?: number | null;
  slotSortOrder?: number;
  slotRequiredWhenVisible?: boolean;

  // max_calls_for_rotation fields
  /** Rotation IDs (program_rotations.id) this limit applies to. */
  rotationCallLimitIds?: string[];
  /** Which days count toward the limit: all days, weekend only, or weekday only. */
  rotationCallLimitDayScope?: "all" | "weekend_only" | "weekday_only";
  /** Which call types count toward the limit. "any" matches all types. */
  rotationCallLimitCallTypes?: string[];
  /** Maximum number of call days per period before the rule fires. */
  rotationCallLimitMax?: number;
  /** Period over which the limit is measured. Only "month" is supported. */
  rotationCallLimitPeriod?: "month";

  // monthly_load_target_by_pgy fields
  /** PGY years this monthly target applies to (empty = all PGY years). */
  targetPgyYears?: number[];
  /** Which call slot type this target measures: "Primary" | "Backup" | "any". */
  targetCallType?: string;
  /** Soft minimum: generate a warning when resident is below this count. */
  targetMinCalls?: number;
  /** Soft maximum: generate a warning when resident exceeds this count. */
  targetMaxCalls?: number;
  /** Hard maximum: block/flag when resident exceeds this count (never allow). */
  targetHardMaxCalls?: number;

  // day_of_week_preference fields
  /** Days of week to soft-avoid for call: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat. */
  preferenceDaysOfWeek?: number[];
  /** Call types this preference applies to. */
  preferenceCallTypes?: string[];
  /** Optional: only apply when resident is on one of these rotation IDs. */
  preferenceRotationIds?: string[];
  /** Optional: only apply to residents in these PGY years. */
  preferencePgyYears?: number[];
};

export type RuleFieldDefinition =
  | (RuleFieldBase & {
      type: "number";
      min?: number;
      max?: number;
      step?: number;
      placeholder?: string;
    })
  | (RuleFieldBase & {
      type: "boolean";
    })
  | (RuleFieldBase & {
      type: "pgy_multi_select";
      options: number[];
    })
  | (RuleFieldBase & {
      type: "call_type_multi_select";
      options: CallTypeOption[];
    })
  | (RuleFieldBase & {
      type: "rotation_multi_select";
    })
  | (RuleFieldBase & {
      type: "text_list";
      placeholder?: string;
    });

export type RuleDraft = {
  id: string;
  name: string;
  type: RuleType;
  enabled: boolean;
  isHardRule: boolean;
  config: RuleConfig;
};

type RuleFieldBase = {
  key: keyof RuleConfig | string;
  label: string;
  description?: string;
};

export type RuleDefinition = {
  type: RuleType;
  label: string;
  description: string;
  category: "spacing" | "volume" | "eligibility" | "weekend";
  defaultName: string;
  defaultEnabled: boolean;
  defaultIsHardRule: boolean;
  defaultConfig: RuleConfig;
  fields: RuleFieldDefinition[];
};

export const CALL_TYPE_OPTIONS: CallTypeOption[] = ["Primary", "Backup"];
export const PGY_YEAR_OPTIONS = [1, 2, 3, 4, 5];
export const DAY_OF_WEEK_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export const RULE_DEFINITIONS: RuleDefinition[] = [
  {
    type: "required_daily_call_slots",
    label: "Required daily call slots",
    description:
      "Defines which call slots must be filled each day for this program.",
    category: "eligibility",
    defaultName: "Required daily call slots",
    defaultEnabled: true,
    defaultIsHardRule: true,
    defaultConfig: {
      requiredCallTypes: ["Primary"],
    },
    fields: [
      {
        key: "requiredCallTypes",
        label: "Required call types",
        type: "call_type_multi_select",
        options: CALL_TYPE_OPTIONS,
        description: "Each selected call type must be assigned every day.",
      },
    ],
  },
  {
  type: "min_days_between_assignments",
  label: "Minimum days between assignments",
  description:
    "Prevents residents from being scheduled too close together.",
  category: "spacing",
  defaultName: "Minimum spacing",
  defaultEnabled: true,
  defaultIsHardRule: true,
  defaultConfig: {
    minDays: 2,
    excludeAdjacentWeekendPairing: true, // ✅ NEW
  },
  fields: [
    {
      key: "minDays",
      label: "Minimum days",
      type: "number",
      min: 0,
      step: 1,
      description:
        "Residents must have at least this many days between calls.",
    },
    {
      key: "excludeAdjacentWeekendPairing",
      label: "Ignore paired Sat/Sun weekends",
      type: "boolean",
      description:
        "Do not count Saturday–Sunday assignments as a spacing violation.",
    },
  ],
},
  {
    type: "max_calls_per_month",
    label: "Maximum calls per month",
    description:
      "Caps the total number of calls a resident can take in a month.",
    category: "volume",
    defaultName: "Maximum calls per month",
    defaultEnabled: true,
    defaultIsHardRule: false,
    defaultConfig: {
      maxCalls: 6,
    },
    fields: [
      {
        key: "maxCalls",
        label: "Maximum monthly calls",
        type: "number",
        min: 0,
        step: 1,
        description: "Maximum number of total calls allowed in one month.",
      },
    ],
  },
  {
    type: "max_weekends_per_month",
    label: "Maximum weekends per month",
    description:
      "Caps the number of weekend assignments a resident can take in a month.",
    category: "weekend",
    defaultName: "Maximum weekends per month",
    defaultEnabled: true,
    defaultIsHardRule: false,
    defaultConfig: {
      maxWeekends: 2,
    },
    fields: [
      {
        key: "maxWeekends",
        label: "Maximum weekend calls",
        type: "number",
        min: 0,
        step: 1,
        description: "Maximum number of weekend assignments allowed in one month.",
      },
    ],
  },
  {
    type: "restrict_call_type_by_pgy",
    label: "Restrict call type by PGY",
    description:
      "Limits certain PGY levels to specific call types only.",
    category: "eligibility",
    defaultName: "Restrict call type by PGY",
    defaultEnabled: true,
    defaultIsHardRule: true,
    defaultConfig: {
      restrictedPgyYears: [5],
      allowedCallTypes: ["Backup"],
    },
    fields: [
      {
        key: "restrictedPgyYears",
        label: "Restricted PGY years",
        type: "pgy_multi_select",
        options: PGY_YEAR_OPTIONS,
        description: "These PGY years will be restricted to the allowed call types.",
      },
      {
        key: "allowedCallTypes",
        label: "Allowed call types",
        type: "call_type_multi_select",
        options: CALL_TYPE_OPTIONS,
        description: "Only these call types can be assigned to the selected PGY years.",
      },
    ],
  },
  {
    type: "weekend_pairing",
    label: "Weekend pairing",
    description:
      "Keeps the same resident on the full weekend when desired.",
    category: "weekend",
    defaultName: "Weekend pairing",
    defaultEnabled: true,
    defaultIsHardRule: false,
    defaultConfig: {
      sameResidentForWeekend: true,
    },
    fields: [
      {
        key: "sameResidentForWeekend",
        label: "Same resident for Saturday and Sunday",
        type: "boolean",
        description: "Use the same resident for the full weekend.",
      },
    ],
  },
  {
  type: "restrict_call_by_rotation",
  label: "Restrict call by rotation",
  description:
    "Prevents residents on selected official program rotations from taking call.",
  category: "eligibility",
  defaultName: "Restrict call by rotation",
  defaultEnabled: true,
  defaultIsHardRule: true,
  defaultConfig: {
    rotationIds: [],
    blockAllCall: true,
    restrictedCallTypes: ["Primary", "Backup"],
  },
  fields: [
    {
      key: "rotationIds",
      label: "Blocked rotations",
      type: "rotation_multi_select",
      description:
        "Choose official program rotations that should remove residents from the call pool.",
    },
    {
      key: "blockAllCall",
      label: "Block all call",
      type: "boolean",
      description:
        "If enabled, residents on these rotations cannot take any call.",
    },
    {
      key: "restrictedCallTypes",
      label: "Restricted call types",
      type: "call_type_multi_select",
      options: CALL_TYPE_OPTIONS,
      description:
        "Used only when block all call is turned off.",
    },
  ],
},
  {
    type: "call_slot_definition",
    label: "Call slot",
    description:
      "Defines a call slot visible on the schedule calendar (Primary, Backup, Buddy, or custom).",
    category: "eligibility",
    defaultName: "Call slot",
    defaultEnabled: true,
    defaultIsHardRule: false,
    defaultConfig: {
      slotLabel: "Primary",
      slotShortLabel: "1°",
      slotCallType: "Primary",
      slotColorKey: "amber",
      slotRequiredMode: "always",
      slotCountsTowardWorkload: true,
      slotSortOrder: 0,
    },
    fields: [],
  },
  {
    type: "max_calls_for_rotation",
    label: "Limit calls for rotation",
    description:
      "Limits how many call days a resident on a specific service/rotation may take per month. Use this for rules like \"Oncology residents get at most 1 weekend call day per month.\"",
    category: "eligibility",
    defaultName: "Rotation call limit",
    defaultEnabled: true,
    defaultIsHardRule: true,
    defaultConfig: {
      rotationCallLimitIds: [],
      rotationCallLimitDayScope: "weekend_only",
      rotationCallLimitCallTypes: ["Primary"],
      rotationCallLimitMax: 1,
      rotationCallLimitPeriod: "month",
    },
    fields: [
      {
        key: "rotationCallLimitIds",
        label: "Rotation / service",
        type: "rotation_multi_select",
        description: "Residents on these rotations will have their call limited.",
      },
      {
        key: "rotationCallLimitDayScope",
        label: "Applies to",
        type: "text_list",
        description: "weekend_only, weekday_only, or all.",
      },
      {
        key: "rotationCallLimitCallTypes",
        label: "Call types",
        type: "call_type_multi_select",
        options: CALL_TYPE_OPTIONS,
        description: "Which call slot types count toward the limit.",
      },
      {
        key: "rotationCallLimitMax",
        label: "Maximum call days",
        type: "number",
        min: 0,
        step: 1,
        description: "Maximum number of matching call days per month.",
      },
    ],
  },
  {
    type: "monthly_load_target_by_pgy",
    label: "Monthly load target by PGY",
    description:
      "Sets per-PGY-level monthly call targets. The soft max triggers a warning; the hard max blocks assignment. Use this to encode \"PGY-1: target 2-3, max 4\" style targets.",
    category: "volume",
    defaultName: "Monthly load target",
    defaultEnabled: true,
    defaultIsHardRule: false,
    defaultConfig: {
      targetPgyYears: [1],
      targetCallType: "Primary",
      targetMinCalls: 2,
      targetMaxCalls: 4,
      targetHardMaxCalls: 4,
    },
    fields: [
      {
        key: "targetPgyYears",
        label: "PGY years",
        type: "pgy_multi_select",
        options: PGY_YEAR_OPTIONS,
        description: "PGY levels this target applies to.",
      },
      {
        key: "targetHardMaxCalls",
        label: "Hard maximum",
        type: "number",
        min: 0,
        step: 1,
        description: "Never exceed this many calls per month (hard block).",
      },
      {
        key: "targetMaxCalls",
        label: "Soft maximum",
        type: "number",
        min: 0,
        step: 1,
        description: "Warn when a resident exceeds this count (soft).",
      },
      {
        key: "targetMinCalls",
        label: "Soft minimum",
        type: "number",
        min: 0,
        step: 1,
        description: "Warn when a resident falls below this count (soft).",
      },
    ],
  },
  {
    type: "day_of_week_preference",
    label: "Day-of-week preference",
    description:
      "Soft preference to minimize call on specific weekdays. Optionally scoped to certain rotations or PGY levels. Use for rules like \"minimize Tue/Thu primary call for PGY-2 residents on Hand or Foot & Ankle.\"",
    category: "eligibility",
    defaultName: "Avoid weekday call",
    defaultEnabled: true,
    defaultIsHardRule: false,
    defaultConfig: {
      preferenceDaysOfWeek: [2, 4],
      preferenceCallTypes: ["Primary"],
      preferenceRotationIds: [],
      preferencePgyYears: [],
    },
    fields: [
      {
        key: "preferenceDaysOfWeek",
        label: "Days to minimize",
        type: "text_list",
        description: "0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat.",
      },
      {
        key: "preferenceCallTypes",
        label: "Call types",
        type: "call_type_multi_select",
        options: CALL_TYPE_OPTIONS,
        description: "Which call types to soft-minimize on those days.",
      },
      {
        key: "preferenceRotationIds",
        label: "Limit to rotations (optional)",
        type: "rotation_multi_select",
        description: "Only applies when resident is on one of these rotations. Leave empty to apply to all rotations.",
      },
      {
        key: "preferencePgyYears",
        label: "Limit to PGY years (optional)",
        type: "pgy_multi_select",
        options: PGY_YEAR_OPTIONS,
        description: "Only applies to these PGY levels. Leave empty to apply to all.",
      },
    ],
  },
];

function sanitizeDayOfWeekArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;
  return Array.from(
    new Set(
      value
        .map((d) => (typeof d === "number" ? d : Number(d)))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    )
  ).sort((a, b) => a - b);
}

function sanitizeStringIdArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;

  const cleaned = Array.from(
    new Set(
      value
        .map((item) => (typeof item === "string" ? item.trim() : ""))
        .filter(Boolean)
    )
  );

  return cleaned.length > 0 ? cleaned : fallback;
}

export const RULE_DEFINITION_MAP: Record<RuleType, RuleDefinition> =
  RULE_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.type] = definition;
    return acc;
  }, {} as Record<RuleType, RuleDefinition>);

/**
 * Lightweight persisted rule shape used by scheduler/generation/validation consumers.
 * This is the canonical "ProgramRule" view. Prefer importing RuleType + RuleConfig + this
 * type from here rather than redefining in component files.
 */
export type ProgramRule = {
  id: string;
  name: string;
  rule_type: RuleType;
  is_enabled: boolean;
  is_hard_rule: boolean;
  config: RuleConfig;
};

/**
 * Scope is currently stored but **not used** by any evaluator, loader, or generator
 * for filtering or conditional application (as of this audit).
 *
 * All rules are effectively "program" scoped today.
 *
 * TODO (future): When multi-program / cohort / service / PGY scoping is implemented,
 * this field will become meaningful. Until then:
 *   - Do not rely on scope for behavior.
 *   - All normalization paths default it to {} or { scope: "program" }.
 */
export const DEFAULT_RULE_SCOPE = {} as Record<string, unknown>;

export function getRuleDefinition(type: RuleType): RuleDefinition {
  return RULE_DEFINITION_MAP[type];
}

export function createDefaultRuleDraft(type: RuleType, id: string): RuleDraft {
  const definition = getRuleDefinition(type);

  return {
    id,
    name: definition.defaultName,
    type,
    enabled: definition.defaultEnabled,
    isHardRule: definition.defaultIsHardRule,
    config: sanitizeRuleConfig(type, definition.defaultConfig),
  };
}

function sanitizeNumber(
  value: unknown,
  fallback: number,
  min?: number,
  max?: number
): number {
  const next =
    typeof value === "number" && !Number.isNaN(value) ? value : fallback;

  if (typeof min === "number" && next < min) return min;
  if (typeof max === "number" && next > max) return max;
  return next;
}

function sanitizeBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitizePgyArray(value: unknown, fallback: number[]): number[] {
  if (!Array.isArray(value)) return fallback;

  const cleaned = Array.from(
    new Set(
      value
        .map((item) => (typeof item === "number" ? item : Number(item)))
        .filter((item) => Number.isInteger(item) && PGY_YEAR_OPTIONS.includes(item))
    )
  ).sort((a, b) => a - b);

  return cleaned.length > 0 ? cleaned : fallback;
}

function sanitizeCallTypeArray(
  value: unknown,
  fallback: CallTypeOption[]
): CallTypeOption[] {
  if (!Array.isArray(value)) return fallback;

  return Array.from(
    new Set(
      value.filter(
        (item): item is CallTypeOption =>
          item === "Primary" || item === "Backup" || item === "Buddy"
      )
    )
  );
}

export function sanitizeRuleConfig(
  type: RuleType,
  incoming: RuleConfig | null | undefined
): RuleConfig {
  const definition = getRuleDefinition(type);
  const next: RuleConfig = {};
  const source = incoming ?? {};

  if (type === "required_daily_call_slots") {
    next.requiredCallTypes = sanitizeCallTypeArray(
      source.requiredCallTypes,
      [...(definition.defaultConfig.requiredCallTypes ?? ["Primary"])]
    );
    if (typeof source.backupRequiredExplicit === "boolean") {
      next.backupRequiredExplicit = source.backupRequiredExplicit;
    }
  }

  if (type === "min_days_between_assignments") {
  next.minDays = sanitizeNumber(
    source.minDays,
    definition.defaultConfig.minDays ?? 2,
    0
  );

  next.excludeAdjacentWeekendPairing = sanitizeBoolean(
    source.excludeAdjacentWeekendPairing,
    definition.defaultConfig.excludeAdjacentWeekendPairing ?? true
  );
}

  if (type === "max_calls_per_month") {
    next.maxCalls = sanitizeNumber(
      source.maxCalls,
      definition.defaultConfig.maxCalls ?? 6,
      0
    );
  }

  if (type === "max_weekends_per_month") {
    next.maxWeekends = sanitizeNumber(
      source.maxWeekends,
      definition.defaultConfig.maxWeekends ?? 2,
      0
    );
  }

  if (type === "restrict_call_type_by_pgy") {
    next.restrictedPgyYears = sanitizePgyArray(
      source.restrictedPgyYears,
      [...(definition.defaultConfig.restrictedPgyYears ?? [5])]
    );
    next.allowedCallTypes = sanitizeCallTypeArray(
      source.allowedCallTypes,
      [...(definition.defaultConfig.allowedCallTypes ?? ["Backup"])]
    );
  }

  if (type === "weekend_pairing") {
    next.sameResidentForWeekend = sanitizeBoolean(
      source.sameResidentForWeekend,
      definition.defaultConfig.sameResidentForWeekend ?? true
    );
  }

  if (type === "restrict_call_by_rotation") {
  next.rotationIds = sanitizeStringIdArray(
    source.rotationIds,
    [...(definition.defaultConfig.rotationIds ?? [])]
  );
  next.blockAllCall = sanitizeBoolean(
    source.blockAllCall,
    definition.defaultConfig.blockAllCall ?? true
  );
  next.restrictedCallTypes = sanitizeCallTypeArray(
    source.restrictedCallTypes,
    [...(definition.defaultConfig.restrictedCallTypes ?? ["Primary", "Backup"])]
  );
  // Optional: restrict this rotation block to specific PGY years.
  // Empty array (default) means the block applies to ALL PGY years.
  next.restrictedPgyYears = sanitizePgyArray(source.restrictedPgyYears ?? [], []);
}

  if (type === "max_calls_for_rotation") {
    next.rotationCallLimitIds = sanitizeStringIdArray(
      source.rotationCallLimitIds,
      []
    );
    const validDayScopes = ["all", "weekend_only", "weekday_only"] as const;
    next.rotationCallLimitDayScope = validDayScopes.includes(
      source.rotationCallLimitDayScope as typeof validDayScopes[number]
    )
      ? (source.rotationCallLimitDayScope as "all" | "weekend_only" | "weekday_only")
      : "weekend_only";
    const rawCallTypes = Array.isArray(source.rotationCallLimitCallTypes)
      ? (source.rotationCallLimitCallTypes as unknown[])
          .filter((t): t is string => typeof t === "string")
      : ["Primary"];
    next.rotationCallLimitCallTypes = rawCallTypes.length > 0 ? rawCallTypes : ["Primary"];
    next.rotationCallLimitMax = sanitizeNumber(
      source.rotationCallLimitMax,
      definition.defaultConfig.rotationCallLimitMax ?? 1,
      0
    );
    next.rotationCallLimitPeriod = "month";
  }

  if (type === "call_slot_definition") {
    next.slotLabel = typeof source.slotLabel === "string" ? source.slotLabel.trim() : (definition.defaultConfig.slotLabel ?? "Primary");
    next.slotShortLabel = typeof source.slotShortLabel === "string" ? source.slotShortLabel.trim() : (definition.defaultConfig.slotShortLabel ?? "1°");
    next.slotCallType = typeof source.slotCallType === "string" ? source.slotCallType.trim() : (definition.defaultConfig.slotCallType ?? "Primary");
    next.slotColorKey = typeof source.slotColorKey === "string" ? source.slotColorKey.trim() : (definition.defaultConfig.slotColorKey ?? "amber");
    const validModes = ["always", "optional", "conditional"] as const;
    next.slotRequiredMode = validModes.includes(source.slotRequiredMode as typeof validModes[number])
      ? (source.slotRequiredMode as "always" | "optional" | "conditional")
      : "always";
    if (Array.isArray(source.slotDaysOfWeek)) {
      next.slotDaysOfWeek = source.slotDaysOfWeek.filter((d) => typeof d === "number" && d >= 0 && d <= 6);
    }
    if (source.slotCondition && typeof source.slotCondition === "object") {
      next.slotCondition = source.slotCondition as SlotCondition;
    }
    next.slotCountsTowardWorkload = typeof source.slotCountsTowardWorkload === "boolean" ? source.slotCountsTowardWorkload : true;
    if (typeof source.slotMaxPerMonth === "number") next.slotMaxPerMonth = source.slotMaxPerMonth;
    next.slotSortOrder = typeof source.slotSortOrder === "number" ? source.slotSortOrder : 0;
    const slotCallType =
      typeof source.slotCallType === "string" ? source.slotCallType : "Primary";
    next.slotRequiredWhenVisible =
      typeof source.slotRequiredWhenVisible === "boolean"
        ? source.slotRequiredWhenVisible
        : slotCallType === "Backup"
        ? false
        : true;
    if (typeof source.backupRequiredExplicit === "boolean") {
      next.backupRequiredExplicit = source.backupRequiredExplicit;
    }
  }

  if (type === "monthly_load_target_by_pgy") {
    next.targetPgyYears = sanitizePgyArray(source.targetPgyYears ?? [], []);
    const validCallTypes = ["Primary", "Backup", "Buddy", "any"];
    next.targetCallType =
      typeof source.targetCallType === "string" && validCallTypes.includes(source.targetCallType)
        ? source.targetCallType
        : "Primary";
    next.targetMinCalls = sanitizeNumber(source.targetMinCalls, 0, 0);
    next.targetMaxCalls = sanitizeNumber(source.targetMaxCalls, 8, 0);
    next.targetHardMaxCalls = sanitizeNumber(source.targetHardMaxCalls, 10, 0);
  }

  if (type === "day_of_week_preference") {
    next.preferenceDaysOfWeek = sanitizeDayOfWeekArray(source.preferenceDaysOfWeek ?? [], [2, 4]);
    const rawPrefCallTypes = Array.isArray(source.preferenceCallTypes)
      ? (source.preferenceCallTypes as unknown[]).filter((t): t is string => typeof t === "string")
      : ["Primary"];
    next.preferenceCallTypes = rawPrefCallTypes.length > 0 ? rawPrefCallTypes : ["Primary"];
    next.preferenceRotationIds = sanitizeStringIdArray(source.preferenceRotationIds ?? [], []);
    next.preferencePgyYears = sanitizePgyArray(source.preferencePgyYears ?? [], []);
  }

  return next;
}

export function validateRuleDraft(rule: RuleDraft): string[] {
  const errors: string[] = [];

  if (!rule.name.trim()) {
    errors.push("Rule name is required.");
  }

  if (rule.type === "min_days_between_assignments") {
  if (
    typeof rule.config.minDays !== "number" ||
    Number.isNaN(rule.config.minDays) ||
    rule.config.minDays < 0
  ) {
    errors.push("Minimum days must be 0 or greater.");
  }
}

  if (rule.type === "required_daily_call_slots") {
    if (
      !Array.isArray(rule.config.requiredCallTypes) ||
      rule.config.requiredCallTypes.length === 0
    ) {
      errors.push("Select at least one required daily call type.");
    }
  }

  if (rule.type === "max_calls_per_month") {
    if (
      typeof rule.config.maxCalls !== "number" ||
      Number.isNaN(rule.config.maxCalls) ||
      rule.config.maxCalls < 0
    ) {
      errors.push("Maximum calls must be 0 or greater.");
    }
  }

  if (rule.type === "max_weekends_per_month") {
    if (
      typeof rule.config.maxWeekends !== "number" ||
      Number.isNaN(rule.config.maxWeekends) ||
      rule.config.maxWeekends < 0
    ) {
      errors.push("Maximum weekends must be 0 or greater.");
    }
  }

  if (rule.type === "restrict_call_type_by_pgy") {
    if (
      !Array.isArray(rule.config.restrictedPgyYears) ||
      rule.config.restrictedPgyYears.length === 0
    ) {
      errors.push("At least one restricted PGY year is required.");
    }
  }

  if (rule.type === "restrict_call_by_rotation") {
  if (
    !Array.isArray(rule.config.rotationIds) ||
    rule.config.rotationIds.length === 0
  ) {
    errors.push("At least one blocked rotation is required.");
  }

  if (rule.config.blockAllCall === false) {
    if (
      !Array.isArray(rule.config.restrictedCallTypes) ||
      rule.config.restrictedCallTypes.length === 0
    ) {
      errors.push(
        "At least one restricted call type is required when not blocking all call."
      );
    }
  }
}

  if (rule.type === "monthly_load_target_by_pgy") {
    if (
      !Array.isArray(rule.config.targetPgyYears) ||
      rule.config.targetPgyYears.length === 0
    ) {
      errors.push("At least one PGY year is required.");
    }
    if (
      typeof rule.config.targetHardMaxCalls === "number" &&
      typeof rule.config.targetMaxCalls === "number" &&
      rule.config.targetHardMaxCalls < rule.config.targetMaxCalls
    ) {
      errors.push("Hard maximum must be ≥ soft maximum.");
    }
    if (
      typeof rule.config.targetMinCalls === "number" &&
      typeof rule.config.targetMaxCalls === "number" &&
      rule.config.targetMinCalls > rule.config.targetMaxCalls
    ) {
      errors.push("Soft minimum must be ≤ soft maximum.");
    }
  }

  if (rule.type === "day_of_week_preference") {
    if (
      !Array.isArray(rule.config.preferenceDaysOfWeek) ||
      rule.config.preferenceDaysOfWeek.length === 0
    ) {
      errors.push("At least one day of week is required.");
    }
    if (
      !Array.isArray(rule.config.preferenceCallTypes) ||
      rule.config.preferenceCallTypes.length === 0
    ) {
      errors.push("At least one call type is required.");
    }
  }

  return errors;
}

/* ============================================================================
   NORMALIZATION / EFFECTIVE RULES LAYER (Phases 3 + 5 + 6)
   Single place for sanitizing, singleton semantics, and "effective" filtering.
   All save paths (manual, AI, future) should go through these.
   ========================================================================== */

/**
 * All current rule types are treated as singletons (one per rule_set).
 * If you add a future multi-instance rule type, remove it from this set.
 */
// call_slot_definition, max_calls_for_rotation, monthly_load_target_by_pgy,
// and day_of_week_preference are intentionally absent — programs may define
// multiple instances of each.
export const SINGLETON_RULE_TYPES: ReadonlySet<RuleType> = new Set<RuleType>([
  "required_daily_call_slots",
  "min_days_between_assignments",
  "max_calls_per_month",
  "max_weekends_per_month",
  "restrict_call_type_by_pgy",
  "weekend_pairing",
  "restrict_call_by_rotation",
]);

export function isSingletonRuleType(type: string): boolean {
  return SINGLETON_RULE_TYPES.has(type as RuleType);
}

/**
 * Produces a normalized rule ready for the replace/save path.
 * Applies canonical sanitization + defaults.
 */
export function normalizeRuleForSave(input: {
  id?: string;
  type: string;
  name: string;
  enabled: boolean;
  isHardRule: boolean;
  config?: Record<string, unknown>;
  priority?: number;
}): {
  type: RuleType;
  name: string;
  enabled: boolean;
  isHardRule: boolean;
  config: RuleConfig;
  priority?: number;
} {
  const type = input.type as RuleType;
  if (!RULE_DEFINITION_MAP[type]) {
    throw new Error(`Unknown rule type: ${type}`);
  }

  const name = (input.name || "").trim() || getRuleDefinition(type).defaultName;
  const enabled = !!input.enabled;
  const isHardRule = !!input.isHardRule;
  const config = sanitizeRuleConfig(type, input.config ?? {});

  return {
    type,
    name,
    enabled,
    isHardRule,
    config,
    priority: input.priority,
  };
}

/** Returns the scope value that should be written for all rules today. */
export function getDefaultRuleScope(): Record<string, unknown> {
  return DEFAULT_RULE_SCOPE;
}

/**
 * Returns rules filtered for "effective" use (generation, validation, availability).
 * By default excludes disabled rules. Pass includeDisabled: true for the editor.
 */
export function getEffectiveRules<T extends { is_enabled?: boolean; enabled?: boolean }>(
  rules: T[] | null | undefined,
  opts: { includeDisabled?: boolean } = {}
): T[] {
  const { includeDisabled = false } = opts;
  if (!rules) return [];
  if (includeDisabled) return [...rules];
  return rules.filter((r) => {
    const enabled = r.is_enabled ?? r.enabled;
    return enabled !== false;
  });
}

/**
 * Given an incoming rule (already normalized), merge it into an existing list
 * using singleton semantics: if a rule of the same type exists, replace it
 * (preserving id when possible). Otherwise append.
 *
 * Used by AI-created path and any future "add one rule" flows.
 */
type MergeableRuleRow = {
  id?: string;
  rule_type?: string;
  type?: string;
  name?: string;
  is_enabled?: boolean;
  enabled?: boolean;
  is_hard_rule?: boolean;
  isHardRule?: boolean;
  config?: Record<string, unknown>;
  priority?: number;
};

export function mergeSingletonRuleIntoList(
  existing: MergeableRuleRow[],
  incoming: {
    type: RuleType;
    name: string;
    enabled: boolean;
    isHardRule: boolean;
    config: RuleConfig;
    id?: string;
  }
): MergeableRuleRow[] {
  const type = incoming.type;
  const idx = existing.findIndex(
    (r) => (r.rule_type ?? r.type) === type
  );

  const normalizedIncoming = {
    id: incoming.id,
    rule_type: type,
    name: incoming.name,
    is_enabled: incoming.enabled,
    is_hard_rule: incoming.isHardRule,
    config: incoming.config,
  };

  if (idx === -1) {
    return [...existing, normalizedIncoming];
  }

  // Replace in place, keep original id if the incoming didn't provide a better one
  const original = existing[idx];
  const merged = {
    ...original,
    ...normalizedIncoming,
    id: incoming.id ?? original.id,
  };

  const next = [...existing];
  next[idx] = merged;
  return next;
}

/**
 * Returns the ordered set of slot definitions that should be visible on a given calendar day.
 *
 * Visibility rules (in priority order):
 *  4. Always show if the slot already has an assignment (backward-compat for old schedules).
 *  1. Show if requiredMode === "always".
 *  2. Show if requiredMode === "optional" (slot is available but not mandatory).
 *  3. Show if requiredMode === "conditional" AND the condition currently evaluates true.
 *
 * The daysOfWeek filter on a slot definition further restricts non-always slots.
 */
export function getVisibleCallSlotsForDay({
  dayOfWeek,
  primaryCallPgyYear,
  assignedCallTypeKeys,
  slotDefinitions,
  buddyDateState,
}: {
  /** 0 = Sunday … 6 = Saturday. undefined = no day-of-week filtering. */
  dayOfWeek?: number;
  /** pgyYear of the resident currently in the Primary slot (for condition evaluation). */
  primaryCallPgyYear?: number | null;
  /** Lowercase callType strings that already have an assignment on this day. */
  assignedCallTypeKeys?: ReadonlySet<string>;
  slotDefinitions: ProgramCallSlotDefinition[];
  buddyDateState?: BuddyDateState | null;
}): ProgramCallSlotDefinition[] {
  const assigned = assignedCallTypeKeys ?? new Set<string>();
  const result: ProgramCallSlotDefinition[] = [];

  for (const def of slotDefinitions) {
    const callTypeLower = def.callType.toLowerCase();
    const hasAssignment = assigned.has(callTypeLower);

    // Rule 4: always show when there is already a saved assignment in this slot.
    if (hasAssignment) {
      result.push(def);
      continue;
    }

    // Days-of-week filter: skip this slot on days it is not configured for.
    if (def.daysOfWeek && def.daysOfWeek.length > 0 && dayOfWeek !== undefined) {
      if (!def.daysOfWeek.includes(dayOfWeek)) continue;
    }

    if (def.callType === "Buddy" && buddyDateState) {
      if (buddyDateState.isVisible || buddyDateState.selectedBuddyRosterId) {
        result.push(def);
      }
      continue;
    }

    if (def.requiredMode === "always" || def.requiredMode === "optional") {
      // Rules 1 & 2: always-required slots and optional (but visible) slots.
      result.push(def);
    } else if (def.requiredMode === "conditional") {
      // Rule 3: only show when the configured condition is satisfied.
      const cond = def.condition;
      if (!cond) continue;

      if (
        cond.type === "when_pgy_scheduled" &&
        primaryCallPgyYear != null &&
        cond.pgyYears.includes(primaryCallPgyYear)
      ) {
        result.push(def);
      }
    }
  }

  return result;
}

export type SlotStatusResult = {
  isVisible: boolean;
  isRequired: boolean;
  reason: string;
};

/**
 * Canonical per-slot status helper used by auto-generation, validation,
 * save/publish filtering, and AI review packet construction.
 *
 * Returns whether a slot is visible on the given day AND whether it is required
 * when visible (i.e., must be filled by generation and flagged if empty by validation).
 *
 * @param def           The slot definition to evaluate.
 * @param dayOfWeek     0=Sunday … 6=Saturday.
 * @param primaryPgyYear PGY year of the resident currently in the Primary slot.
 * @param hasAssignment True when this slot already has an assignment saved (ensures
 *                      backward-compat: assigned slots are always visible).
 */
export function getSlotStatusForDay({
  def,
  dayOfWeek,
  primaryPgyYear,
  hasAssignment = false,
  buddyDateState,
}: {
  def: ProgramCallSlotDefinition;
  dayOfWeek?: number;
  primaryPgyYear?: number | null;
  hasAssignment?: boolean;
  buddyDateState?: BuddyDateState | null;
}): SlotStatusResult {
  let isVisible = false;
  let reason = "hidden";

  if (hasAssignment) {
    isVisible = true;
    reason = "has_assignment";
  } else if (def.callType === "Buddy" && buddyDateState) {
    isVisible = buddyDateState.isVisible;
    reason = buddyDateState.reason;
  } else if (def.requiredMode === "always" || def.requiredMode === "optional") {
    if (def.daysOfWeek && def.daysOfWeek.length > 0 && dayOfWeek !== undefined) {
      isVisible = def.daysOfWeek.includes(dayOfWeek);
      reason = isVisible ? "day_match" : "day_mismatch";
    } else {
      isVisible = true;
      reason = def.requiredMode;
    }
  } else if (def.requiredMode === "conditional") {
    const cond = def.condition;
    if (!cond) {
      isVisible = false;
      reason = "conditional_no_condition";
    } else if (def.daysOfWeek && def.daysOfWeek.length > 0 && dayOfWeek !== undefined) {
      if (!def.daysOfWeek.includes(dayOfWeek)) {
        isVisible = false;
        reason = "day_mismatch";
      } else if (
        cond.type === "when_pgy_scheduled" &&
        primaryPgyYear != null &&
        cond.pgyYears.includes(primaryPgyYear)
      ) {
        isVisible = true;
        reason = `conditional_pgy_match(${primaryPgyYear})`;
      } else {
        isVisible = false;
        reason = `conditional_pgy_no_match(primary_pgy=${primaryPgyYear ?? "null"})`;
      }
    } else if (
      cond.type === "when_pgy_scheduled" &&
      primaryPgyYear != null &&
      cond.pgyYears.includes(primaryPgyYear)
    ) {
      isVisible = true;
      reason = `conditional_pgy_match(${primaryPgyYear})`;
    } else {
      isVisible = false;
      reason = `conditional_pgy_no_match(primary_pgy=${primaryPgyYear ?? "null"})`;
    }
  }

  const isRequired = isVisible && def.requiredWhenVisible !== false;

  if (process.env.NODE_ENV === "development") {
    console.debug("[slot-status]", {
      slotId: def.id,
      slotName: def.label,
      callType: def.callType,
      requiredMode: def.requiredMode,
      requiredWhenVisible: def.requiredWhenVisible,
      dayOfWeek,
      primaryPgyYear,
      hasAssignment,
      isVisible,
      isRequired,
      reason,
    });
  }

  return { isVisible, isRequired, reason };
}

/** Convert a call_slot_definition ProgramRule to a ProgramCallSlotDefinition. */
export function ruleToSlotDefinition(rule: {
  id: string;
  name: string;
  is_enabled?: boolean;
  config: RuleConfig;
}): ProgramCallSlotDefinition {
  const c = rule.config;
  const callType = c.slotCallType ?? "Primary";
  const isBuddySlot = callType === "Buddy";
  return {
    id: rule.id,
    label: c.slotLabel ?? rule.name ?? "Slot",
    shortLabel: c.slotShortLabel ?? "—",
    callType,
    colorKey: c.slotColorKey ?? "amber",
    requiredMode: c.slotRequiredMode ?? "always",
    daysOfWeek: isBuddySlot ? (c.slotDaysOfWeek ?? [5, 6]) : c.slotDaysOfWeek,
    // Buddy visibility is derived from the canonical buddy requirements engine,
    // not from any saved slotCondition that may still reflect older logic.
    condition: isBuddySlot ? undefined : c.slotCondition,
    countsTowardWorkload: c.slotCountsTowardWorkload ?? true,
    maxPerMonth: c.slotMaxPerMonth ?? null,
    sortOrder: c.slotSortOrder ?? 0,
    requiredWhenVisible:
      typeof c.slotRequiredWhenVisible === "boolean"
        ? c.slotRequiredWhenVisible
        : callType === "Backup"
        ? false
        : true,
  };
}

/** Extract and sort slot definitions from a list of program rules. */
export function extractSlotDefinitions(
  rules: Array<{ rule_type?: string; type?: string; id: string; name: string; is_enabled?: boolean; config: RuleConfig }>
): ProgramCallSlotDefinition[] {
  return rules
    .filter((r) => (r.rule_type ?? r.type) === "call_slot_definition" && r.is_enabled !== false)
    .map(ruleToSlotDefinition)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export const DEFAULT_SLOT_DEFINITIONS: ProgramCallSlotDefinition[] = [
  {
    id: "__default_primary",
    label: "Primary",
    shortLabel: "1°",
    callType: "Primary",
    colorKey: "amber",
    requiredMode: "always",
    countsTowardWorkload: true,
    sortOrder: 0,
    requiredWhenVisible: true,
  },
  {
    id: "__default_backup",
    label: "Backup",
    shortLabel: "2°",
    callType: "Backup",
    colorKey: "sky",
    requiredMode: "optional",
    countsTowardWorkload: true,
    sortOrder: 1,
    requiredWhenVisible: false,
  },
];
