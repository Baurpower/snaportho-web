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
} from "lucide-react";
import {
  RULE_DEFINITIONS,
  RuleType,
  RuleDraft,
  createDefaultRuleDraft,
  getRuleDefinition,
  sanitizeRuleConfig,
  validateRuleDraft,
} from "@/lib/workspace/call/rule-definitions";

type ProgramRulesSheetProps = {
  open: boolean;
  onClose: () => void;
};

type RuleSetResponse = {
  ruleSets: Array<{
    id: string;
    name: string;
    description: string | null;
    is_default: boolean;
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
    default:
      return SlidersHorizontal;
  }
}

function getRotationDisplayName(rotation: ProgramRotationOption) {
  return rotation.short_name?.trim() || rotation.name?.trim() || "Unnamed rotation";
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
        <p className="mt-1 text-xs text-slate-500">
          Choose from the official rotations for this program.
        </p>
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
                    active
                      ? "bg-sky-50 hover:bg-sky-100"
                      : "hover:bg-slate-50"
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
                      active
                        ? "bg-sky-600 text-white"
                        : "bg-slate-100 text-slate-600"
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
                Do not count Saturday/Sunday weekend pairings as spacing violations.
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
            placeholder="5"
            className="w-full rounded-[0.95rem] border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
          <p className="mt-1 text-xs text-slate-500">Example: 4, 5</p>
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
    const restrictedCallTypes = Array.isArray(config.restrictedCallTypes)
      ? (config.restrictedCallTypes as ("Primary" | "Backup")[])
      : ["Primary", "Backup"];

    function toggleCallType(callType: "Primary" | "Backup") {
      const exists = restrictedCallTypes.includes(callType);
      const next = exists
        ? restrictedCallTypes.filter((value) => value !== callType)
        : [...restrictedCallTypes, callType];

      updateConfig({
        ...config,
        restrictedCallTypes: next.length > 0 ? next : [callType],
      });
    }

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
                Residents on these rotations are fully removed from the call pool.
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

        {!blockAllCall ? (
          <div>
            <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
              Restricted call types
            </span>
            <div className="flex flex-wrap gap-2">
              <TogglePill
                active={restrictedCallTypes.includes("Primary")}
                label="Primary"
                onClick={() => toggleCallType("Primary")}
                activeClassName="bg-sky-600 text-white"
                inactiveClassName="bg-slate-100 text-slate-700 hover:bg-slate-200"
              />
              <TogglePill
                active={restrictedCallTypes.includes("Backup")}
                label="Backup"
                onClick={() => toggleCallType("Backup")}
                activeClassName="bg-violet-600 text-white"
                inactiveClassName="bg-slate-100 text-slate-700 hover:bg-slate-200"
              />
            </div>
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
          aria-label="Delete rule"
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
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-800">
                This rule needs attention
              </p>
              <ul className="mt-1 space-y-1 text-xs text-amber-700">
                {validationErrors.map((message, index) => (
                  <li key={`${rule.id}-validation-${index}`}>• {message}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : null}
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
}: ProgramRulesSheetProps) {
  const [rules, setRules] = useState<RuleDraft[]>([]);
  const [selectedType, setSelectedType] =
    useState<RuleType>("min_days_between_assignments");
  const [ruleSetId, setRuleSetId] = useState<string | null>(null);
  const [rotationOptions, setRotationOptions] = useState<ProgramRotationOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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
          fetch("/api/program/call-rule-sets", {
            credentials: "include",
          }),
          fetch("/api/program/rotations", {
            credentials: "include",
          }),
        ]);

        const ruleSetPayload: unknown = await ruleSetResponse.json().catch(() => null);
        const rotationsPayload: unknown = await rotationsResponse.json().catch(() => null);

        if (!ruleSetResponse.ok) {
          throw new Error(
            getErrorMessage(ruleSetPayload, "Failed to load rule sets")
          );
        }

        if (!rotationsResponse.ok) {
          throw new Error(
            getErrorMessage(rotationsPayload, "Failed to load program rotations")
          );
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

        if (!nextRuleSetId) {
          setRules([]);
          return;
        }

        const rulesResponse = await fetch(
          `/api/program/call-rules?ruleSetId=${encodeURIComponent(nextRuleSetId)}`,
          {
            credentials: "include",
          }
        );

        const rulesPayload: unknown = await rulesResponse.json().catch(() => null);

        if (!rulesResponse.ok) {
          throw new Error(getErrorMessage(rulesPayload, "Failed to load rules"));
        }

        if (!isRulesResponse(rulesPayload)) {
          throw new Error("Invalid rules response");
        }

        if (cancelled) return;

        setRules(rulesPayload.rules.map(toFrontendRule));
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : "Failed to load rules"
          );
          setRules([]);
          setRuleSetId(null);
          setRotationOptions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadRulesAndRotations();

    return () => {
      cancelled = true;
    };
  }, [open]);

  function addRule() {
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

  async function handleSaveRules() {
    try {
      if (!ruleSetId) {
        throw new Error("No rule set available");
      }

      const invalidRule = rules.find((rule) => validateRuleDraft(rule).length > 0);
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
          rules: rules.map((rule) => ({
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

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Failed to save rules"));
      }

      const refreshedResponse = await fetch(
        `/api/program/call-rules?ruleSetId=${encodeURIComponent(ruleSetId)}`,
        {
          credentials: "include",
        }
      );

      const refreshedPayload: unknown = await refreshedResponse
        .json()
        .catch(() => null);

      if (!refreshedResponse.ok) {
        throw new Error(
          getErrorMessage(refreshedPayload, "Failed to refresh rules")
        );
      }

      if (!isRulesResponse(refreshedPayload)) {
        throw new Error("Invalid refreshed rules response");
      }

      setRules(refreshedPayload.rules.map(toFrontendRule));
      onClose();
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to save rules"
      );
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
            onClick={onClose}
          />

          <motion.div
            className="fixed right-0 top-0 z-[130] flex h-full w-full max-w-[78rem] flex-col border-l border-slate-200 bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
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
                  aria-label="Close rules sheet"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Active rules
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {activeRuleCount}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Hard rules
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {hardRuleCount}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Soft rules
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {softRuleCount}
                  </p>
                </div>

                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Needs review
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {invalidRuleCount}
                  </p>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="px-6 py-5 md:px-8">
                {loadError ? (
                  <div className="mb-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                    {loadError}
                  </div>
                ) : null}

                <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4 text-slate-700" />
                    <p className="text-sm font-semibold text-slate-800">
                      Add a rule
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 lg:grid-cols-2 xl:grid-cols-3">
                    {RULE_DEFINITIONS.map((definition) => (
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
                    rules.map((rule) => (
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
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}