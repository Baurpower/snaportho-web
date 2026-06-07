/**
 * Default rule preset for a standard orthopaedic surgery residency program.
 *
 * Usage:
 *   const drafts = createDefaultOrthoRulePreset({ rotationIds: { ... } });
 *   // drafts is an array of RuleDraft objects ready to save.
 *
 * rotationIds maps well-known rotation slot keys to their program_rotations.id values.
 * Keys not provided are simply skipped — the corresponding rules are omitted.
 */

import {
  type RuleDraft,
  sanitizeRuleConfig,
  type CallTypeOption,
} from "@/lib/workspace/call/rule-definitions";

export type OrthoRotationIds = Partial<{
  // PGY-1 Primary call exclusions
  er: string;
  sicu: string;
  rheumatology: string;
  genSurgTrauma: string;
  plasticSurgery: string;
  vascularSurgery: string;
  // PGY-2 Primary call exclusions
  pedsTch: string;
  // PGY-3 Primary call exclusions (pedsTch reused, traumaSa added)
  traumaSa: string;
  // Special rotation limits (PGY-2/3 Oncology weekend-only, max 1)
  oncology: string;
  // Day-of-week soft preference (PGY-2 on Hand or Foot & Ankle)
  hand: string;
  footAndAnkle: string;
  // Buddy eligibility
  genOrtho: string;
  pager: string;
}>;

function makePresetId(key: string): string {
  return `preset-${key}`;
}

function makeSlotDraft(
  key: string,
  opts: {
    label: string;
    shortLabel: string;
    callType: string;
    colorKey: string;
    requiredMode: "always" | "optional" | "conditional";
    countsTowardWorkload: boolean;
    sortOrder: number;
    requiredWhenVisible?: boolean;
    daysOfWeek?: number[];
    condition?: { type: "when_pgy_scheduled"; pgyYears: number[]; sourceSlotCallTypes?: string[] };
  }
): RuleDraft {
  return {
    id: makePresetId(key),
    name: opts.label,
    type: "call_slot_definition",
    enabled: true,
    isHardRule: false,
    config: sanitizeRuleConfig("call_slot_definition", {
      slotLabel: opts.label,
      slotShortLabel: opts.shortLabel,
      slotCallType: opts.callType,
      slotColorKey: opts.colorKey,
      slotRequiredMode: opts.requiredMode,
      slotDaysOfWeek: opts.daysOfWeek,
      slotCondition: opts.condition,
      slotCountsTowardWorkload: opts.countsTowardWorkload,
      slotSortOrder: opts.sortOrder,
      slotRequiredWhenVisible: opts.requiredWhenVisible ?? true,
    }),
  };
}

/**
 * Creates the standard orthopaedic residency call rule preset.
 *
 * Rules created (in order):
 *  1. Call slot definitions: Primary, Backup (conditional on PGY-1/2 primary), Buddy (Fri/Sat)
 *  2. PGY-5 → Backup only
 *  3. No consecutive days (hard)
 *  4. Spacing soft preference (2 days, soft)
 *  5. Weekend pairing (soft)
 *  6. Max weekends per month = 2 (soft)
 *  7. Monthly load targets by PGY (soft + hard max)
 *  8. PGY-1 rotation exclusions from Primary call
 *  9. PGY-2 rotation exclusions from Primary call
 * 10. PGY-3 rotation exclusions from Primary call
 * 11. Oncology PGY-2/3: max 1 Primary/month, weekend only (hard)
 * 12. Minimize Tue/Thu Primary for PGY-2 on Hand or Foot & Ankle (soft)
 */
