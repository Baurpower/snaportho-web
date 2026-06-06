"use client";

import React, { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import type {
  AssignmentFlag,
  CalendarDay,
  DraftDayAssignment,
  ExistingResidentStats,
  ProgramAvailabilityMonthResponse,
  ProgramCallSlotDefinition,
  ProgramRule,
  ResidentOption,
} from "@/components/workspace/call/programcalltypes";
import { getFlagsForAssignedResident } from "@/components/workspace/call/programcallevaluator";
import { getRequiredCallTypesFromRules } from "@/lib/workspace/call/rule-evaluator";
import { getSlotStatusForDay } from "@/lib/workspace/call/rule-definitions";

type Slot = "Primary" | "Backup" | "Buddy";
type ScheduleSlotMode = "Primary" | "Both";

type ReviewRow = {
  resident: ResidentOption;
  monthPrimary: number;
  monthBackup: number;
  monthTotal: number;
  monthWeekend: number;
  yearPrimary: number;
  yearBackup: number;
  yearTotal: number;
  yearWeekend: number;
  flags: number;
};

type GeneratedOption = {
  rank: number;
  score: number;
  isComplete: boolean;
  isValid?: boolean;
  openRequiredSlots: number;
  assignments: Record<string, DraftDayAssignment>;
  ruleWarnings?: {
    total?: number;
    errors?: number;
    warnings?: number;
    invalidAssignments?: number;
    isCompleteButInvalid?: boolean;
  };
  spreads?: {
    primary?: number;
    backup?: number;
    weightedBurden?: number;
    weekendPrimary?: number;
    weightedWeekend?: number;
  };
  residentSummaries?: Array<{
    name: string;
    pgy: string;
    primary: number;
    backup: number;
    weekendPrimary: number;
    weekendBackup: number;
    weightedBurden?: number;
    adjustedBurden?: number;
  }>;
};

type DayWarning = {
  dateKey: string;
  slot: Slot;
  residentName: string;
  flags: AssignmentFlag[];
};

type AIReviewResult = {
  title: string;
  summary: string;
  status: "good" | "review_needed" | "problem";
  severity: "low" | "medium" | "high";
  keyFindings: string[];
  ruleWarnings?: string[];
  workloadNotes?: string[];
  generatorNotes?: string[];
  tradeoffs?: string[];
  recommendation?: string;
  optionInterpretations?: Array<{
  rank: number;
  label: string;
  summary: string;
  strengths: string[];
  tradeoffs: string[];
  bestFor: string;
}>;
};

type AIOptionInterpretation = NonNullable<
  AIReviewResult["optionInterpretations"]
>[number];

function parseOptionInterpretations(value: unknown): AIOptionInterpretation[] {
  if (!Array.isArray(value)) return [];

  return value.map((item, index) => {
    const option = item as Partial<AIOptionInterpretation>;

    return {
      rank: Number(option.rank ?? index + 1),
      label: String(option.label ?? ""),
      summary: String(option.summary ?? ""),
      strengths: Array.isArray(option.strengths)
        ? option.strengths.map(String)
        : [],
      tradeoffs: Array.isArray(option.tradeoffs)
        ? option.tradeoffs.map(String)
        : [],
      bestFor: option.bestFor ? String(option.bestFor) : "",
    };
  });
}

type AIReviewContext = {
  monthLabel: string;
  scheduleSlotMode: ScheduleSlotMode;
  coverage: {
    assignedSlots: number;
    expectedSlots: number;
    unfilledRequiredSlots: Array<{
      dateKey: string;
      dayName: string;
      isWeekend: boolean;
      slot: Slot;
    }>;
  };
  schedule: Array<{
    dateKey: string;
    dayName: string;
    isWeekend: boolean;
    primaryRosterId: string | null;
    backupRosterId: string | null;
    primaryName: string | null;
    backupName: string | null;
    primaryFlags: AssignmentFlag[];
    backupFlags: AssignmentFlag[];
  }>;
  residentStats: unknown[];
  pgyStats: unknown[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  onSelectGeneratedOption: (
    assignments: Record<string, DraftDayAssignment>
  ) => void;
  saving?: boolean;
  monthLabel: string;
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  draftAssignments: Record<string, DraftDayAssignment>;
  historicalStats: ExistingResidentStats[];
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
  scheduleSlotMode: ScheduleSlotMode;
  slotDefinitions?: ProgramCallSlotDefinition[];
  generationReport?: unknown;
  aiReviewContext: AIReviewContext;
  autoReviewToken?: number | null;
};

function pgyLabel(resident: ResidentOption) {
  if (typeof resident.pgyYear === "number") return `PGY-${resident.pgyYear}`;
  if (resident.trainingLevel) return resident.trainingLevel;
  return "Unknown";
}

function getResidentYearValue(resident: ResidentOption) {
  if (typeof resident.pgyYear === "number") return resident.pgyYear;
  if (resident.gradYear !== null) return 99;
  const match = resident.trainingLevel?.match(/(\d+)/);
  if (match) return Number(match[1]);
  return 99;
}

function shortName(resident?: ResidentOption | null) {
  if (!resident) return "Open";
  const parts = resident.displayName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0][0]}. ${parts[parts.length - 1]}`;
}

function buildCalendarGrid(monthDays: CalendarDay[]) {
  const firstDay = monthDays[0]?.date.getDay() ?? 0;
  return [
    ...Array.from({ length: firstDay }, () => null as CalendarDay | null),
    ...monthDays,
  ];
}

function getFlagText(flag: AssignmentFlag) {
  const raw = flag as unknown as {
    message?: string;
    label?: string;
    type?: string;
    description?: string;
  };

  return (
    raw.message ??
    raw.label ??
    raw.description ??
    raw.type ??
    JSON.stringify(flag)
  );
}

/**
 * Returns whether any backup slot definition is visible for the given day.
 * Uses hasAssignment=true so already-assigned backup is always shown.
 */
function isBackupVisibleForDay(
  day: CalendarDay,
  assignment: DraftDayAssignment | undefined,
  residentLookup: Map<string, ResidentOption>,
  backupDefs: ProgramCallSlotDefinition[]
): boolean {
  if (backupDefs.length === 0) return false;
  const primaryResident = assignment?.primaryRosterId
    ? residentLookup.get(assignment.primaryRosterId)
    : null;
  const primaryPgyYear = primaryResident?.pgyYear ?? null;
  const dayOfWeek = day.date.getDay();
  const hasAssignment = Boolean(assignment?.backupRosterId);
  return backupDefs.some(
    (def) => getSlotStatusForDay({ def, dayOfWeek, primaryPgyYear, hasAssignment }).isVisible
  );
}

/**
 * Returns whether any backup slot definition is required for the given day
 * (ignoring whether it's already assigned — checks the "would it be required if empty?" state).
 */
function isBackupRequiredForDay(
  day: CalendarDay,
  assignment: DraftDayAssignment | undefined,
  residentLookup: Map<string, ResidentOption>,
  backupDefs: ProgramCallSlotDefinition[]
): boolean {
  if (backupDefs.length === 0) return false;
  const primaryResident = assignment?.primaryRosterId
    ? residentLookup.get(assignment.primaryRosterId)
    : null;
  const primaryPgyYear = primaryResident?.pgyYear ?? null;
  const dayOfWeek = day.date.getDay();
  return backupDefs.some(
    (def) => getSlotStatusForDay({ def, dayOfWeek, primaryPgyYear, hasAssignment: false }).isRequired
  );
}

function countUnfilledDays(
  monthDays: CalendarDay[],
  assignments: Record<string, DraftDayAssignment>,
  requiredCallTypes: Slot[],
  scheduleSlotMode: ScheduleSlotMode,
  slotDefinitions: ProgramCallSlotDefinition[],
  residentLookup: Map<string, ResidentOption>
) {
  const backupDefs = slotDefinitions.filter((def) => def.callType === "Backup");
  const hasConditionalBackup = backupDefs.some((def) => def.requiredMode === "conditional");

  const shouldCheckPrimary =
    requiredCallTypes.length > 0
      ? requiredCallTypes.includes("Primary")
      : scheduleSlotMode === "Primary" || scheduleSlotMode === "Both";
  const globalBackupRequired =
    requiredCallTypes.length > 0
      ? requiredCallTypes.includes("Backup")
      : scheduleSlotMode !== "Primary";

  return monthDays.filter((day) => {
    const assignment = assignments[day.key];

    if (shouldCheckPrimary && !assignment?.primaryRosterId) return true;

    if (!assignment?.backupRosterId) {
      if (hasConditionalBackup) {
        return isBackupRequiredForDay(day, assignment, residentLookup, backupDefs);
      }
      return globalBackupRequired;
    }

    return false;
  }).length;
}

function buildReviewRows({
  monthDays,
  residents,
  draftAssignments,
  historicalStats,
  rules,
  availabilityByResident,
}: {
  monthDays: CalendarDay[];
  residents: ResidentOption[];
  draftAssignments: Record<string, DraftDayAssignment>;
  historicalStats: ExistingResidentStats[];
  rules: ProgramRule[];
  availabilityByResident: ProgramAvailabilityMonthResponse["availability"];
}) {
  const residentLookup = new Map(
    residents.map((resident) => [resident.residentId, resident])
  );

  const rows = new Map<string, ReviewRow>();

  for (const resident of residents) {
    const baseline = historicalStats.find(
      (item) => item.residentId === resident.residentId
    );

    rows.set(resident.residentId, {
      resident,
      monthPrimary: 0,
      monthBackup: 0,
      monthTotal: 0,
      monthWeekend: 0,
      yearPrimary: baseline?.primaryCallsYear ?? 0,
      yearBackup: baseline?.backupCallsYear ?? 0,
      yearTotal: baseline?.totalCallsYear ?? 0,
      yearWeekend: baseline?.weekendCallsYear ?? 0,
      flags: 0,
    });
  }

  for (const day of monthDays) {
    const assignment = draftAssignments[day.key];
    if (!assignment) continue;

    function apply(residentId: string | null | undefined, slot: Slot) {
      if (!residentId) return;

      const row = rows.get(residentId);
      const resident = residentLookup.get(residentId);
      if (!row || !resident) return;

      if (slot === "Primary") {
        row.monthPrimary += 1;
        row.yearPrimary += 1;
      } else {
        row.monthBackup += 1;
        row.yearBackup += 1;
      }

      row.monthTotal += 1;
      row.yearTotal += 1;

      if (day.isWeekend) {
        row.monthWeekend += 1;
        row.yearWeekend += 1;
      }

      const flags = getFlagsForAssignedResident({
        resident,
        slot,
        dateKey: day.key,
        assignments: draftAssignments,
        rules,
        availabilityByResident,
      });

      row.flags += flags.length;
    }

    apply(assignment.primaryRosterId, "Primary");
    apply(assignment.backupRosterId, "Backup");
  }

  return Array.from(rows.values()).sort((a, b) => {
    const pgyDiff =
      getResidentYearValue(a.resident) - getResidentYearValue(b.resident);
    if (pgyDiff !== 0) return pgyDiff;
    if (b.monthTotal !== a.monthTotal) return b.monthTotal - a.monthTotal;
    return a.resident.displayName.localeCompare(b.resident.displayName);
  });
}

function getPgySummary(rows: ReviewRow[]) {
  const grouped = new Map<
    string,
    {
      label: string;
      residentCount: number;
      monthTotal: number;
      monthWeekend: number;
      avgTotal: number;
      avgWeekend: number;
      maxTotal: number;
      minTotal: number;
    }
  >();

  for (const row of rows) {
    const label = pgyLabel(row.resident);
    const current = grouped.get(label) ?? {
      label,
      residentCount: 0,
      monthTotal: 0,
      monthWeekend: 0,
      avgTotal: 0,
      avgWeekend: 0,
      maxTotal: 0,
      minTotal: Number.POSITIVE_INFINITY,
    };

    current.residentCount += 1;
    current.monthTotal += row.monthTotal;
    current.monthWeekend += row.monthWeekend;
    current.maxTotal = Math.max(current.maxTotal, row.monthTotal);
    current.minTotal = Math.min(current.minTotal, row.monthTotal);

    grouped.set(label, current);
  }

  return Array.from(grouped.values())
    .map((group) => ({
      ...group,
      avgTotal: group.monthTotal / Math.max(group.residentCount, 1),
      avgWeekend: group.monthWeekend / Math.max(group.residentCount, 1),
      minTotal: group.minTotal === Number.POSITIVE_INFINITY ? 0 : group.minTotal,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
}

function parseGeneratedOptions(generationReport: unknown): GeneratedOption[] {
  const report = generationReport as
    | {
        topCombinations?: unknown[];
        topCombinationSummaries?: unknown[];
      }
    | null
    | undefined;

  const combinations = Array.isArray(report?.topCombinations)
    ? report.topCombinations
    : [];

  const summaries = Array.isArray(report?.topCombinationSummaries)
    ? report.topCombinationSummaries
    : [];

  return combinations.slice(0, 5).map((comboRaw, index) => {
    const combo = comboRaw as Partial<GeneratedOption>;
    const summary = summaries[index] as Partial<GeneratedOption> | undefined;

    return {
      rank: Number(combo.rank ?? summary?.rank ?? index + 1),
      score: Number(combo.score ?? summary?.score ?? 0),
      isComplete: Boolean(combo.isComplete ?? summary?.isComplete),
      isValid:
        typeof summary?.isValid === "boolean"
          ? summary.isValid
          : typeof combo.isValid === "boolean"
          ? combo.isValid
          : undefined,
      openRequiredSlots: Number(
        combo.openRequiredSlots ?? summary?.openRequiredSlots ?? 0
      ),
      assignments: combo.assignments ?? {},
      ruleWarnings:
        typeof summary?.ruleWarnings === "object" && summary.ruleWarnings
          ? summary.ruleWarnings
          : typeof combo.ruleWarnings === "object" && combo.ruleWarnings
          ? combo.ruleWarnings
          : undefined,
      spreads: summary?.spreads ?? combo.spreads,
      residentSummaries: summary?.residentSummaries ?? combo.residentSummaries,
    };
  });
}

export default function ProgramCallReviewModal({
  open,
  onClose,
  onConfirm,
  onRegenerate,
  onSelectGeneratedOption,
  saving = false,
  monthLabel,
  monthDays,
  residents,
  draftAssignments,
  historicalStats,
  rules,
  availabilityByResident,
  scheduleSlotMode,
  slotDefinitions = [],
  generationReport,
  aiReviewContext,
  autoReviewToken,
}: Props) {
  const [selectedOptionRank, setSelectedOptionRank] = useState(1);
  const [selectedWarnings, setSelectedWarnings] = useState<DayWarning[] | null>(
    null
  );

  const [reviewLoading, setReviewLoading] = useState(false);
const [reviewError, setReviewError] = useState<string | null>(null);
const [aiReview, setAiReview] = useState<AIReviewResult | null>(null);
const lastAutoReviewTokenRef = React.useRef<number | null>(null);

const handleGetReview = React.useCallback(async () => {
  try {
    setReviewLoading(true);
    setReviewError(null);

    const response = await fetch("/api/program/calls/ai-review", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        monthLabel,
        monthDays,
        residents,
        draftAssignments,
        historicalStats,
        rules,
        availabilityByResident,
        scheduleSlotMode,
        aiReviewContext,
        generationReport,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to review schedule");
    }

    setAiReview(
  payload?.review
    ? {
        title: String(payload.review.title ?? "AI schedule review"),
        summary: String(payload.review.summary ?? ""),
        status:
          payload.review.status === "good" ||
          payload.review.status === "review_needed" ||
          payload.review.status === "problem"
            ? payload.review.status
            : "review_needed",
        severity:
          payload.review.severity === "low" ||
          payload.review.severity === "medium" ||
          payload.review.severity === "high"
            ? payload.review.severity
            : "low",
        keyFindings: Array.isArray(payload.review.keyFindings)
          ? payload.review.keyFindings.map(String)
          : [],
        ruleWarnings: Array.isArray(payload.review.ruleWarnings)
          ? payload.review.ruleWarnings.map(String)
          : [],
        workloadNotes: Array.isArray(payload.review.workloadNotes)
          ? payload.review.workloadNotes.map(String)
          : [],
        generatorNotes: Array.isArray(payload.review.generatorNotes)
          ? payload.review.generatorNotes.map(String)
          : [],
        tradeoffs: Array.isArray(payload.review.tradeoffs)
          ? payload.review.tradeoffs.map(String)
          : [],
        recommendation: payload.review.recommendation
          ? String(payload.review.recommendation)
          : "",
          optionInterpretations: parseOptionInterpretations(
  payload.review.optionInterpretations
),
      }
    : null
);
  } catch (error) {
    setReviewError(
      error instanceof Error ? error.message : "Failed to review schedule"
    );
    setAiReview(null);
  } finally {
    setReviewLoading(false);
  }
}, [
  monthLabel,
  monthDays,
  residents,
  draftAssignments,
  historicalStats,
  rules,
  availabilityByResident,
  scheduleSlotMode,
  aiReviewContext,
  generationReport,
]);

React.useEffect(() => {
  if (!open) return;
  if (!autoReviewToken) return;
  if (lastAutoReviewTokenRef.current === autoReviewToken) return;

  lastAutoReviewTokenRef.current = autoReviewToken;
  handleGetReview();
}, [open, autoReviewToken, handleGetReview]);

  const residentLookup = useMemo(
    () => new Map(residents.map((resident) => [resident.residentId, resident])),
    [residents]
  );

  const rows = useMemo(
    () =>
      buildReviewRows({
        monthDays,
        residents,
        draftAssignments,
        historicalStats,
        rules,
        availabilityByResident,
      }),
    [
      monthDays,
      residents,
      draftAssignments,
      historicalStats,
      rules,
      availabilityByResident,
    ]
  );

  const pgySummary = useMemo(() => getPgySummary(rows), [rows]);
  const calendarGrid = useMemo(() => buildCalendarGrid(monthDays), [monthDays]);
  const topOptions = useMemo(
    () => parseGeneratedOptions(generationReport),
    [generationReport]
  );
  const requiredCallTypes = useMemo(
    () => getRequiredCallTypesFromRules(rules),
    [rules]
  );

  const backupDefs = useMemo(
    () => slotDefinitions.filter((def) => def.callType === "Backup"),
    [slotDefinitions]
  );
  const hasConditionalBackup = useMemo(
    () => backupDefs.some((def) => def.requiredMode === "conditional"),
    [backupDefs]
  );

  const unfilledDays = useMemo(
    () =>
      countUnfilledDays(
        monthDays,
        draftAssignments,
        requiredCallTypes,
        scheduleSlotMode,
        slotDefinitions,
        residentLookup
      ),
    [monthDays, draftAssignments, requiredCallTypes, scheduleSlotMode, slotDefinitions, residentLookup]
  );

  const totalFlags = useMemo(
    () => rows.reduce((sum, row) => sum + row.flags, 0),
    [rows]
  );

  const { assignedSlots, expectedSlots } = useMemo(() => {
    const shouldCountPrimaryGlobal =
      requiredCallTypes.length > 0
        ? requiredCallTypes.includes("Primary")
        : scheduleSlotMode === "Primary" || scheduleSlotMode === "Both";
    const globalBackupCounted =
      requiredCallTypes.length > 0
        ? requiredCallTypes.includes("Backup")
        : scheduleSlotMode === "Both";

    let assigned = 0;
    let expected = 0;

    for (const day of monthDays) {
      const assignment = draftAssignments[day.key];

      if (shouldCountPrimaryGlobal) {
        expected += 1;
        if (assignment?.primaryRosterId) assigned += 1;
      }

      // Per-day backup visibility for conditional defs; global flag otherwise.
      if (hasConditionalBackup) {
        const visible = isBackupVisibleForDay(day, assignment, residentLookup, backupDefs);
        if (visible) {
          expected += 1;
          if (assignment?.backupRosterId) assigned += 1;
        }
      } else if (globalBackupCounted) {
        expected += 1;
        if (assignment?.backupRosterId) assigned += 1;
      }
    }

    return { assignedSlots: assigned, expectedSlots: expected };
  }, [monthDays, draftAssignments, requiredCallTypes, scheduleSlotMode, hasConditionalBackup, backupDefs, residentLookup]);

  function getWarningsForDay(day: CalendarDay): DayWarning[] {
    const assignment = draftAssignments[day.key];
    if (!assignment) return [];

    const warnings: DayWarning[] = [];

    if (assignment.primaryRosterId) {
      const resident = residentLookup.get(assignment.primaryRosterId);
      if (resident) {
        const flags = getFlagsForAssignedResident({
          resident,
          slot: "Primary",
          dateKey: day.key,
          assignments: draftAssignments,
          rules,
          availabilityByResident,
        });

        if (flags.length > 0) {
          warnings.push({
            dateKey: day.key,
            slot: "Primary",
            residentName: resident.displayName,
            flags,
          });
        }
      }
    }

    if (assignment.backupRosterId) {
      const resident = residentLookup.get(assignment.backupRosterId);
      if (resident) {
        const flags = getFlagsForAssignedResident({
          resident,
          slot: "Backup",
          dateKey: day.key,
          assignments: draftAssignments,
          rules,
          availabilityByResident,
        });

        if (flags.length > 0) {
          warnings.push({
            dateKey: day.key,
            slot: "Backup",
            residentName: resident.displayName,
            flags,
          });
        }
      }
    }

    return warnings;
  }

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex max-h-[92vh] w-full max-w-7xl flex-col overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
          >
            <div className="shrink-0 border-b border-slate-200 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-800">
                    <Sparkles className="h-3.5 w-3.5" />
                    Generated Schedule Review
                  </div>

                  <h2 className="mt-3 text-2xl font-bold text-slate-950">
                    Review {monthLabel}
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Compare generated options, inspect rule warnings, then accept
                    the schedule that works best.
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
                <StatCard label="Assigned slots" value={`${assignedSlots}/${expectedSlots}`} />
                <StatCard
                  label="Unfilled days"
                  value={unfilledDays}
                  tone={unfilledDays > 0 ? "warning" : "good"}
                />
                <StatCard
                  label="Rule warnings"
                  value={totalFlags}
                  tone={totalFlags > 0 ? "warning" : "good"}
                />
                <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    Status
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    {unfilledDays === 0 && totalFlags === 0 ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <p className="text-sm font-bold text-emerald-700">
                          Looks good
                        </p>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        <p className="text-sm font-bold text-amber-700">
                          Review needed
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <div className="space-y-5">
                {topOptions.length > 0 ? (
                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">
                          Top generated options
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          Lower score is better. Select an option to preview and
                          save it.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
  {topOptions.map((option) => {
    const selected = selectedOptionRank === option.rank;

    return (
      <button
        key={option.rank}
        type="button"
        onClick={() => {
  setSelectedOptionRank(option.rank);
  setReviewError(null);
  onSelectGeneratedOption(option.assignments);
}}
        className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
          selected
            ? "border-sky-300 bg-sky-50 text-sky-900 ring-2 ring-sky-100"
            : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
        }`}
      >
        Option {option.rank}
        {option.ruleWarnings?.errors ? ` · ${option.ruleWarnings.errors} errors` : ""}
        {option.openRequiredSlots > 0 ? ` · ${option.openRequiredSlots} open` : ""}
        {selected ? " · selected" : ""}
      </button>
    );
  })}
