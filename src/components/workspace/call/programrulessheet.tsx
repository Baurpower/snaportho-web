"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  X,
  Plus,
  Trash2,
  Sparkles,
  Loader2,
  CalendarRange,
  Ban,
  Mountain,
  BriefcaseMedical,
  AlertTriangle,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import {
  RULE_DEFINITIONS,
  RuleType,
  RuleDraft,
  ProgramCallSlotDefinition,
  createDefaultRuleDraft,
  getRuleDefinition,
  sanitizeRuleConfig,
  validateRuleDraft,
} from "@/lib/workspace/call/rule-definitions";

type ProgramRulesSheetProps = {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void | Promise<void>;
  scheduleSlotMode: ScheduleSlotMode;
  onScheduleSlotModeChange: (mode: ScheduleSlotMode) => void;
};

type RuleSetResponse = {
  ruleSets: Array<{
    id: string;
    name: string;
    description: string | null;
    is_default: boolean;
    updated_at?: string;   // present from DB select("*")
    created_at?: string;
  }>;
  defaultRuleSetId: string | null;
};

type RulesResponse = {
  rules: Array<{
    id: string;
    name: string;
    rule_type: RuleType;
    is_enabled: boolean;
    is_hard_rule: boolean;
    config: Record<string, unknown> | null;
  }>;
  ruleSetId: string | null;
};

type ProgramRotationsResponse = {
  rotations: Array<{
    id: string;
    name: string | null;
    short_name: string | null;
    category: string | null;
    is_active: boolean | null;
    sort_order: number | null;
  }>;
};

type ProgramRotationOption = ProgramRotationsResponse["rotations"][number];

type ScheduleSlotMode = "Primary" | "Both";

type AIRuleResponse = {
  rules: Array<{
    rule_type: string;
    name: string;
    is_hard_rule: boolean;
    priority: number;
    scope: Record<string, unknown>;
    config: Record<string, unknown>;
    explanation?: string;
  }>;
  proposedRuleTypes: Array<{
    rule_type: string;
    name: string;
    scope: Record<string, unknown>;
    config: Record<string, unknown>;
    explanation?: string;
  }>;
  warnings: string[];
  unparsedStatements: string[];
};

const REQUIRED_DAILY_CALL_SLOTS_RULE: RuleType = "required_daily_call_slots";

function isRuleSetResponse(value: unknown): value is RuleSetResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "ruleSets" in value &&
    "defaultRuleSetId" in value
  );
}

function isRulesResponse(value: unknown): value is RulesResponse {
  return (
    !!value &&
    typeof value === "object" &&
    "rules" in value &&
    "ruleSetId" in value
  );
}

function isProgramRotationsResponse(
  value: unknown
): value is ProgramRotationsResponse {
  return !!value && typeof value === "object" && "rotations" in value;
}

function getErrorMessage(value: unknown, fallback: string) {
  if (
    value &&
    typeof value === "object" &&
    "error" in value &&
    typeof (value as { error?: unknown }).error === "string"
  ) {
    return (value as { error: string }).error;
  }

  return fallback;
}

function makeId() {
  return `rule-${Math.random().toString(36).slice(2, 10)}`;
}

function parseNumberArray(input: string) {
  return input
    .split(",")
    .map((v) => Number(v.trim()))
    .filter((v) => !Number.isNaN(v));
}

function getRuleIcon(type: RuleType) {
  switch (type) {
    case "required_daily_call_slots":
      return ShieldCheck;
    case "min_days_between_assignments":
      return CalendarRange;
    case "max_calls_per_month":
      return BriefcaseMedical;
    case "max_weekends_per_month":
      return Mountain;
    case "restrict_call_type_by_pgy":
      return Ban;
    case "weekend_pairing":
      return CheckCircle2;
    case "restrict_call_by_rotation":
      return AlertTriangle;
    case "max_calls_for_rotation":
      return BriefcaseMedical;
    default:
      return SlidersHorizontal;
  }
}

function getRotationDisplayName(rotation: ProgramRotationOption) {
  return rotation.short_name?.trim() || rotation.name?.trim() || "Unnamed rotation";
}

function mapAIRuleTypeToFrontendType(ruleType: string): RuleType | null {
  switch (ruleType) {
    case "required_daily_call_slots":
      return "required_daily_call_slots";

    case "minimum_spacing":
    case "avoid_consecutive_call":
    case "min_days_between_assignments":
      return "min_days_between_assignments";

    case "max_monthly_calls":
    case "max_calls_per_month":
      return "max_calls_per_month";

    case "max_weekend_calls":
    case "max_weekends_per_month":
      return "max_weekends_per_month";

    case "pgy_slot_restriction":
    case "restrict_call_type_by_pgy":
      return "restrict_call_type_by_pgy";

    case "weekend_pairing":
      return "weekend_pairing";

    case "restrict_call_by_rotation":
      return "restrict_call_by_rotation";

    default:
      return null;
  }
}

function getScheduleSlotModeFromRules(rules: RuleDraft[]): ScheduleSlotMode | null {
  const matchingRule = rules.find((rule) => rule.type === REQUIRED_DAILY_CALL_SLOTS_RULE);

  if (!matchingRule) return null;

  const requiredCallTypes = Array.isArray(matchingRule.config?.requiredCallTypes)
    ? matchingRule.config.requiredCallTypes
    : [];

  return requiredCallTypes.includes("Backup") ? "Both" : "Primary";
}

/**
 * Syncs the scheduleSlotMode picker into the required_daily_call_slots rule's
 * config.requiredCallTypes **without** overwriting user edits to name, enabled,
 * isHardRule, or other config keys.
 *
 * - If the required rule already exists in the draft list, we mutate ONLY its
 *   requiredCallTypes (then sanitize).
 * - If it does not exist (first time / legacy), we create a default one.
 *
 * This is the key fix for Phase 4: the required slots rule is now a normal
 * persisted rule. The picker is only a convenience that keeps the callTypes
 * in sync during editing. Saving other rules never touches it.
 */
function syncSlotModeIntoRequiredRule(
  rules: RuleDraft[],
  scheduleSlotMode: ScheduleSlotMode
): RuleDraft[] {
  const requiredCallTypes: ("Primary" | "Backup")[] =
    scheduleSlotMode === "Both" ? ["Primary", "Backup"] : ["Primary"];

  const existingIndex = rules.findIndex(
    (rule) => rule.type === REQUIRED_DAILY_CALL_SLOTS_RULE
  );

  if (existingIndex === -1) {
    // Legacy / brand new workspace: create the rule from the picker
    const created = createDefaultRuleDraft(
      REQUIRED_DAILY_CALL_SLOTS_RULE,
      makeId()
    );
    created.config = sanitizeRuleConfig(REQUIRED_DAILY_CALL_SLOTS_RULE, {
      ...created.config,
      requiredCallTypes,
    });
    return [created, ...rules];
  }

  // Normal case: update ONLY the call types on the existing rule draft.
  // User edits to name / hardness / other config are preserved.
  const existing = rules[existingIndex];
  const updated: RuleDraft = {
    ...existing,
    config: sanitizeRuleConfig(REQUIRED_DAILY_CALL_SLOTS_RULE, {
      ...existing.config,
      requiredCallTypes,
    }),
  };

  const next = [...rules];
  next[existingIndex] = updated;
  return next;
}

// Backwards-compatible alias (some internal call sites still use the old name
// during the transition). The old behavior was destructive; the new one is not.
const upsertRequiredDailySlotsRule = syncSlotModeIntoRequiredRule;

type CallPoolCapability = "none" | "primary" | "backup" | "both";

const PGY_YEARS = [1, 2, 3, 4, 5];

function getAllowedCallTypesFromCapability(
  capability: CallPoolCapability
): ("Primary" | "Backup")[] {
  if (capability === "primary") return ["Primary"];
  if (capability === "backup") return ["Backup"];
  if (capability === "both") return ["Primary", "Backup"];
  return [];
}