export function createDefaultOrthoRulePreset(
  rotationIds: OrthoRotationIds = {}
): RuleDraft[] {
  const drafts: RuleDraft[] = [];

  // ── Call Slot Definitions ──────────────────────────────────────────────────

  // Primary: always required
  drafts.push(
    makeSlotDraft("slot-primary", {
      label: "Primary",
      shortLabel: "1°",
      callType: "Primary",
      colorKey: "amber",
      requiredMode: "always",
      countsTowardWorkload: true,
      sortOrder: 0,
      requiredWhenVisible: true,
    })
  );

  // Backup: only required when primary is PGY-1 or PGY-2
  drafts.push(
    makeSlotDraft("slot-backup", {
      label: "Backup",
      shortLabel: "2°",
      callType: "Backup",
      colorKey: "sky",
      requiredMode: "conditional",
      countsTowardWorkload: true,
      sortOrder: 1,
      requiredWhenVisible: true,
      condition: {
        type: "when_pgy_scheduled",
        pgyYears: [1, 2],
        sourceSlotCallTypes: ["Primary"],
      },
    })
  );

  // Buddy: Fri/Sat only. Visibility is determined by the PGY-1 Gen Ortho/Pager
  // monthly Buddy requirement helper rather than by Primary PGY alone.
  drafts.push(
    makeSlotDraft("slot-buddy", {
      label: "Buddy",
      shortLabel: "B°",
      callType: "Buddy",
      colorKey: "violet",
      requiredMode: "conditional",
      countsTowardWorkload: false,
      sortOrder: 2,
      requiredWhenVisible: false,
      daysOfWeek: [5, 6], // Fri, Sat
    })
  );

  // ── PGY Eligibility ────────────────────────────────────────────────────────

  // PGY-5 → Backup only (hard)
  drafts.push({
    id: makePresetId("pgy5-backup-only"),
    name: "PGY-5: Backup call only",
    type: "restrict_call_type_by_pgy",
    enabled: true,
    isHardRule: true,
    config: sanitizeRuleConfig("restrict_call_type_by_pgy", {
      restrictedPgyYears: [5],
      allowedCallTypes: ["Backup"] as CallTypeOption[],
    }),
  });

  // ── Spacing ────────────────────────────────────────────────────────────────

  // No consecutive days (hard, minDays = 1)
  drafts.push({
    id: makePresetId("no-consecutive"),
    name: "No consecutive call days",
    type: "min_days_between_assignments",
    enabled: true,
    isHardRule: true,
    config: sanitizeRuleConfig("min_days_between_assignments", {
      minDays: 1,
      excludeAdjacentWeekendPairing: true,
    }),
  });

  // Spread 2-3 days apart when possible (soft)
  drafts.push({
    id: makePresetId("spacing-soft"),
    name: "Prefer 2-day spacing between calls",
    type: "min_days_between_assignments",
    enabled: true,
    isHardRule: false,
    config: sanitizeRuleConfig("min_days_between_assignments", {
      minDays: 2,
      excludeAdjacentWeekendPairing: true,
    }),
  });

  // ── Weekend Rules ──────────────────────────────────────────────────────────

  drafts.push({
    id: makePresetId("weekend-pairing"),
    name: "Weekend pairing (Sat/Sun same resident)",
    type: "weekend_pairing",
    enabled: true,
    isHardRule: false,
    config: sanitizeRuleConfig("weekend_pairing", {
      sameResidentForWeekend: true,
    }),
  });

  drafts.push({
    id: makePresetId("max-weekends"),
    name: "Max 2 weekends per month",
    type: "max_weekends_per_month",
    enabled: true,
    isHardRule: false,
    config: sanitizeRuleConfig("max_weekends_per_month", { maxWeekends: 2 }),
  });

  // ── Monthly Load Targets by PGY ────────────────────────────────────────────

  const loadTargets: Array<{
    key: string;
    label: string;
    pgyYears: number[];
    min: number;
    softMax: number;
    hardMax: number;
  }> = [
    { key: "pgy1-load", label: "PGY-1 primary call target: 2-3, max 4", pgyYears: [1], min: 2, softMax: 3, hardMax: 4 },
    { key: "pgy2-load", label: "PGY-2 primary call target: 6-7, max 8", pgyYears: [2], min: 6, softMax: 7, hardMax: 8 },
    { key: "pgy3-load", label: "PGY-3 primary call target: 4-6, max 6", pgyYears: [3], min: 4, softMax: 6, hardMax: 6 },
    { key: "pgy4-load", label: "PGY-4 primary call target: 3-4, max 6", pgyYears: [4], min: 3, softMax: 4, hardMax: 6 },
  ];

  for (const target of loadTargets) {
    drafts.push({
      id: makePresetId(target.key),
      name: target.label,
      type: "monthly_load_target_by_pgy",
      enabled: true,
      isHardRule: false,
      config: sanitizeRuleConfig("monthly_load_target_by_pgy", {
        targetPgyYears: target.pgyYears,
        targetCallType: "Primary",
        targetMinCalls: target.min,
        targetMaxCalls: target.softMax,
        targetHardMaxCalls: target.hardMax,
      }),
    });
  }

  // ── PGY-1 Rotation Exclusions from Primary Call ────────────────────────────

  const pgy1ExclusionIds = [
    rotationIds.er,
    rotationIds.sicu,
    rotationIds.rheumatology,
    rotationIds.genSurgTrauma,
    rotationIds.plasticSurgery,
    rotationIds.vascularSurgery,
  ].filter((id): id is string => Boolean(id));

  if (pgy1ExclusionIds.length > 0) {
    drafts.push({
      id: makePresetId("pgy1-rotation-exclusions"),
      name: "PGY-1 rotation exclusions from Primary call",
      type: "restrict_call_by_rotation",
      enabled: true,
      isHardRule: true,
      config: sanitizeRuleConfig("restrict_call_by_rotation", {
        rotationIds: pgy1ExclusionIds,
        blockAllCall: false,
        restrictedCallTypes: ["Primary"] as CallTypeOption[],
        restrictedPgyYears: [1],
      }),
    });
  }

  // ── PGY-2 Rotation Exclusions ──────────────────────────────────────────────

  const pgy2ExclusionIds = [rotationIds.pedsTch].filter(
    (id): id is string => Boolean(id)
  );

  if (pgy2ExclusionIds.length > 0) {
    drafts.push({
      id: makePresetId("pgy2-rotation-exclusions"),
      name: "PGY-2 rotation exclusions from Primary call",
      type: "restrict_call_by_rotation",
      enabled: true,
      isHardRule: true,
      config: sanitizeRuleConfig("restrict_call_by_rotation", {
        rotationIds: pgy2ExclusionIds,
        blockAllCall: false,
        restrictedCallTypes: ["Primary"] as CallTypeOption[],
        restrictedPgyYears: [2],
      }),
    });
  }

  // ── PGY-3 Rotation Exclusions ──────────────────────────────────────────────

  const pgy3ExclusionIds = [rotationIds.pedsTch, rotationIds.traumaSa].filter(
    (id): id is string => Boolean(id)
  );

  if (pgy3ExclusionIds.length > 0) {
    drafts.push({
      id: makePresetId("pgy3-rotation-exclusions"),
      name: "PGY-3 rotation exclusions from Primary call",
      type: "restrict_call_by_rotation",
      enabled: true,
      isHardRule: true,
      config: sanitizeRuleConfig("restrict_call_by_rotation", {
        rotationIds: pgy3ExclusionIds,
        blockAllCall: false,
        restrictedCallTypes: ["Primary"] as CallTypeOption[],
        restrictedPgyYears: [3],
      }),
    });
  }

  // ── Oncology PGY-2/3: max 1 Primary/month, weekend only ───────────────────

  if (rotationIds.oncology) {
    drafts.push({
      id: makePresetId("oncology-weekend-only"),
      name: "Oncology (PGY-2/3): max 1 weekend Primary/month",
      type: "max_calls_for_rotation",
      enabled: true,
      isHardRule: true,
      config: sanitizeRuleConfig("max_calls_for_rotation", {
        rotationCallLimitIds: [rotationIds.oncology],
        rotationCallLimitDayScope: "weekend_only",
        rotationCallLimitCallTypes: ["Primary"],
        rotationCallLimitMax: 1,
        rotationCallLimitPeriod: "month",
      }),
    });
  }

  // ── Day-of-Week Preference: Minimize Tue/Thu for PGY-2 on Hand / F&A ──────

  const handFootIds = [rotationIds.hand, rotationIds.footAndAnkle].filter(
    (id): id is string => Boolean(id)
  );

  if (handFootIds.length > 0) {
    drafts.push({
      id: makePresetId("pgy2-hand-fa-dow"),
      name: "Minimize Tue/Thu Primary call — PGY-2 on Hand or Foot & Ankle",
      type: "day_of_week_preference",
      enabled: true,
      isHardRule: false,
      config: sanitizeRuleConfig("day_of_week_preference", {
        preferenceDaysOfWeek: [2, 4], // Tue=2, Thu=4
        preferenceCallTypes: ["Primary"],
        preferenceRotationIds: handFootIds,
        preferencePgyYears: [2],
      }),
    });
  }

  return drafts;
}