</div>
                  </div>
                ) : null}

                <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-950">
                        Calendar preview
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Warning badges appear directly on affected dates. Tap a
                        warning to view the issue.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                      <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 ring-1 ring-sky-200">
                        P = Primary
                      </span>

                      {scheduleSlotMode === "Both" || hasConditionalBackup ? (
                        <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 ring-1 ring-violet-200">
                          B = Backup{hasConditionalBackup ? " (conditional)" : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                      (day) => (
                        <div key={day}>{day}</div>
                      )
                    )}
                  </div>

                  <div className="mt-2 grid grid-cols-7 gap-2">
                    {calendarGrid.map((day, index) => {
                      if (!day) {
                        return (
                          <div
                            key={`blank-${index}`}
                            className="min-h-24 rounded-[1rem]"
                          />
                        );
                      }

                      const assignment = draftAssignments[day.key];
                      const primary = assignment?.primaryRosterId
                        ? residentLookup.get(assignment.primaryRosterId)
                        : null;
                      const backup = assignment?.backupRosterId
                        ? residentLookup.get(assignment.backupRosterId)
                        : null;

                      // Per-day backup visibility: conditional defs use PGY-of-primary check.
                      const showBackupRow = hasConditionalBackup
                        ? isBackupVisibleForDay(day, assignment, residentLookup, backupDefs)
                        : scheduleSlotMode === "Both";
                      const backupRequiredThisDay = hasConditionalBackup
                        ? isBackupRequiredForDay(day, assignment, residentLookup, backupDefs)
                        : scheduleSlotMode === "Both";

                      const isIncomplete =
                        !primary || (backupRequiredThisDay && !backup);

                      const warnings = getWarningsForDay(day);
                      const warningCount = warnings.reduce(
                        (sum, item) => sum + item.flags.length,
                        0
                      );

                      return (
                        <div
                          key={day.key}
                          className={`min-h-28 rounded-[1rem] border p-2 text-left ${
                            warningCount > 0
                              ? "border-amber-300 bg-amber-50"
                              : day.isWeekend
                              ? "border-slate-300 bg-slate-100"
                              : "border-slate-200 bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-black text-slate-900">
                              {day.dayNumber}
                            </p>

                            <div className="flex items-center gap-1">
                              {isIncomplete ? (
                                <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200">
                                  Open
                                </span>
                              ) : null}

                              {warningCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => setSelectedWarnings(warnings)}
                                  className="inline-flex items-center gap-1 rounded-full bg-amber-200 px-1.5 py-0.5 text-[10px] font-black text-amber-900 ring-1 ring-amber-300"
                                >
                                  <AlertTriangle className="h-3 w-3" />
                                  {warningCount}
                                </button>
                              ) : null}
                            </div>
                          </div>

                          <div className="mt-2 space-y-1">
                            <div className="truncate rounded-lg bg-sky-50 px-2 py-1 text-[11px] font-semibold text-sky-900 ring-1 ring-sky-100">
                              P: {shortName(primary)}
                            </div>

                            {showBackupRow ? (
                              <div className="truncate rounded-lg bg-violet-50 px-2 py-1 text-[11px] font-semibold text-violet-900 ring-1 ring-violet-100">
                                B: {shortName(backup)}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid gap-5 xl:grid-cols-[0.85fr_1.35fr]">
                  <div className="space-y-4">
                    <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-slate-700" />
                          <p className="text-sm font-bold text-slate-950">
                            PGY fairness summary
                          </p>
                        </div>

                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600">
                          {scheduleSlotMode === "Primary"
                            ? "Primary only"
                            : "Primary + Backup"}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        {pgySummary.map((group) => (
                          <div
                            key={group.label}
                            className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-bold text-slate-900">
                                {group.label}
                              </p>
                              <p className="text-xs font-semibold text-slate-500">
                                {group.residentCount} residents
                              </p>
                            </div>

                            <div className="mt-3 grid grid-cols-4 gap-2">
                              <Metric label="Avg calls" value={group.avgTotal.toFixed(1)} />
                              <Metric label="Avg wknd" value={group.avgWeekend.toFixed(1)} />
                              <Metric label="Min" value={group.minTotal} />
                              <Metric label="Max" value={group.maxTotal} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-bold text-slate-950">
                        Resident distribution
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        Month totals include this selected draft. Year totals
                        include prior calls plus this draft.
                      </p>
                    </div>

                    

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[680px] text-left text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-[0.12em] text-slate-500">
                          <tr>
                            <th className="px-4 py-3">Resident</th>
                            <th className="px-4 py-3">PGY</th>
                            <th className="px-4 py-3">Month</th>
                            <th className="px-4 py-3">Primary</th>
                            {scheduleSlotMode === "Both" ? (
                              <th className="px-4 py-3">Backup</th>
                            ) : null}
                            <th className="px-4 py-3">Weekend</th>
                            <th className="px-4 py-3">Year</th>
                            <th className="px-4 py-3">Flags</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {rows.map((row) => (
                            <tr
                              key={row.resident.residentId}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-4 py-3">
                                <p className="font-semibold text-slate-950">
                                  {row.resident.displayName}
                                </p>
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {pgyLabel(row.resident)}
                              </td>
                              <td className="px-4 py-3 font-black text-slate-950">
                                {row.monthTotal}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {row.monthPrimary}
                              </td>
                              {scheduleSlotMode === "Both" ? (
                                <td className="px-4 py-3 text-slate-600">
                                  {row.monthBackup}
                                </td>
                              ) : null}
                              <td className="px-4 py-3 text-slate-600">
                                {row.monthWeekend}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {row.yearTotal}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${
                                    row.flags > 0
                                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                                      : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                                  }`}
                                >
                                  {row.flags}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <AIReviewPanel
  reviewLoading={reviewLoading}
  reviewError={reviewError}
  aiReview={aiReview}
  onRefresh={handleGetReview}
/>
              </div>
            </div>

            <div className="shrink-0 border-t border-slate-200 px-6 py-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-slate-500">
                  Select an option, inspect warnings, then accept or regenerate.
                </p>

                <div className="flex flex-wrap justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Keep editing
                  </button>

                  <button
                    type="button"
                    onClick={onRegenerate}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-900 transition hover:bg-sky-100"
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Regenerate
                  </button>

                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {saving ? "Saving..." : "Accept schedule"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>

          {selectedWarnings ? (
            <div className="fixed inset-0 z-[170] flex items-center justify-center bg-slate-950/40 p-4">
              <div className="w-full max-w-lg rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-slate-950">
                      Rule warnings
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedWarnings[0]?.dateKey}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedWarnings(null)}
                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {selectedWarnings.map((warning, index) => (
                    <div
                      key={`${warning.dateKey}-${warning.slot}-${index}`}
                      className="rounded-[1rem] border border-amber-200 bg-amber-50 p-3"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.12em] text-amber-800">
                        {warning.slot} · {warning.residentName}
                      </p>

                      <ul className="mt-2 space-y-2 text-sm text-amber-900">
                        {warning.flags.map((flag, flagIndex) => (
                          <li key={flagIndex} className="flex gap-2">
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span>{getFlagText(flag)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function AIReviewPanel({
  reviewLoading,
  reviewError,
  aiReview,
  onRefresh,
}: {
  reviewLoading: boolean;
  reviewError: string | null;
  aiReview: AIReviewResult | null;
  onRefresh: () => void;
}) {
  const notes = [
    ...(aiReview?.keyFindings ?? []),
    ...(aiReview?.ruleWarnings ?? []),
    ...(aiReview?.workloadNotes ?? []),
    ...(aiReview?.generatorNotes ?? []),
    ...(aiReview?.tradeoffs ?? []),
  ].filter(Boolean);

  return (
    <div className="rounded-[1.35rem] border border-sky-200 bg-sky-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
  <div>
    <p className="text-sm font-bold text-sky-950">AI schedule review</p>
    <p className="mt-1 text-xs text-sky-800">
      Explains why the selected option may be the best fit.
    </p>
  </div>

  <div className="flex items-center gap-2">
    {reviewLoading ? (
      <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Reviewing
      </span>
    ) : null}

    <button
      type="button"
      onClick={onRefresh}
      disabled={reviewLoading}
      className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-sky-800 ring-1 ring-sky-200 transition hover:bg-sky-50 disabled:opacity-60"
    >
      {reviewLoading ? "Reviewing" : "Refresh review"}
    </button>
  </div>
</div>

      {reviewError ? (
        <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {reviewError}
        </div>
      ) : aiReview ? (
        <div className="mt-4 rounded-[1rem] border border-sky-100 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-slate-950">
                {aiReview.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {aiReview.summary}
              </p>
            </div>

            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${
                aiReview.status === "problem"
                  ? "bg-rose-50 text-rose-700 ring-1 ring-rose-200"
                  : aiReview.status === "review_needed"
                  ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                  : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
              }`}
            >
              {aiReview.status.replace("_", " ")}
            </span>
          </div>

          {notes.length > 0 ? (
            <ul className="mt-4 space-y-2 text-sm text-slate-700">
              {notes.slice(0, 8).map((note, index) => (
                <li key={index} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : null}

          {aiReview.recommendation ? (
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
              {aiReview.recommendation}
            </p>
          ) : null}
          {aiReview.optionInterpretations?.length ? (
  <div className="mt-4">
    <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
      Option guide
    </p>

    <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
      {aiReview.optionInterpretations.map((option) => (
        <div
          key={option.rank}
          className="rounded-[1rem] border border-slate-200 bg-slate-50 p-3"
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-950">
              Option {option.rank}
            </p>
            {option.label ? (
              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-sky-800 ring-1 ring-sky-100">
                {option.label}
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-xs leading-5 text-slate-600">
            {option.summary}
          </p>

          {option.bestFor ? (
            <p className="mt-2 text-xs font-semibold text-slate-800">
              {option.bestFor}
            </p>
          ) : null}
        </div>
      ))}
    </div>
  </div>
) : null}
        </div>
      ) : (
        <div className="mt-4 rounded-[1rem] border border-sky-100 bg-white px-4 py-3 text-sm text-sky-800">
          AI review will load after auto-generation.
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string | number;
  tone?: "good" | "warning";
}) {
  return (
    <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
        {label}
      </p>
      <p
        className={`mt-2 text-2xl font-black ${
          tone === "warning"
            ? "text-amber-700"
            : tone === "good"
            ? "text-emerald-700"
            : "text-slate-950"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-slate-200">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-base font-black text-slate-950">{value}</p>
    </div>
  );
}