function getCapabilityFromAllowedCallTypes(
  allowedCallTypes: unknown
): CallPoolCapability {
  if (!Array.isArray(allowedCallTypes)) return "both";

  const hasPrimary = allowedCallTypes.includes("Primary");
  const hasBackup = allowedCallTypes.includes("Backup");

  if (hasPrimary && hasBackup) return "both";
  if (hasPrimary) return "primary";
  if (hasBackup) return "backup";
  return "none";
}

function getPgyCallPoolCapability(
  rules: RuleDraft[],
  pgyYear: number
): CallPoolCapability {
  const matchingRule = rules.find((rule) => {
    if (rule.type !== "restrict_call_type_by_pgy") return false;

    const restrictedPgyYears = Array.isArray(rule.config?.restrictedPgyYears)
      ? rule.config.restrictedPgyYears.map(Number)
      : [];

    return restrictedPgyYears.includes(pgyYear);
  });

  if (!matchingRule) return "both";

  return getCapabilityFromAllowedCallTypes(
    matchingRule.config?.allowedCallTypes
  );
}

function removePgyFromCallPoolRules(rules: RuleDraft[], pgyYear: number) {
  return rules
    .map((rule) => {
      if (rule.type !== "restrict_call_type_by_pgy") return rule;

      const restrictedPgyYears = Array.isArray(rule.config?.restrictedPgyYears)
        ? rule.config.restrictedPgyYears.map(Number)
        : [];

      if (!restrictedPgyYears.includes(pgyYear)) return rule;

      const nextRestrictedPgyYears = restrictedPgyYears.filter(
        (year) => year !== pgyYear
      );

      if (nextRestrictedPgyYears.length === 0) return null;

      return {
        ...rule,
        config: sanitizeRuleConfig(rule.type, {
          ...rule.config,
          restrictedPgyYears: nextRestrictedPgyYears,
        }),
      };
    })
    .filter((rule): rule is RuleDraft => Boolean(rule));
}

function createPgyCallPoolRule(
  pgyYear: number,
  capability: CallPoolCapability
): RuleDraft {
  const allowedCallTypes = getAllowedCallTypesFromCapability(capability);

  return {
    id: makeId(),
    name: `PGY-${pgyYear} call pool`,
    type: "restrict_call_type_by_pgy",
    enabled: true,
    isHardRule: true,
    config: {
      restrictedPgyYears: [pgyYear],
      allowedCallTypes,
    },
  };
}
function convertAIRuleToDraft(aiRule: AIRuleResponse["rules"][number]): RuleDraft | null {
  const frontendType = mapAIRuleTypeToFrontendType(aiRule.rule_type);
  if (!frontendType) return null;

  const scope = aiRule.scope ?? {};
  const config = aiRule.config ?? {};

  let nextConfig: Record<string, unknown> = { ...config };

  if (frontendType === "min_days_between_assignments") {
    nextConfig = {
      minDays:
        typeof config.minDays === "number"
          ? config.minDays
          : typeof config.min_days === "number"
          ? config.min_days
          : typeof config.days === "number"
          ? config.days
          : 2,
      excludeAdjacentWeekendPairing:
        typeof config.excludeAdjacentWeekendPairing === "boolean"
          ? config.excludeAdjacentWeekendPairing
          : true,
    };
  }

  if (frontendType === "max_calls_per_month") {
    nextConfig = {
      maxCalls:
        typeof config.maxCalls === "number"
          ? config.maxCalls
          : typeof config.max_calls === "number"
          ? config.max_calls
          : typeof config.maximum === "number"
          ? config.maximum
          : 6,
    };
  }

  if (frontendType === "max_weekends_per_month") {
    nextConfig = {
      maxWeekends:
        typeof config.maxWeekends === "number"
          ? config.maxWeekends
          : typeof config.max_weekends === "number"
          ? config.max_weekends
          : typeof config.maximum === "number"
          ? config.maximum
          : 2,
    };
  }

  if (frontendType === "restrict_call_type_by_pgy") {
    const pgyYears =
      Array.isArray(scope.pgyYears)
        ? scope.pgyYears
        : Array.isArray(config.pgyYears)
        ? config.pgyYears
        : Array.isArray(config.restrictedPgyYears)
        ? config.restrictedPgyYears
        : [];

    const slot =
      typeof scope.slot === "string"
        ? scope.slot
        : typeof config.slot === "string"
        ? config.slot
        : "Primary";

    nextConfig = {
      restrictedPgyYears: pgyYears
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v)),
      allowedCallTypes:
        slot === "Primary"
          ? ["Backup"]
          : slot === "Backup"
          ? ["Primary"]
          : ["Backup"],
    };
  }

  if (frontendType === "weekend_pairing") {
    nextConfig = {
      sameResidentForWeekend:
        typeof config.sameResidentForWeekend === "boolean"
          ? config.sameResidentForWeekend
          : true,
    };
  }

  return {
    id: makeId(),
    name: aiRule.name || getRuleDefinition(frontendType).label,
    type: frontendType,
    enabled: true,
    isHardRule: Boolean(aiRule.is_hard_rule),
    config: sanitizeRuleConfig(frontendType, nextConfig),
  };
}

