// lib/workspace/call/rule-definitions.ts

export type CallTypeOption = "Primary" | "Backup";

export type RuleType =
  | "required_daily_call_slots"
  | "min_days_between_assignments"
  | "max_calls_per_month"
  | "max_weekends_per_month"
  | "restrict_call_type_by_pgy"
  | "weekend_pairing"
  | "restrict_call_by_rotation";

export type RuleConfig = {
  requiredCallTypes?: CallTypeOption[];

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
];

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
          item === "Primary" || item === "Backup"
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