function TogglePill({
  active,
  label,
  onClick,
  activeClassName,
  inactiveClassName,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  activeClassName: string;
  inactiveClassName: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        active ? activeClassName : inactiveClassName
      }`}
    >
      {label}
    </button>
  );
}

function RuleTypePickerCard({
  type,
  selected,
  onClick,
}: {
  type: RuleType;
  selected: boolean;
  onClick: () => void;
}) {
  const definition = getRuleDefinition(type);
  const Icon = getRuleIcon(type);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[1.15rem] border p-4 text-left transition ${
        selected
          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl ${
            selected ? "bg-white/10 text-white" : "bg-slate-100 text-slate-700"
          }`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0">
          <p className={`text-sm font-semibold ${selected ? "text-white" : "text-slate-950"}`}>
            {definition.label}
          </p>
          <p className={`mt-1 text-xs leading-5 ${selected ? "text-slate-300" : "text-slate-500"}`}>
            {definition.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function RotationMultiSelect({
  options,
  selectedIds,
  onChange,
}: {
  options: ProgramRotationOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
}) {
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;

    return options.filter((rotation) => {
      const haystack = [
        rotation.short_name ?? "",
        rotation.name ?? "",
        rotation.category ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [options, query]);

  const selectedRotations = useMemo(
    () => options.filter((rotation) => selectedIds.includes(rotation.id)),
    [options, selectedIds]
  );

  function toggleRotation(rotationId: string) {
    const exists = selectedIds.includes(rotationId);
    const next = exists
      ? selectedIds.filter((id) => id !== rotationId)
      : [...selectedIds, rotationId];

    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Blocked rotations
        </span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search official program rotations..."
          className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        />
      </div>

      {selectedRotations.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {selectedRotations.map((rotation) => (
            <button
              key={rotation.id}
              type="button"
              onClick={() => toggleRotation(rotation.id)}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white"
            >
              <span>{getRotationDisplayName(rotation)}</span>
              <X className="h-3.5 w-3.5" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="max-h-56 overflow-y-auto rounded-[1rem] border border-slate-200 bg-white">
        {filteredOptions.length === 0 ? (
          <div className="px-4 py-4 text-sm text-slate-500">
            No matching rotations found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredOptions.map((rotation) => {
              const active = selectedIds.includes(rotation.id);

              return (
                <button
                  key={rotation.id}
                  type="button"
                  onClick={() => toggleRotation(rotation.id)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition ${
                    active ? "bg-sky-50 hover:bg-sky-100" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {getRotationDisplayName(rotation)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                      {rotation.name && rotation.short_name && rotation.name !== rotation.short_name ? (
                        <span>{rotation.name}</span>
                      ) : null}
                      {rotation.category ? <span>{rotation.category}</span> : null}
                    </div>
                  </div>

                  <div
                    className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                      active ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {active ? "Selected" : "Select"}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ScheduleSlotModePicker({
  value,
  onChange,
}: {
  value: ScheduleSlotMode;
  onChange: (mode: ScheduleSlotMode) => void;
}) {
  const options: Array<{ value: ScheduleSlotMode; label: string; helper: string }> = [
    { value: "Primary", label: "Primary only", helper: "No backup call" },
    { value: "Both", label: "Primary + Backup", helper: "Fill both slots" },
  ];

  return (
    <div className="rounded-[1.15rem] border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">Call structure</p>
          <p className="text-xs text-slate-500">
            Choose whether this schedule uses backup call.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-full border border-slate-200 bg-slate-50 p-1">
          {options.map((option) => {
            const active = value === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange(option.value)}
                className={`rounded-full px-4 py-2 text-center transition ${
                  active
                    ? "bg-slate-950 text-white shadow-sm"
                    : "text-slate-500 hover:bg-white hover:text-slate-800"
                }`}
              >
                <span className="block text-xs font-bold">{option.label}</span>
                <span
                  className={`mt-0.5 block text-[10px] font-semibold ${
                    active ? "text-slate-300" : "text-slate-400"
                  }`}
                >
                  {option.helper}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PgyCallPoolBuilder({
  rules,
  onChange,
  scheduleSlotMode,
}: {
  rules: RuleDraft[];
  onChange: (next: RuleDraft[]) => void;
  scheduleSlotMode: ScheduleSlotMode;
}) {
  function updatePgyCapability(
  pgyYear: number,
  capability: CallPoolCapability
) {
  const withoutPgy = removePgyFromCallPoolRules(rules, pgyYear);

  if (capability === "both") {
    onChange(withoutPgy);
    return;
  }

  const nextRule = createPgyCallPoolRule(pgyYear, capability);
  onChange([nextRule, ...withoutPgy]);
}

  const options: Array<{
  value: CallPoolCapability;
  label: string;
}> =
  scheduleSlotMode === "Primary"
    ? [
        { value: "none", label: "None" },
        { value: "primary", label: "Primary" },
      ]
    : [
        { value: "none", label: "None" },
        { value: "primary", label: "Primary" },
        { value: "backup", label: "Backup" },
        { value: "both", label: "Both" },
      ];

  return (
    <div className="rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-bold text-slate-950">Call pool by PGY</p>
          <p className="text-xs text-slate-500">
            Select which call types each PGY level can take.
          </p>
        </div>

        <span className="mt-2 w-fit rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 sm:mt-0">
          Used for auto-generation
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {PGY_YEARS.map((pgyYear) => {
          const activeCapability = getPgyCallPoolCapability(rules, pgyYear);

          return (
            <div
              key={`pgy-call-pool-${pgyYear}`}
              className="flex flex-col gap-2 rounded-[0.95rem] border border-slate-200 bg-slate-50 px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-slate-950 px-2.5 py-1 text-xs font-bold text-white">
                  PGY-{pgyYear}
                </span>

                <span className="text-xs text-slate-500">
                  {activeCapability === "none"
                    ? "Not in call pool"
                    : activeCapability === "primary"
                    ? "Primary call only"
                    : activeCapability === "backup"
                    ? "Backup call only"
                    : "Full call pool"}
                </span>
              </div>

              <div
  className={`grid gap-1 rounded-full border border-slate-200 bg-white p-1 ${
    scheduleSlotMode === "Primary" ? "grid-cols-2" : "grid-cols-4"
  }`}
>
                {options.map((option) => {
                  const selected = activeCapability === option.value;

                  return (
                    <button
                      key={`${pgyYear}-${option.value}`}
                      type="button"
                      onClick={() =>
                        updatePgyCapability(pgyYear, option.value)
                      }
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        selected
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RuleConfigEditor({
  rule,
  onChange,
  rotationOptions,
}: {
  rule: RuleDraft;
  onChange: (next: RuleDraft) => void;
  rotationOptions: ProgramRotationOption[];
}) {
  const config = rule.config ?? {};

  function updateConfig(nextConfig: Record<string, unknown>) {
    onChange({
      ...rule,
      config: sanitizeRuleConfig(rule.type, nextConfig),
    });
  }

  if (rule.type === "min_days_between_assignments") {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Minimum days between assignments
          </span>
          <input
            type="number"
            min={0}
            value={typeof config.minDays === "number" ? config.minDays : 2}
            onChange={(e) =>
              updateConfig({
                ...config,
                minDays: Number(e.target.value),
              })
            }
            className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Ignore paired Sat/Sun weekends
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Do not count Saturday/Sunday pairings as spacing violations.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateConfig({
                  ...config,
                  excludeAdjacentWeekendPairing: !Boolean(
                    config.excludeAdjacentWeekendPairing ?? true
                  ),
                })
              }
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                Boolean(config.excludeAdjacentWeekendPairing ?? true)
                  ? "bg-slate-900"
                  : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  Boolean(config.excludeAdjacentWeekendPairing ?? true)
                    ? "translate-x-6"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rule.type === "max_calls_per_month") {
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Maximum calls per month
        </span>
        <input
          type="number"
          min={0}
          value={typeof config.maxCalls === "number" ? config.maxCalls : 6}
          onChange={(e) =>
            updateConfig({
              ...config,
              maxCalls: Number(e.target.value),
            })
          }
          className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        />
      </label>
    );
  }

  if (rule.type === "max_weekends_per_month") {
    return (
      <label className="block">
        <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Maximum weekends per month
        </span>
        <input
          type="number"
          min={0}
          value={typeof config.maxWeekends === "number" ? config.maxWeekends : 2}
          onChange={(e) =>
            updateConfig({
              ...config,
              maxWeekends: Number(e.target.value),
            })
          }
          className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
        />
      </label>
    );
  }

  if (rule.type === "restrict_call_type_by_pgy") {
    const restrictedPgyYears = Array.isArray(config.restrictedPgyYears)
      ? (config.restrictedPgyYears as number[])
      : [];
    const allowedCallTypes = Array.isArray(config.allowedCallTypes)
      ? (config.allowedCallTypes as ("Primary" | "Backup")[])
      : ["Backup"];

    function toggleCallType(callType: "Primary" | "Backup") {
      const exists = allowedCallTypes.includes(callType);
      const next = exists
        ? allowedCallTypes.filter((value) => value !== callType)
        : [...allowedCallTypes, callType];

      updateConfig({
        ...config,
        allowedCallTypes: next.length > 0 ? next : [callType],
      });
    }

    return (
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Restricted PGY years
          </span>
          <input
            value={restrictedPgyYears.join(", ")}
            onChange={(e) =>
              updateConfig({
                ...config,
                restrictedPgyYears: parseNumberArray(e.target.value),
              })
            }
            placeholder="1"
            className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <div>
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Allowed call types
          </span>
          <div className="flex flex-wrap gap-2">
            <TogglePill
              active={allowedCallTypes.includes("Primary")}
              label="Primary"
              onClick={() => toggleCallType("Primary")}
              activeClassName="bg-sky-600 text-white"
              inactiveClassName="bg-slate-100 text-slate-700 hover:bg-slate-200"
            />
            <TogglePill
              active={allowedCallTypes.includes("Backup")}
              label="Backup"
              onClick={() => toggleCallType("Backup")}
              activeClassName="bg-violet-600 text-white"
              inactiveClassName="bg-slate-100 text-slate-700 hover:bg-slate-200"
            />
          </div>
        </div>
      </div>
    );
  }

  if (rule.type === "weekend_pairing") {
    const sameResidentForWeekend = Boolean(config.sameResidentForWeekend);

    return (
      <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Same resident for Sat/Sun
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Keep the full weekend paired to the same resident.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              updateConfig({
                ...config,
                sameResidentForWeekend: !sameResidentForWeekend,
              })
            }
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
              sameResidentForWeekend ? "bg-slate-900" : "bg-slate-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                sameResidentForWeekend ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>
    );
  }

  if (rule.type === "restrict_call_by_rotation") {
    const rotationIds = Array.isArray(config.rotationIds)
      ? (config.rotationIds as string[])
      : [];
    const blockAllCall =
      typeof config.blockAllCall === "boolean" ? config.blockAllCall : true;

    return (
      <div className="space-y-4">
        <RotationMultiSelect
          options={rotationOptions}
          selectedIds={rotationIds}
          onChange={(nextIds) =>
            updateConfig({
              ...config,
              rotationIds: nextIds,
            })
          }
        />

        <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Block all call
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Residents on these rotations are removed from the call pool.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateConfig({
                  ...config,
                  blockAllCall: !blockAllCall,
                })
              }
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                blockAllCall ? "bg-slate-900" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                  blockAllCall ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (rule.type === "max_calls_for_rotation") {
    const limitIds = Array.isArray(config.rotationCallLimitIds)
      ? (config.rotationCallLimitIds as string[])
      : [];
    const dayScope =
      typeof config.rotationCallLimitDayScope === "string"
        ? (config.rotationCallLimitDayScope as "all" | "weekend_only" | "weekday_only")
        : "weekend_only";
    const limitCallTypes = Array.isArray(config.rotationCallLimitCallTypes)
      ? (config.rotationCallLimitCallTypes as string[])
      : ["Primary"];
    const maxDays =
      typeof config.rotationCallLimitMax === "number"
        ? config.rotationCallLimitMax
        : 1;

    const dayScopeOptions: Array<{
      value: "all" | "weekend_only" | "weekday_only";
      label: string;
    }> = [
      { value: "weekend_only", label: "Weekend calls only" },
      { value: "weekday_only", label: "Weekday calls only" },
      { value: "all", label: "All call days" },
    ];

    const callTypeOptions = ["Primary", "Backup", "Buddy"] as const;

    function toggleCallType(ct: string) {
      const next = limitCallTypes.includes(ct)
        ? limitCallTypes.filter((t) => t !== ct)
        : [...limitCallTypes, ct];
      updateConfig({ ...config, rotationCallLimitCallTypes: next.length > 0 ? next : [ct] });
    }

    // Human-readable preview of the rule.
    const rotationNames = limitIds
      .map((id) => {
        const rot = rotationOptions.find((r) => r.id === id);
        return rot ? getRotationDisplayName(rot) : id;
      })
      .join(", ");
    const previewText =
      limitIds.length > 0
        ? `Residents on ${rotationNames || "selected rotation(s)"} may receive at most ${maxDays} ${
            dayScope === "weekend_only" ? "weekend" : dayScope === "weekday_only" ? "weekday" : ""
          } ${limitCallTypes.join("/")} call day${maxDays === 1 ? "" : "s"} per month.`
        : null;

    return (
      <div className="space-y-4">
        <div>
          <span className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Service / rotation
          </span>
          <RotationMultiSelect
            options={rotationOptions}
            selectedIds={limitIds}
            onChange={(nextIds) =>
              updateConfig({ ...config, rotationCallLimitIds: nextIds })
            }
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Applies to
            </span>
            <div className="flex flex-col gap-1">
              {dayScopeOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    updateConfig({ ...config, rotationCallLimitDayScope: opt.value })
                  }
                  className={`rounded-full px-3 py-1.5 text-left text-xs font-semibold transition ${
                    dayScope === opt.value
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Call types that count
            </span>
            <div className="flex flex-col gap-1">
              {callTypeOptions.map((ct) => (
                <TogglePill
                  key={ct}
                  active={limitCallTypes.includes(ct)}
                  label={ct}
                  onClick={() => toggleCallType(ct)}
                  activeClassName="bg-sky-600 text-white"
                  inactiveClassName="bg-slate-100 text-slate-700 hover:bg-slate-200"
                />
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Maximum per month
            </span>
            <input
              type="number"
              min={0}
              value={maxDays}
              onChange={(e) =>
                updateConfig({ ...config, rotationCallLimitMax: Number(e.target.value) })
              }
              className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>
        </div>

        {previewText ? (
          <div className="rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-800">
            <p className="font-semibold text-sky-950">Rule preview</p>
            <p className="mt-1">{previewText}</p>
          </div>
        ) : null}
      </div>
    );
  }

  return null;
}

function RuleCard({
  rule,
  onChange,
  onDelete,
  rotationOptions,
}: {
  rule: RuleDraft;
  onChange: (next: RuleDraft) => void;
  onDelete: () => void;
  rotationOptions: ProgramRotationOption[];
}) {
  const definition = getRuleDefinition(rule.type);
  const Icon = getRuleIcon(rule.type);
  const validationErrors = validateRuleDraft(rule);

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Icon className="h-5 w-5" />
          </div>

          <div className="min-w-0 flex-1">
            <input
              value={rule.name}
              onChange={(e) => onChange({ ...rule, name: e.target.value })}
              className="w-full bg-transparent text-sm font-semibold text-slate-950 outline-none"
              placeholder={definition.label}
            />
            <p className="mt-1 text-xs text-slate-500">{definition.description}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <TogglePill
          active={rule.enabled}
          label={rule.enabled ? "Enabled" : "Disabled"}
          onClick={() => onChange({ ...rule, enabled: !rule.enabled })}
          activeClassName="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          inactiveClassName="bg-slate-100 text-slate-600 ring-1 ring-slate-200"
        />

        <TogglePill
          active={rule.isHardRule}
          label={rule.isHardRule ? "Hard Rule" : "Soft Rule"}
          onClick={() => onChange({ ...rule, isHardRule: !rule.isHardRule })}
          activeClassName="bg-rose-50 text-rose-700 ring-1 ring-rose-200"
          inactiveClassName="bg-sky-50 text-sky-700 ring-1 ring-sky-200"
        />
      </div>

      <div className="mt-4">
        <RuleConfigEditor
          rule={rule}
          onChange={onChange}
          rotationOptions={rotationOptions}
        />
      </div>

      {validationErrors.length > 0 ? (
        <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm font-semibold text-amber-800">
            This rule needs attention
          </p>
          <ul className="mt-1 space-y-1 text-xs text-amber-700">
            {validationErrors.map((message, index) => (
              <li key={`${rule.id}-validation-${index}`}>• {message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

// ─── Call Slots Section ────────────────────────────────────────────────────────

const SLOT_COLORS = [
  { key: "amber",  label: "Amber",  bg: "bg-amber-100",  ring: "ring-amber-400",  text: "text-amber-800"  },
  { key: "sky",    label: "Sky",    bg: "bg-sky-100",    ring: "ring-sky-400",    text: "text-sky-800"    },
  { key: "violet", label: "Violet", bg: "bg-violet-100", ring: "ring-violet-400", text: "text-violet-800" },
  { key: "emerald",label: "Emerald",bg: "bg-emerald-100",ring: "ring-emerald-400",text: "text-emerald-800"},
  { key: "rose",   label: "Rose",   bg: "bg-rose-100",   ring: "ring-rose-400",   text: "text-rose-800"   },
  { key: "slate",  label: "Slate",  bg: "bg-slate-200",  ring: "ring-slate-400",  text: "text-slate-700"  },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function slotBgClass(colorKey: string) {
  return SLOT_COLORS.find((c) => c.key === colorKey)?.bg ?? "bg-slate-100";
}

function slotRingClass(colorKey: string) {
  return SLOT_COLORS.find((c) => c.key === colorKey)?.ring ?? "ring-slate-300";
}

function slotDraftToDefinition(rule: RuleDraft): ProgramCallSlotDefinition {
  const c = rule.config;
  return {
    id: rule.id,
    label: (c.slotLabel as string) ?? rule.name ?? "Slot",
    shortLabel: (c.slotShortLabel as string) ?? "—",
    callType: (c.slotCallType as string) ?? "Primary",
    colorKey: (c.slotColorKey as string) ?? "amber",
    requiredMode: (c.slotRequiredMode as "always" | "optional" | "conditional") ?? "always",
    daysOfWeek: Array.isArray(c.slotDaysOfWeek) ? (c.slotDaysOfWeek as number[]) : undefined,
    condition: c.slotCondition as ProgramCallSlotDefinition["condition"],
    countsTowardWorkload: typeof c.slotCountsTowardWorkload === "boolean" ? c.slotCountsTowardWorkload : true,
    maxPerMonth: typeof c.slotMaxPerMonth === "number" ? c.slotMaxPerMonth : null,
    sortOrder: typeof c.slotSortOrder === "number" ? c.slotSortOrder : 0,
    requiredWhenVisible: typeof c.slotRequiredWhenVisible === "boolean" ? (c.slotRequiredWhenVisible as boolean) : true,
  };
}

function updateSlotConfig(rule: RuleDraft, patch: Partial<ProgramCallSlotDefinition>): RuleDraft {
  const def = slotDraftToDefinition(rule);
  const merged = { ...def, ...patch };
  return {
    ...rule,
    name: merged.label,
    config: sanitizeRuleConfig("call_slot_definition", {
      slotLabel: merged.label,
      slotShortLabel: merged.shortLabel,
      slotCallType: merged.callType,
      slotColorKey: merged.colorKey,
      slotRequiredMode: merged.requiredMode,
      slotDaysOfWeek: merged.daysOfWeek,
      slotCondition: merged.condition,
      slotCountsTowardWorkload: merged.countsTowardWorkload,
      slotMaxPerMonth: merged.maxPerMonth,
      slotSortOrder: merged.sortOrder,
      slotRequiredWhenVisible: merged.requiredWhenVisible,
    }),
  };
}

function CallSlotCard({
  rule,
  onChange,
  onDelete,
}: {
  rule: RuleDraft;
  onChange: (next: RuleDraft) => void;
  onDelete: () => void;
}) {
  const slot = slotDraftToDefinition(rule);
  const pgyYears = slot.condition?.pgyYears ?? [];

  return (
    <div className={`rounded-[1.15rem] border border-slate-200 bg-white p-4 shadow-sm`}>
      <div className="flex items-start justify-between gap-3">
        <div className={`h-9 w-9 shrink-0 flex items-center justify-center rounded-xl text-xs font-bold ${slotBgClass(slot.colorKey)} ring-1 ${slotRingClass(slot.colorKey)}`}>
          {slot.shortLabel || "—"}
        </div>

        <div className="flex-1 min-w-0 grid gap-3 sm:grid-cols-2">
          {/* Label + short label */}
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Slot name</span>
            <input
              value={slot.label}
              onChange={(e) => onChange(updateSlotConfig(rule, { label: e.target.value }))}
              placeholder="e.g. Primary"
              className="w-full rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Short label</span>
            <input
              value={slot.shortLabel}
              onChange={(e) => onChange(updateSlotConfig(rule, { shortLabel: e.target.value }))}
              placeholder="1°"
              maxLength={4}
              className="w-full rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            />
          </label>

          {/* Call type + color */}
          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Call type</span>
            <select
              value={slot.callType}
              onChange={(e) => onChange(updateSlotConfig(rule, { callType: e.target.value }))}
              className="w-full rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="Primary">Primary</option>
              <option value="Backup">Backup</option>
              <option value="Buddy">Buddy</option>
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">Color</span>
            <div className="flex flex-wrap gap-2 pt-0.5">
              {SLOT_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  title={c.label}
                  onClick={() => onChange(updateSlotConfig(rule, { colorKey: c.key }))}
                  className={`h-7 w-7 rounded-full transition ${c.bg} ring-offset-1 ${slot.colorKey === c.key ? `ring-2 ${c.ring}` : "hover:ring-1 ring-slate-300"}`}
                />
              ))}
            </div>
          </label>

          {/* Required mode */}
          <label className="block sm:col-span-2">
            <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">When to show</span>
            <div className="flex flex-wrap gap-2">
              {(["always", "optional", "conditional"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onChange(updateSlotConfig(rule, { requiredMode: mode }))}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition capitalize ${
                    slot.requiredMode === mode
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {mode === "always" ? "Every day" : mode === "optional" ? "Optional" : "Conditional"}
                </button>
              ))}
            </div>
            {slot.requiredMode === "always" && (
              <p className="mt-1.5 text-[11px] text-slate-400">This slot appears on every day of the schedule.</p>
            )}
            {slot.requiredMode === "optional" && (
              <p className="mt-1.5 text-[11px] text-slate-400">This slot is available but not required. It appears when an assignment exists.</p>
            )}
            {slot.requiredMode === "conditional" && (
              <p className="mt-1.5 text-[11px] text-slate-400">This slot appears when a specific condition is met on that day.</p>
            )}
          </label>

          {/* Days of week (for always/conditional) */}
          {(slot.requiredMode === "always" || slot.requiredMode === "conditional") && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Days of week <span className="normal-case font-normal text-slate-400">(leave blank for all days)</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {DAY_LABELS.map((label, index) => {
                  const active = slot.daysOfWeek ? slot.daysOfWeek.includes(index) : false;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => {
                        const current = slot.daysOfWeek ?? [];
                        const next = active ? current.filter((d) => d !== index) : [...current, index];
                        onChange(updateSlotConfig(rule, { daysOfWeek: next.length > 0 ? next : undefined }));
                      }}
                      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                        active ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </label>
          )}

          {/* Condition (PGY-based) for conditional mode */}
          {slot.requiredMode === "conditional" && (
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
                Appears when which PGY year is assigned to primary?
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[1, 2, 3, 4, 5].map((pgy) => {
                  const active = pgyYears.includes(pgy);
                  return (
                    <button
                      key={pgy}
                      type="button"
                      onClick={() => {
                        const next = active ? pgyYears.filter((y) => y !== pgy) : [...pgyYears, pgy];
                        onChange(updateSlotConfig(rule, {
                          condition: next.length > 0
                            ? { type: "when_pgy_scheduled", pgyYears: next, sourceSlotCallTypes: ["Primary"] }
                            : undefined,
                        }));
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                        active ? "bg-violet-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      PGY-{pgy}
                    </button>
                  );
                })}
              </div>
            </label>
          )}

          {/* Required when visible */}
          <div className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">Required when visible</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {slot.requiredWhenVisible
                  ? "Auto-generation must fill this slot when visible. Validation flags it if empty."
                  : "This slot is optional when visible. Auto-generation may fill it but validation ignores it if empty."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onChange(updateSlotConfig(rule, { requiredWhenVisible: !slot.requiredWhenVisible }))}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${slot.requiredWhenVisible ? "bg-slate-900" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${slot.requiredWhenVisible ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>

          {/* Counts toward workload */}
          <div className="flex items-center justify-between gap-3 rounded-[0.85rem] border border-slate-200 bg-slate-50 px-3 py-2.5 sm:col-span-2">
            <div>
              <p className="text-xs font-semibold text-slate-800">Counts toward workload</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Include in fairness balancing and call totals.</p>
            </div>
            <button
              type="button"
              onClick={() => onChange(updateSlotConfig(rule, { countsTowardWorkload: !slot.countsTowardWorkload }))}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition ${slot.countsTowardWorkload ? "bg-slate-900" : "bg-slate-300"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${slot.countsTowardWorkload ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={onDelete}
          className="ml-1 shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-400 transition hover:bg-slate-50 hover:text-rose-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

const DEFAULT_SLOT_CONFIGS: Array<Partial<ProgramCallSlotDefinition> & { label: string }> = [
  { label: "Primary", shortLabel: "1°", callType: "Primary", colorKey: "amber", requiredMode: "always", countsTowardWorkload: true, sortOrder: 0, requiredWhenVisible: true },
  { label: "Backup", shortLabel: "2°", callType: "Backup", colorKey: "sky", requiredMode: "optional", countsTowardWorkload: true, sortOrder: 1, requiredWhenVisible: true },
  { label: "Buddy", shortLabel: "B°", callType: "Buddy", colorKey: "violet", requiredMode: "conditional", countsTowardWorkload: false, sortOrder: 2, requiredWhenVisible: false },
];

const WEEKEND_BUDDY_SHORTCUT_NAME = "Weekend Buddy Option";

const WEEKEND_BUDDY_SHORTCUT_DEF: Partial<ProgramCallSlotDefinition> = {
  label: "Buddy",
  shortLabel: "B°",
  callType: "Buddy",
  colorKey: "violet",
  requiredMode: "conditional",
  daysOfWeek: [5, 6],
  condition: {
    type: "when_pgy_scheduled",
    pgyYears: [4],
    sourceSlotCallTypes: ["Primary"],
  },
  countsTowardWorkload: false,
  sortOrder: 2,
  requiredWhenVisible: false,
};

function isWeekendBuddyShortcutRule(rule: RuleDraft) {
  if (rule.type !== "call_slot_definition") return false;
  const slot = slotDraftToDefinition(rule);

  return (
    rule.name === WEEKEND_BUDDY_SHORTCUT_NAME &&
    slot.label === "Buddy" &&
    slot.shortLabel === "B°" &&
    slot.callType === "Buddy" &&
    slot.requiredMode === "conditional" &&
    slot.countsTowardWorkload === false &&
    slot.requiredWhenVisible === false &&
    JSON.stringify([...(slot.daysOfWeek ?? [])].sort()) === JSON.stringify([5, 6]) &&
    slot.condition?.type === "when_pgy_scheduled" &&
    JSON.stringify([...(slot.condition?.pgyYears ?? [])].sort()) === JSON.stringify([4])
  );
}

function makeSlotRule(preset?: Partial<ProgramCallSlotDefinition>): RuleDraft {
  const base: Partial<ProgramCallSlotDefinition> = preset ?? DEFAULT_SLOT_CONFIGS[0];
  return {
    id: makeId(),
    name: base.label ?? "Slot",
    type: "call_slot_definition",
    enabled: true,
    isHardRule: false,
    config: sanitizeRuleConfig("call_slot_definition", {
      slotLabel: base.label ?? "Primary",
      slotShortLabel: base.shortLabel ?? "1°",
      slotCallType: base.callType ?? "Primary",
      slotColorKey: base.colorKey ?? "amber",
      slotRequiredMode: base.requiredMode ?? "always",
      slotDaysOfWeek: base.daysOfWeek,
      slotCondition: base.condition,
      slotCountsTowardWorkload: base.countsTowardWorkload ?? true,
      slotMaxPerMonth: base.maxPerMonth,
      slotSortOrder: base.sortOrder ?? 0,
    }),
  };
}

function makeWeekendBuddyShortcutRule() {
  return {
    ...makeSlotRule(WEEKEND_BUDDY_SHORTCUT_DEF),
    name: WEEKEND_BUDDY_SHORTCUT_NAME,
  };
}

function CallSlotsSection({
  slots,
  onChange,
}: {
  slots: RuleDraft[];
  onChange: (next: RuleDraft[]) => void;
}) {
  const [addPreset, setAddPreset] = React.useState<string>("Primary");
  const weekendBuddyEnabled = slots.some(isWeekendBuddyShortcutRule);

  function addSlot() {
    const preset = DEFAULT_SLOT_CONFIGS.find((p) => p.label === addPreset) ?? DEFAULT_SLOT_CONFIGS[0];
    const existing = slots.length;
    onChange([...slots, makeSlotRule({ ...preset, sortOrder: existing })]);
  }

  function toggleWeekendBuddyShortcut() {
    if (weekendBuddyEnabled) {
      onChange(slots.filter((slot) => !isWeekendBuddyShortcutRule(slot)));
      return;
    }

    onChange([...slots, makeWeekendBuddyShortcutRule()]);
  }

  function updateSlot(id: string, next: RuleDraft) {
    onChange(slots.map((s) => (s.id === id ? next : s)));
  }

  function deleteSlot(id: string) {
    onChange(slots.filter((s) => s.id !== id));
  }

  return (
    <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100">
          <CalendarRange className="h-4 w-4 text-violet-700" />
        </div>
        <div>
          <p className="text-sm font-bold text-slate-950">Call Locations / Slots</p>
          <p className="text-xs text-slate-500">Define which assignment slots appear on the schedule calendar each day.</p>
        </div>
      </div>

      {slots.length === 0 ? (
        <div className="mt-3 rounded-[1rem] border border-dashed border-slate-200 bg-white px-4 py-5 text-center">
          <p className="text-sm font-semibold text-slate-700">No slots defined</p>
          <p className="mt-1 text-xs text-slate-500">Add at least a Primary slot. The calendar uses defaults (Primary + Backup) when none are configured.</p>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {slots.map((slot) => (
            <CallSlotCard
              key={slot.id}
              rule={slot}
              onChange={(next) => updateSlot(slot.id, next)}
              onDelete={() => deleteSlot(slot.id)}
            />
          ))}
        </div>
      )}

      <div className="mt-3 rounded-[1rem] border border-violet-200 bg-violet-50/70 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Enable PGY-4 Weekend Buddy Option</p>
            <p className="mt-1 text-xs text-slate-600">
              When a PGY-4 resident is assigned Primary call on Friday or Saturday, an optional Buddy slot becomes available.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleWeekendBuddyShortcut}
            className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition ${
              weekendBuddyEnabled
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "border border-violet-200 bg-white text-violet-700 hover:bg-violet-100"
            }`}
          >
            <Wand2 className="h-3.5 w-3.5" />
            {weekendBuddyEnabled ? "Enabled" : "Enable"}
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          value={addPreset}
          onChange={(e) => setAddPreset(e.target.value)}
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none"
        >
          {DEFAULT_SLOT_CONFIGS.map((p) => (
            <option key={p.label} value={p.label}>{p.label}</option>
          ))}
          <option value="custom">Custom</option>
        </select>
        <button
          type="button"
          onClick={addSlot}
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add slot
        </button>
      </div>
    </div>
  );
}

function toFrontendRule(rule: RulesResponse["rules"][number]): RuleDraft {
  return {
    id: rule.id,
    name: rule.name,
    type: rule.rule_type,
    enabled: rule.is_enabled,
    isHardRule: rule.is_hard_rule,
    config: sanitizeRuleConfig(rule.rule_type, rule.config ?? {}),
  };
}

export default function ProgramRulesSheet({
  open,
  onClose,
  onSaved,
  scheduleSlotMode,
  onScheduleSlotModeChange,
}: ProgramRulesSheetProps) {
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [selectedType, setSelectedType] =
    useState<RuleType>("min_days_between_assignments");
  const [ruleSetId, setRuleSetId] = useState<string | null>(null);
  const [ruleSetUpdatedAt, setRuleSetUpdatedAt] = useState<string | null>(null); // for staleness guard
  const [rotationOptions, setRotationOptions] = useState<ProgramRotationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [aiOpen, setAiOpen] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiParsed, setAiParsed] = useState<AIRuleResponse | null>(null);

  const activeRuleCount = useMemo(
    () => rules.filter((rule) => rule.enabled).length,
    [rules]
  );

  const hardRuleCount = useMemo(
    () => rules.filter((rule) => rule.enabled && rule.isHardRule).length,
    [rules]
  );

  const softRuleCount = useMemo(
    () => rules.filter((rule) => rule.enabled && !rule.isHardRule).length,
    [rules]
  );

  const invalidRuleCount = useMemo(
    () => rules.filter((rule) => validateRuleDraft(rule).length > 0).length,
    [rules]
  );

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadRulesAndRotations() {
      try {
        setLoading(true);
        setLoadError(null);
        setRules([]);
        setRuleSetId(null);
        setRotationOptions([]);

        const [ruleSetResponse, rotationsResponse] = await Promise.all([
          fetch("/api/program/call-rule-sets", { credentials: "include" }),
          fetch("/api/program/rotations", { credentials: "include" }),
        ]);

        const ruleSetPayload: unknown = await ruleSetResponse.json().catch(() => null);
        const rotationsPayload: unknown = await rotationsResponse.json().catch(() => null);

        if (!ruleSetResponse.ok) {
          throw new Error(getErrorMessage(ruleSetPayload, "Failed to load rule sets"));
        }

        if (!rotationsResponse.ok) {
          throw new Error(getErrorMessage(rotationsPayload, "Failed to load program rotations"));
        }

        if (!isRuleSetResponse(ruleSetPayload)) {
          throw new Error("Invalid rule set response");
        }

        if (!isProgramRotationsResponse(rotationsPayload)) {
          throw new Error("Invalid rotations response");
        }

        if (cancelled) return;

        setRotationOptions(rotationsPayload.rotations ?? []);

        const nextRuleSetId = ruleSetPayload.defaultRuleSetId;
        setRuleSetId(nextRuleSetId);

        // Capture rule set updated_at for optimistic locking on save (Phase 7 wiring)
        const defaultRs = ruleSetPayload.ruleSets.find(
          (rs) => rs.id === nextRuleSetId
        );
        setRuleSetUpdatedAt(defaultRs?.updated_at ?? null);

        if (!nextRuleSetId) {
          setRules([]);
          setRuleSetUpdatedAt(null);
          return;
        }

        const rulesResponse = await fetch(
          `/api/program/call-rules?ruleSetId=${encodeURIComponent(nextRuleSetId)}`,
          { credentials: "include" }
        );

        const rulesPayload: unknown = await rulesResponse.json().catch(() => null);

        if (!rulesResponse.ok) {
          throw new Error(getErrorMessage(rulesPayload, "Failed to load rules"));
        }

        if (!isRulesResponse(rulesPayload)) {
          throw new Error("Invalid rules response");
        }

        if (cancelled) return;

        const nextRules = rulesPayload.rules.map(toFrontendRule);
        const persistedSlotMode = getScheduleSlotModeFromRules(nextRules);

        if (persistedSlotMode) {
          onScheduleSlotModeChange(persistedSlotMode);
        }

        setRules(nextRules);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load rules");
          setRules([]);
          setRuleSetId(null);
          setRuleSetUpdatedAt(null);
          setRotationOptions([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadRulesAndRotations();

    return () => {
      cancelled = true;
    };
  }, [open, onScheduleSlotModeChange]);

  function addRule() {
    if (selectedType === REQUIRED_DAILY_CALL_SLOTS_RULE) {
      return;
    }

    const created = createDefaultRuleDraft(selectedType, makeId());
    setRules((prev) => [created, ...prev]);
  }

  function updateRule(ruleId: string, next: RuleDraft) {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId
          ? {
              ...next,
              config: sanitizeRuleConfig(next.type, next.config ?? {}),
            }
          : rule
      )
    );
  }

  function deleteRule(ruleId: string) {
    setRules((prev) => prev.filter((rule) => rule.id !== ruleId));
  }

  async function parseAiRule() {
    try {
      setAiLoading(true);
      setAiError(null);
      setAiParsed(null);

      const response = await fetch("/api/program/call-rules/parse", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: aiText }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Failed to generate rule"));
      }

    setAiParsed({
      rules: Array.isArray(payload?.rules) ? payload.rules : [],
      proposedRuleTypes: Array.isArray(payload?.proposedRuleTypes)
        ? payload.proposedRuleTypes
        : [],
      warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
      unparsedStatements: Array.isArray(payload?.unparsedStatements)
        ? payload.unparsedStatements
        : [],
    });
  } catch (error) {
    setAiError(error instanceof Error ? error.message : "Failed to generate rule");
    setAiParsed(null);
  } finally {
    setAiLoading(false);
  }
}

  function addAiRulesToDraft() {
    if (!aiParsed) return;

    const converted = aiParsed.rules
      .map(convertAIRuleToDraft)
      .filter((rule): rule is RuleDraft => Boolean(rule));

    if (converted.length === 0) {
      setAiError("No supported rules were generated from that text.");
      return;
    }

    setRules((prev) => [...converted, ...prev]);
    setAiOpen(false);
    setAiText("");
    setAiParsed(null);
    setAiError(null);
  }

async function submitProposedRuleType() {
  if (!aiParsed || aiParsed.proposedRuleTypes.length === 0) return;

  try {
    setAiLoading(true);
    setAiError(null);

    const response = await fetch("/api/program/call-rules/type-requests", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        originalText: aiText,
        proposedRuleType: aiParsed.proposedRuleTypes[0],
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(getErrorMessage(payload, "Failed to submit rule request"));
    }

    setAiOpen(false);
    setAiText("");
    setAiParsed(null);
    setAiError(null);
  } catch (error) {
    setAiError(
      error instanceof Error ? error.message : "Failed to submit rule request"
    );
  } finally {
    setAiLoading(false);
  }
}

  async function handleSaveRules() {
    try {
      if (!ruleSetId) throw new Error("No rule set available");

      const rulesToSave = upsertRequiredDailySlotsRule(rules, scheduleSlotMode);

      const invalidRule = rulesToSave.find((rule) => validateRuleDraft(rule).length > 0);
      if (invalidRule) {
        throw new Error(
          `Fix "${invalidRule.name || getRuleDefinition(invalidRule.type).label}" before saving`
        );
      }

      setSaving(true);
      setLoadError(null);

      const response = await fetch("/api/program/call-rules", {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ruleSetId,
          // Send the timestamp we captured on load so the server can detect concurrent edits
          previousRuleSetUpdatedAt: ruleSetUpdatedAt,
          rules: rulesToSave.map((rule) => ({
            id: rule.id.startsWith("rule-") ? undefined : rule.id,
            name: rule.name.trim(),
            type: rule.type,
            enabled: rule.enabled,
            isHardRule: rule.isHardRule,
            config: sanitizeRuleConfig(rule.type, rule.config ?? {}),
          })),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (response.status === 409) {
        // Staleness conflict — another user/session edited the rules since we loaded
        const msg =
          payload?.error ||
          "These rules were updated elsewhere. Reload the latest version before saving.";
        setLoadError(msg);
        // Do not call onSaved or close — user must reload first (existing pattern: close sheet + reopen, or use the load error)
        return;
      }

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Failed to save rules"));
      }

      // Refresh our local copy of the rule set timestamp if server returns the fresh value
      if (payload?.ruleSetUpdatedAt) {
        setRuleSetUpdatedAt(payload.ruleSetUpdatedAt);
      } else {
        // Fallback: if server didn't return it yet, we could re-fetch, but for minimal change we leave it.
        // The next full load (sheet reopen or manager) will get the latest anyway.
      }

      await onSaved?.();
      onClose();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Failed to save rules");
    } finally {
      setSaving(false);
    }
  }

  return (
  <AnimatePresence>
    {open ? (
      <>
        <motion.div
          className="fixed inset-0 z-[120] bg-slate-950/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />

        <motion.div
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 md:p-8"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18 }}
        >
          <div className="flex h-full max-h-[92vh] w-full max-w-[78rem] flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
            <div className="shrink-0 border-b border-slate-200 px-6 py-5 md:px-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    <Settings2 className="h-3.5 w-3.5" />
                    Program Rules
                  </div>

                  <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                    Call Schedule Rules
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Define the logic your scheduler should follow across spacing,
                    weekends, PGY restrictions, and official program rotations.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {[
                  ["Active rules", activeRuleCount],
                  ["Hard rules", hardRuleCount],
                  ["Soft rules", softRuleCount],
                  ["Needs review", invalidRuleCount],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      {label}
                    </p>
                    <p className="mt-2 text-2xl font-black text-slate-950">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
  <div className="px-6 py-5 md:px-8">
    {loadError ? (
      <div className="mb-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {loadError}
      </div>
    ) : null}

    <CallSlotsSection
      slots={rules.filter((r) => r.type === "call_slot_definition")}
      onChange={(nextSlots) => {
        setRules((prev) => [
          ...prev.filter((r) => r.type !== "call_slot_definition"),
          ...nextSlots,
        ]);
      }}
    />

    <div className="mt-4">
    <ScheduleSlotModePicker
  value={scheduleSlotMode}
  onChange={(mode) => {
    onScheduleSlotModeChange(mode);
    setRules((prev) => upsertRequiredDailySlotsRule(prev, mode));
  }}
/>
    </div>

<div className="mt-4">
  <PgyCallPoolBuilder
  rules={rules}
  onChange={setRules}
  scheduleSlotMode={scheduleSlotMode}
/>
</div>

    <div className="mt-5 rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-slate-700" />
          <p className="text-sm font-semibold text-slate-800">
            Add a rule
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAiOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-sky-200 bg-white px-4 text-sm font-semibold text-sky-800 shadow-sm transition hover:bg-sky-50"
        >
          <Wand2 className="h-4 w-4" />
          Add custom rule with AI
        </button>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
        {RULE_DEFINITIONS.filter(
          (definition) =>
            definition.type !== REQUIRED_DAILY_CALL_SLOTS_RULE &&
            definition.type !== "call_slot_definition"
        ).map((definition) => (
          <RuleTypePickerCard
            key={definition.type}
            type={definition.type}
            selected={selectedType === definition.type}
            onClick={() => setSelectedType(definition.type)}
          />
        ))}
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={addRule}
          className="inline-flex h-[48px] items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          Add rule
        </button>
      </div>
    </div>

    <div className="mt-5 space-y-4">
      {loading ? (
        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-5 py-10 text-center">
          <Loader2 className="mx-auto h-6 w-6 animate-spin text-slate-500" />
          <p className="mt-3 text-sm text-slate-500">
            Loading rules...
          </p>
        </div>
      ) : rules.length === 0 ? (
        <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-800">
            No rules yet
          </p>
          <p className="mt-1 text-sm text-slate-500">
            Add your first rule to start defining program logic.
          </p>
        </div>
      ) : (
  rules
    .filter((rule) => {
      if (rule.type === "call_slot_definition") return false;
      if (rule.type !== "restrict_call_type_by_pgy") return true;
      return !rule.name.toLowerCase().includes("call pool");
    })
    .map((rule) => (
      <RuleCard
        key={rule.id}
        rule={rule}
        onChange={(next) => updateRule(rule.id, next)}
        onDelete={() => deleteRule(rule.id)}
        rotationOptions={rotationOptions}
      />
    ))
)}
    </div>
  </div>
</div>

            <div className="shrink-0 border-t border-slate-200 px-6 py-4 md:px-8">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="inline-flex items-center gap-2 text-sm text-slate-500">
                  <Sparkles className="h-4 w-4" />
                  These rules save to your program backend and drive scheduling logic.
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveRules}
                    disabled={saving || loading}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {saving ? "Saving..." : "Save rules"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <AnimatePresence>
            {aiOpen ? (
              <motion.div
                className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-3xl overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-2xl"
                  initial={{ scale: 0.96, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.96, opacity: 0 }}
                >
                  <div className="border-b border-slate-200 px-6 py-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                          <Wand2 className="h-3.5 w-3.5" />
                          AI Rule Builder
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-slate-950">
                          Add a custom rule
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          Type the rule in plain English. You can review it before saving.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAiOpen(false)}
                        className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>

                  <div className="max-h-[65vh] overflow-y-auto px-6 py-5">
                    <textarea
                      value={aiText}
                      onChange={(e) => setAiText(e.target.value)}
                      placeholder="Example: PGY-1 residents cannot take primary call. No resident should have more than 2 weekends per month. Avoid back-to-back call unless unavoidable."
                      className="min-h-36 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />

                    {aiError ? (
                      <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {aiError}
                      </div>
                    ) : null}

                    {aiParsed ? (
                      <div className="mt-5 space-y-4">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                          <p className="text-sm font-bold text-slate-950">
                            Detected rules
                          </p>

                          {aiParsed.rules.length === 0 ? (
                            <p className="mt-2 text-sm text-slate-500">
                              No supported rules were detected.
                            </p>
                          ) : (
                            <div className="mt-3 space-y-3">
                              {aiParsed.rules.map((rule, index) => (
                                <div
                                  key={`ai-rule-${index}`}
                                  className="rounded-[1rem] border border-slate-200 bg-white p-4"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="text-sm font-semibold text-slate-950">
                                      {rule.name}
                                    </p>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                                        rule.is_hard_rule
                                          ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                                          : "bg-sky-50 text-sky-700 ring-1 ring-sky-200"
                                      }`}
                                    >
                                      {rule.is_hard_rule ? "Hard rule" : "Soft rule"}
                                    </span>
                                  </div>

                                  <p className="mt-2 text-xs text-slate-500">
                                    Type: {rule.rule_type}
                                  </p>

                                  {rule.explanation ? (
                                    <p className="mt-2 text-sm text-slate-600">
                                      {rule.explanation}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {aiParsed.proposedRuleTypes.length > 0 ? (
                          <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50 p-4">
                            <p className="text-sm font-bold text-sky-950">
                              New rule type suggested
                            </p>

                            <div className="mt-3 space-y-3">
                              {aiParsed.proposedRuleTypes.map((rule, index) => (
                                <div
                                  key={`proposed-rule-${index}`}
                                  className="rounded-[1rem] border border-sky-200 bg-white p-4"
                                >
                                  <p className="text-sm font-semibold text-slate-950">
                                    {rule.name}
                                  </p>

                                  <p className="mt-2 text-xs text-slate-500">
                                    Proposed type: {rule.rule_type}
                                  </p>

                                  {rule.explanation ? (
                                    <p className="mt-2 text-sm text-slate-600">
                                      {rule.explanation}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>

                            <p className="mt-3 text-xs text-sky-800">
                              This rule is not supported by the scheduler yet. Submit it for review so it can be added as a future rule type.
                            </p>
                          </div>
                        ) : null}

                        {aiParsed.warnings.length > 0 ? (
                          <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3">
                            <p className="text-sm font-semibold text-amber-800">
                              Warnings
                            </p>
                            <ul className="mt-1 space-y-1 text-xs text-amber-700">
                              {aiParsed.warnings.map((warning, index) => (
                                <li key={`warning-${index}`}>• {warning}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {aiParsed.unparsedStatements.length > 0 ? (
                          <div className="rounded-[1rem] border border-slate-200 bg-white px-4 py-3">
                            <p className="text-sm font-semibold text-slate-800">
                              Could not fully parse
                            </p>
                            <ul className="mt-1 space-y-1 text-xs text-slate-500">
                              {aiParsed.unparsedStatements.map((statement, index) => (
                                <li key={`unparsed-${index}`}>• {statement}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-slate-200 px-6 py-4">
                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setAiOpen(false)}
                        className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={parseAiRule}
                        disabled={aiLoading || !aiText.trim()}
                        className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {aiLoading ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Wand2 className="h-4 w-4" />
                        )}
                        {aiLoading ? "Generating..." : "Generate rule"}
                      </button>

                      {aiParsed && aiParsed.rules.length > 0 ? (
                        <button
                          type="button"
                          onClick={addAiRulesToDraft}
                          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Add detected rules
                        </button>
                      ) : null}

                      {aiParsed &&
                      aiParsed.rules.length === 0 &&
                      aiParsed.proposedRuleTypes.length > 0 ? (
                        <button
                          type="button"
                          onClick={submitProposedRuleType}
                          disabled={aiLoading}
                          className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
                        >
                          Submit new rule request
                        </button>
                      ) : null}
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </>
    ) : null}
  </AnimatePresence>
);
}
