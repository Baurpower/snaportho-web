"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Wand2,
} from "lucide-react";
import type { CallValidationResult } from "@/lib/workspace/call/validation";
import { serializeSlotId } from "@/lib/workspace/call/validation";
import {
  getResidentValidationDisplay,
  getSlotValidationGuidance,
} from "@/lib/workspace/call/validation-display";
import {
  getRotationAssignmentForDate,
  getRotationDisplayLabel,
} from "@/lib/workspace/call/resident-display";
import {
  getResidentColorClasses,
  getResidentColorKey,
} from "@/lib/workspace/call/resident-colors";
import {
  DEFAULT_SLOT_DEFINITIONS,
  getVisibleCallSlotsForDay,
} from "@/components/workspace/call/programcalltypes";
import type { BuddyDateState } from "@/lib/workspace/call/buddy-requirements";
import { isResidentAllowedForSlot } from "@/components/workspace/call/programcallevaluator";
import type {
  AssignmentFlagCategory,
  AssignmentFlagTone,
  CalendarDay,
  DraftDayAssignment,
  PgySummaryRow,
  ProgramCallSlotDefinition,
  ProgramRule,
  QuickAssignSlotMode,
  ResidentAvailabilityForDate,
  ResidentAvailabilityMap,
  ResidentOption,
  ResidentSchedulingStats,
} from "@/components/workspace/call/programcalltypes";

type AvailabilityFlag = {
  key: string;
  label: string;
  tone: AssignmentFlagTone;
  description?: string | null;
  category?: AssignmentFlagCategory;
};

function pgyLabel(
  resident:
    | ResidentOption
    | { trainingLevel: string | null; pgyYear?: number | null }
) {
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

function getResidentDayAvailability(
  availabilityByResident: ResidentAvailabilityMap,
  membershipId: string | null | undefined,
  dateKey: string
): ResidentAvailabilityForDate | null {
  if (!membershipId) return null;
  return availabilityByResident[membershipId]?.[dateKey] ?? null;
}

function getResidentRotationLabel(
  resident: ResidentOption | null | undefined,
  effectiveDate: string
) {
  return getRotationDisplayLabel(
    getRotationAssignmentForDate(resident?.rotationAssignments, effectiveDate)
  );
}

function getToneBadgeClass(tone: AvailabilityFlag["tone"]) {
  if (tone === "rose") {
    return "bg-rose-100 text-rose-700 border border-rose-200";
  }

  if (tone === "amber") {
    return "bg-amber-100 text-amber-700 border border-amber-200";
  }

  if (tone === "sky") {
    return "bg-sky-100 text-sky-700 border border-sky-200";
  }

  if (tone === "violet") {
    return "bg-violet-100 text-violet-700 border border-violet-200";
  }

  return "bg-slate-100 text-slate-700 border border-slate-200";
}

/** Maps a slot call type to the DraftDayAssignment field that stores its roster id. */
const CALL_TYPE_ROSTER_FIELD: Record<string, keyof DraftDayAssignment> = {
  Primary: "primaryRosterId",
  Backup: "backupRosterId",
  Buddy: "buddyRosterId",
};

/** Compact header label for a call type in the balance rail. */
const CALL_TYPE_SHORT_LABEL: Record<string, string> = {
  Primary: "1°",
  Backup: "2°",
  Buddy: "B°",
};

function callTypeShortLabel(callType: string) {
  return CALL_TYPE_SHORT_LABEL[callType] ?? callType.slice(0, 2);
}

/**
 * Whether tapping in the given quick-assign mode acts on the given slot call type.
 * "Both" acts on Primary + Backup; every other mode acts on its own call type.
 */
function slotMatchesMode(callType: string, mode: QuickAssignSlotMode) {
  if (mode === "Both") return callType === "Primary" || callType === "Backup";
  return callType === mode;
}

function BalanceCard({
  row,
  callTypes,
}: {
  row: PgySummaryRow;
  callTypes: string[];
}) {
  // Columns: one per call type present in the program, then the Total.
  const gridTemplate = `minmax(1.6rem,auto) repeat(${callTypes.length + 1}, minmax(0,1fr))`;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-900">{row.label}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          calls
        </span>
      </div>

      <div className="grid gap-x-2 gap-y-1" style={{ gridTemplateColumns: gridTemplate }}>
        {/* Header row */}
        <span />
        {callTypes.map((ct) => (
          <span
            key={`h-${ct}`}
            title={ct}
            className="text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400"
          >
            {callTypeShortLabel(ct)}
          </span>
        ))}
        <span className="text-center text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-500">
          Σ
        </span>

        {/* Month row */}
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Mo
        </span>
        {callTypes.map((ct) => (
          <span key={`m-${ct}`} className="text-center text-sm font-bold text-slate-950">
            {row.monthByCallType[ct] ?? 0}
          </span>
        ))}
        <span className="text-center text-sm font-bold text-slate-950">{row.monthTotal}</span>

        {/* Year row */}
        <span className="text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
          Yr
        </span>
        {callTypes.map((ct) => (
          <span key={`y-${ct}`} className="text-center text-sm font-bold text-slate-700">
            {row.yearByCallType[ct] ?? 0}
          </span>
        ))}
        <span className="text-center text-sm font-bold text-slate-700">{row.yearTotal}</span>
      </div>

      <p className="mt-2 text-[9px] font-semibold uppercase tracking-[0.1em] text-slate-400">
        Wknd · Mo {row.monthWeekend} · Yr {row.yearWeekend}
      </p>
    </div>
  );
}

function CalendarStatsRail({
  pgyRows,
  callTypes,
  statsLoading,
  residentLoading,
  collapsed,
  onToggle,
}: {
  pgyRows: PgySummaryRow[];
  callTypes: string[];
  statsLoading: boolean;
  residentLoading: boolean;
  collapsed: boolean;
  onToggle: () => void;
}) {
  if (collapsed) {
    return (
      <>
        <div className="border-t border-slate-200 bg-slate-50 px-3 py-3 xl:hidden">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4 rotate-90" />
            Show stats
          </button>
        </div>

        <div className="hidden h-full min-h-[180px] items-start justify-center rounded-r-[1.25rem] border-l border-slate-200 bg-slate-50 px-2 py-3 xl:flex">
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Stats
          </button>
        </div>
      </>
    );
  }

  return (
    <aside className="border-t border-slate-200 bg-slate-50/90 xl:w-[240px] xl:shrink-0 xl:border-l xl:border-t-0">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Balance
          </p>
          <p className="truncate text-sm font-bold text-slate-950">
            Month / Year
          </p>
        </div>

        <div className="flex items-center gap-2">
          {statsLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : null}
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
          >
            <ChevronRight className="h-4 w-4 rotate-90 xl:rotate-0" />
          </button>
        </div>
      </div>

      <div className="p-3">
        {pgyRows.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-500">
            {residentLoading ? "Loading residents..." : "No residents loaded yet."}
          </div>
        ) : (
          <>
            <div className="flex gap-3 overflow-x-auto pb-1 xl:hidden">
              {pgyRows.map((row) => (
                <div key={row.label} className="min-w-[220px] shrink-0">
                  <BalanceCard row={row} callTypes={callTypes} />
                </div>
              ))}
            </div>

            <div className="hidden space-y-2 xl:block">
              {pgyRows.map((row) => (
                <BalanceCard key={row.label} row={row} callTypes={callTypes} />
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

type AddViewProps = {
  monthDays: CalendarDay[];
  calendarGrid: Array<CalendarDay | null>;
  residents: ResidentOption[];
  residentLookup: Map<string, ResidentOption>;
  draftAssignments: Record<string, DraftDayAssignment>;
  originalAssignments: Record<string, DraftDayAssignment>;
  rules: ProgramRule[];
  slotDefinitions?: ProgramCallSlotDefinition[];
  buddyDateStateByDate?: Map<string, BuddyDateState>;
  availabilityByResident: ResidentAvailabilityMap;
  loading: boolean;
  saving: boolean;
  quickAssignResidentId: string;
  setQuickAssignResidentId: (value: string) => void;
  quickAssignSlotMode: QuickAssignSlotMode;
  setQuickAssignSlotMode: (value: QuickAssignSlotMode) => void;
  onToggleQuickAssignDay: (dateKey: string) => void;
  pgyRows: PgySummaryRow[];
  residentStats: ResidentSchedulingStats[];
  selectedResidentStats: ResidentSchedulingStats | null;
  validation?: CallValidationResult | null;
  statsLoading: boolean;
  residentLoading: boolean;
  statsCollapsed: boolean;
  setStatsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
};

type SlotValidationDisplay = {
  className: string;
  badgeText: string | null;
  tooltip: string | undefined;
  shortMessage?: string | null;
};

function SlotRow({
  label,
  resident,
  rotationLabel,
  validation,
  highlight,
}: {
  label: string;
  resident: ResidentOption | null | undefined;
  rotationLabel: string;
  validation?: SlotValidationDisplay;
  /** True when this slot is part of the active tap selection (dark treatment). */
  highlight: boolean;
}) {
  const color = getResidentColorClasses(getResidentColorKey(resident));

  return (
    <div
      title={validation?.tooltip}
      className={`rounded-lg px-1.5 py-1 ${
        highlight
          ? "bg-white/10"
          : resident
          ? `${color.background} ${color.subtleBorder}`
          : "bg-slate-50 border border-slate-100"
      } ${validation?.className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-1">
        <p
          className={`truncate text-[8px] font-semibold uppercase tracking-[0.12em] ${
            highlight ? "text-slate-200" : "text-slate-500"
          }`}
        >
          {label}
        </p>
        {validation?.badgeText ? (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
              validation.badgeText === "Error"
                ? "bg-rose-600 text-white"
                : "bg-amber-500 text-white"
            }`}
          >
            {validation.badgeText}
          </span>
        ) : null}
      </div>
      <p
        className={`mt-0.5 truncate text-[11px] font-semibold ${
          highlight ? "text-white" : resident ? color.text : "text-slate-900"
        }`}
      >
        {resident?.displayName ?? "Open"}
      </p>
      <p
        className={`mt-0.5 truncate text-[10px] ${
          highlight ? "text-slate-300" : "text-slate-500"
        }`}
      >
        {rotationLabel}
      </p>
      {validation?.shortMessage ? (
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {validation.shortMessage}
        </p>
      ) : null}
    </div>
  );
}

function DayChip({
  day,
  assignment,
  selectedResidentId,
  quickAssignSlotMode,
  residentLookup,
  selectedResidentAvailability,
  isChanged,
  visibleSlots,
  slotValidations,
  onClick,
}: {
  day: CalendarDay;
  assignment: DraftDayAssignment | undefined;
  selectedResidentId: string;
  quickAssignSlotMode: QuickAssignSlotMode;
  residentLookup: Map<string, ResidentOption>;
  selectedResidentAvailability: ResidentAvailabilityForDate | null;
  isChanged: boolean;
  /** Slots to render for this day, program-driven and deduped by call type. */
  visibleSlots: ProgramCallSlotDefinition[];
  /** Per-call-type validation guidance, keyed by call type. */
  slotValidations: Record<string, SlotValidationDisplay | undefined>;
  onClick: () => void;
}) {
  const rosterIdForCallType = (callType: string) => {
    const field = CALL_TYPE_ROSTER_FIELD[callType];
    return field ? assignment?.[field] ?? null : null;
  };

  const active = visibleSlots.some(
    (def) =>
      !!selectedResidentId &&
      rosterIdForCallType(def.callType) === selectedResidentId &&
      slotMatchesMode(def.callType, quickAssignSlotMode)
  );

  const isBlocked = Boolean(selectedResidentAvailability?.isBlocked);
  const isWarning = Boolean(
    selectedResidentAvailability?.isWarning &&
      !selectedResidentAvailability?.isBlocked
  );

  // Whether the selected slot mode is actually offered on this day. Buddy is only
  // offered on eligible weekend days (via buddyDateState), so this prevents
  // tapping a Buddy assignment onto a day that has no Buddy slot — without which
  // a Buddy-eligible resident would otherwise appear tappable on every weekday.
  const selectedSlotOffered = visibleSlots.some((def) =>
    slotMatchesMode(def.callType, quickAssignSlotMode)
  );

  const firstFlag = selectedResidentAvailability?.flags?.[0] ?? null;
  const isDisabled = (isBlocked || !selectedSlotOffered) && !active;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className={`group flex h-full min-h-[118px] min-w-0 flex-col rounded-[1rem] border p-2 text-left transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white shadow-md shadow-slate-200"
          : isBlocked
          ? "border-rose-300 bg-rose-50"
          : isWarning
          ? "border-amber-300 bg-amber-50 hover:bg-amber-100/70"
          : isChanged
          ? "border-sky-300 bg-sky-50 hover:bg-sky-100"
          : day.isWeekend
          ? "border-amber-200 bg-amber-50/70 hover:bg-amber-100/70"
          : "border-slate-200 bg-white hover:bg-slate-50"
      } ${isDisabled ? "cursor-not-allowed opacity-75" : ""}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p
            className={`text-[13px] font-bold ${
              active ? "text-white" : "text-slate-950"
            }`}
          >
            {day.dayNumber}
          </p>
          <p
            className={`text-[10px] ${
              active ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {day.dayName}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1">
          {day.isWeekend ? (
            <span
              className={`shrink-0 rounded-full px-1.5 py-0.5 text-[8px] font-semibold ${
                active
                  ? "bg-white/10 text-slate-100"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              Wknd
            </span>
          ) : null}

          {isBlocked ? (
            <span className="rounded-full bg-rose-100 px-1.5 py-0.5 text-[8px] font-semibold text-rose-700">
              Blocked
            </span>
          ) : isWarning ? (
            <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700">
              Warning
            </span>
          ) : null}
        </div>
      </div>

      <div className="mt-2 space-y-1.5">
        {visibleSlots.map((def) => {
          const rosterId = rosterIdForCallType(def.callType);
          const resident = rosterId ? residentLookup.get(rosterId) : null;
          const rotationLabel = resident
            ? getResidentRotationLabel(resident, day.key)
            : "Tap to assign";

          return (
            <SlotRow
              key={def.callType}
              label={def.label ?? def.callType}
              resident={resident}
              rotationLabel={rotationLabel}
              validation={slotValidations[def.callType]}
              highlight={active && slotMatchesMode(def.callType, quickAssignSlotMode)}
            />
          );
        })}

        {selectedResidentId && firstFlag ? (
          <div
            className={`rounded-lg px-1.5 py-1 text-[9px] font-semibold ${getToneBadgeClass(
              firstFlag.tone
            )}`}
          >
            <span className="block truncate">{firstFlag.label}</span>
          </div>
        ) : null}
      </div>
    </button>
  );
}

export default function ProgramCallAddView({
  monthDays,
  calendarGrid,
  residents,
  residentLookup,
  draftAssignments,
  originalAssignments,
  slotDefinitions,
  buddyDateStateByDate,
  availabilityByResident,
  loading,
  saving,
  quickAssignResidentId,
  setQuickAssignResidentId,
  quickAssignSlotMode,
  setQuickAssignSlotMode,
  onToggleQuickAssignDay,
  pgyRows,
  validation,
  statsLoading,
  residentLoading,
  statsCollapsed,
  setStatsCollapsed,
}: AddViewProps) {
  const [activePgyTab, setActivePgyTab] = useState<number>(1);

  // Distinct slot definitions, ordered, with a safe default when none loaded yet.
  const effectiveSlotDefinitions = useMemo(
    () =>
      slotDefinitions && slotDefinitions.length > 0
        ? [...slotDefinitions].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        : DEFAULT_SLOT_DEFINITIONS,
    [slotDefinitions]
  );

  // Distinct call types present in the program, in slot sort order.
  const programCallTypes = useMemo(() => {
    const seen: string[] = [];
    for (const def of effectiveSlotDefinitions) {
      if (!seen.includes(def.callType)) seen.push(def.callType);
    }
    return seen.length > 0 ? seen : ["Primary", "Backup"];
  }, [effectiveSlotDefinitions]);

  // Slot-mode buttons: one per program call type, plus "Both" when Primary and
  // Backup both exist (taps assign the paired required slots together).
  const availableSlotModes = useMemo(() => {
    const modes: QuickAssignSlotMode[] = [];
    for (const ct of ["Primary", "Backup", "Buddy"] as const) {
      if (programCallTypes.includes(ct)) modes.push(ct);
    }
    if (programCallTypes.includes("Primary") && programCallTypes.includes("Backup")) {
      modes.push("Both");
    }
    return modes.length > 0 ? modes : (["Primary", "Backup", "Both"] as QuickAssignSlotMode[]);
  }, [programCallTypes]);

  // Keep the active mode valid if the program's slot config doesn't offer it.
  useEffect(() => {
    if (!availableSlotModes.includes(quickAssignSlotMode)) {
      setQuickAssignSlotMode(availableSlotModes[0]);
    }
  }, [availableSlotModes, quickAssignSlotMode, setQuickAssignSlotMode]);

  const sortedResidents = useMemo(() => {
    return [...residents].sort((a, b) => {
      const yearDiff = getResidentYearValue(a) - getResidentYearValue(b);
      if (yearDiff !== 0) return yearDiff;
      return a.displayName.localeCompare(b.displayName);
    });
  }, [residents]);

  const residentIssueSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        blockedDays: number;
        warningDays: number;
        blockedToday: boolean;
      }
    >();

    for (const resident of residents) {
      let blockedDays = 0;
      let warningDays = 0;

      for (const day of monthDays) {
        const availability = getResidentDayAvailability(
          availabilityByResident,
          resident.membershipId,
          day.key
        );

        if (availability?.isBlocked) blockedDays += 1;
        else if (availability?.isWarning) warningDays += 1;
      }

      map.set(resident.membershipId, {
        blockedDays,
        warningDays,
        blockedToday: false,
      });
    }

    return map;
  }, [availabilityByResident, monthDays, residents]);

  const residentsByPgy = useMemo(() => {
    return [1, 2, 3, 4, 5].map((year) => ({
      year,
      residents: sortedResidents.filter(
        (resident) => getResidentYearValue(resident) === year
      ),
    }));
  }, [sortedResidents]);

  const visibleResidents = useMemo(() => {
    return (
      residentsByPgy.find((group) => group.year === activePgyTab)?.residents ?? []
    );
  }, [activePgyTab, residentsByPgy]);

  const selectedResident = quickAssignResidentId
    ? residentLookup.get(quickAssignResidentId)
    : null;

  const selectedResidentMonthSummary = useMemo(() => {
    if (!selectedResident) return null;
    return residentIssueSummary.get(selectedResident.membershipId) ?? null;
  }, [residentIssueSummary, selectedResident]);

  const selectedResidentBlockedDates = useMemo(() => {
    if (!selectedResident) return [];

    return monthDays
      .filter((day) =>
        getResidentDayAvailability(
          availabilityByResident,
          selectedResident.membershipId,
          day.key
        )?.isBlocked
      )
      .map((day) => day.key);
  }, [availabilityByResident, monthDays, selectedResident]);

  const totalCompleteDays = monthDays.filter((day) => {
    const a = draftAssignments[day.key];
    return a?.primaryRosterId && a?.backupRosterId;
  }).length;

  return (
    <div className="space-y-6">
      <div className="rounded-[1.6rem] border border-slate-200 bg-slate-50 p-4 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              Add Mode
            </p>
            <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
              Fast month builder
            </h3>
            <p className="mt-1 max-w-3xl text-sm text-slate-500">
              Choose a slot, choose a resident, then tap dates on the calendar.
              Availability warnings and hard blocks are surfaced directly in the
              selector and on the calendar.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Progress
            </p>
            <p className="mt-1 text-lg font-bold text-slate-950">
              {totalCompleteDays}/{monthDays.length} days filled
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-[1.35rem] border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  1. Choose slot mode
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {availableSlotModes.map(
                    (mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setQuickAssignSlotMode(mode)}
                        className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                          quickAssignSlotMode === mode
                            ? "bg-slate-950 text-white"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {mode}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="xl:text-right">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                  Active selection
                </p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {selectedResident
                    ? `${selectedResident.displayName} · ${quickAssignSlotMode}`
                    : "Select a resident first"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Hard-blocked days cannot be tapped.
                </p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                2. Choose resident
              </p>

              <div className="mt-2 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((year) => {
                  const count =
                    residentsByPgy.find((group) => group.year === year)?.residents
                      .length ?? 0;

                  return (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setActivePgyTab(year)}
                      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
                        activePgyTab === year
                          ? "bg-slate-950 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span>PGY-{year}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          activePgyTab === year
                            ? "bg-white/10 text-slate-100"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-2.5">
                {visibleResidents.length === 0 ? (
                  <div className="rounded-xl bg-white px-4 py-5 text-sm text-slate-500">
                    No residents found in PGY-{activePgyTab}.
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {visibleResidents.map((resident) => {
                      const selected =
                        quickAssignResidentId === resident.membershipId;
                      const summary =
                        residentIssueSummary.get(resident.membershipId) ?? null;
                      const residentColor = getResidentColorClasses(
                        getResidentColorKey(resident)
                      );
                      const rotationLabel =
                        resident.currentRotationLabel ?? "No rotation listed";
                      const residentValidation = validation
                        ? getResidentValidationDisplay(
                            validation,
                            resident.rosterId ?? resident.membershipId
                          )
                        : null;

                      return (
                        <button
                          key={resident.membershipId}
                          type="button"
                          onClick={() =>
                            setQuickAssignResidentId(resident.membershipId)
                          }
                          title={residentValidation?.tooltip}
                          className={`flex items-start justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                            selected
                              ? `${residentColor.border} ${residentColor.background} ring-2 ring-slate-950 ring-offset-1`
                              : residentValidation?.className
                              ? residentValidation.className
                              : summary?.blockedDays
                              ? "border-rose-200 bg-rose-50 hover:bg-rose-100/60"
                              : summary?.warningDays
                              ? "border-amber-200 bg-amber-50 hover:bg-amber-100/60"
                              : `${residentColor.subtleBorder} ${residentColor.mutedBackground} hover:bg-white`
                          }`}
                        >
                          <div className="min-w-0">
                            <p className={`truncate text-sm font-semibold ${residentColor.text}`}>
                              {resident.displayName}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {rotationLabel}
                            </p>
                            <p className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${residentColor.badge} ${residentColor.badgeText}`}>
                              {pgyLabel(resident)}
                            </p>

                            {summary &&
                            (summary.blockedDays > 0 || summary.warningDays > 0) ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {summary.blockedDays > 0 ? (
                                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-100 text-rose-700">
                                    {summary.blockedDays} blocked
                                  </span>
                                ) : null}

                                {summary.warningDays > 0 ? (
                                  <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold bg-amber-100 text-amber-700">
                                    {summary.warningDays} warning
                                  </span>
                                ) : null}
                              </div>
                            ) : null}

                            {residentValidation?.badgeText ? (
                              <div className="mt-2">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                    residentValidation.badgeText === "Error"
                                      ? "bg-rose-600 text-white"
                                      : "bg-amber-500 text-white"
                                  }`}
                                >
                                  {residentValidation.badgeText}
                                </span>
                              </div>
                            ) : null}
                          </div>

                          <div
                            className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                              selected
                                ? `${residentColor.border} ${residentColor.badge} ${residentColor.badgeText}`
                                : "border-slate-200 bg-slate-50 text-transparent"
                            }`}
                          >
                            <Check className="h-3 w-3" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    {selectedResident
                      ? `${selectedResident.displayName} is active`
                      : "No resident selected"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {selectedResident
                      ? `Mode: ${quickAssignSlotMode}. Hard blocks stop assignment. Warnings still show so you can make judgment calls.`
                      : "Choose a resident above, then start tapping dates."}
                  </p>
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
                  <Wand2 className="h-3.5 w-3.5" />
                  Compact quick add
                </div>
              </div>

              {selectedResident && selectedResidentMonthSummary ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedResidentMonthSummary.blockedDays > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {selectedResidentMonthSummary.blockedDays} blocked day
                      {selectedResidentMonthSummary.blockedDays === 1 ? "" : "s"}
                    </span>
                  ) : null}

                  {selectedResidentMonthSummary.warningDays > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      {selectedResidentMonthSummary.warningDays} warning day
                      {selectedResidentMonthSummary.warningDays === 1 ? "" : "s"}
                    </span>
                  ) : null}

                  {selectedResidentMonthSummary.blockedDays === 0 &&
                  selectedResidentMonthSummary.warningDays === 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                      No current availability issues
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[1.2rem] border border-slate-200 bg-white">
              <div className="border-b border-slate-200 px-3 py-3 md:px-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                      3. Tap calendar days
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Build the month directly on the calendar with live availability.
                    </p>
                  </div>

                  <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
                    Tap to assign
                  </div>
                </div>
              </div>

              {loading ? (
                <div className="flex min-h-[420px] items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : (
                <div className="flex min-w-0 flex-col xl:flex-row xl:items-stretch">
                  <div className="min-w-0 flex-1 p-3 md:p-4">
                    <div className="grid w-full grid-cols-7 gap-2 text-center text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                        (d) => (
                          <div key={d} className="py-1">
                            {d}
                          </div>
                        )
                      )}
                    </div>

                    <div className="mt-2 grid w-full grid-cols-7 gap-2">
                      {calendarGrid.map((day, index) => {
                        if (!day) {
                          return (
                            <div
                              key={`blank-${index}`}
                              className="min-h-[118px] rounded-[1rem] bg-transparent"
                            />
                          );
                        }

                        const current = draftAssignments[day.key];
                        const original = originalAssignments[day.key];
                        const isChanged =
                          (current?.primaryRosterId ?? null) !==
                            (original?.primaryRosterId ?? null) ||
                          (current?.backupRosterId ?? null) !==
                            (original?.backupRosterId ?? null) ||
                          (current?.buddyRosterId ?? null) !==
                            (original?.buddyRosterId ?? null);

                        const selectedResidentAvailability = selectedResident
                          ? getResidentDayAvailability(
                              availabilityByResident,
                              selectedResident.membershipId,
                              day.key
                            )
                          : null;

                        const primaryResidentForDay = current?.primaryRosterId
                          ? residentLookup.get(current.primaryRosterId)
                          : null;

                        const assignedCallTypeKeys = new Set<string>();
                        if (current?.primaryRosterId) assignedCallTypeKeys.add("primary");
                        if (current?.backupRosterId) assignedCallTypeKeys.add("backup");
                        if (current?.buddyRosterId) assignedCallTypeKeys.add("buddy");

                        // Program-driven slots for this day (deduped to one row
                        // per call type for the manual builder).
                        const seenSlotTypes = new Set<string>();
                        const visibleSlots = getVisibleCallSlotsForDay({
                          dayOfWeek: day.date.getDay(),
                          primaryCallPgyYear: primaryResidentForDay?.pgyYear ?? null,
                          assignedCallTypeKeys,
                          slotDefinitions: effectiveSlotDefinitions,
                          buddyDateState: buddyDateStateByDate?.get(day.key) ?? null,
                        }).filter((def) => {
                          if (seenSlotTypes.has(def.callType)) return false;
                          seenSlotTypes.add(def.callType);
                          return true;
                        });

                        const slotValidations: Record<
                          string,
                          SlotValidationDisplay | undefined
                        > = {};
                        if (validation) {
                          for (const def of visibleSlots) {
                            slotValidations[def.callType] = getSlotValidationGuidance(
                              validation,
                              serializeSlotId({
                                dateKey: day.key,
                                callType: def.callType,
                              })
                            );
                          }
                        }

                        return (
                          <DayChip
                            key={day.key}
                            day={day}
                            assignment={current}
                            selectedResidentId={quickAssignResidentId}
                            quickAssignSlotMode={quickAssignSlotMode}
                            residentLookup={residentLookup}
                            selectedResidentAvailability={selectedResidentAvailability}
                            isChanged={isChanged}
                            visibleSlots={visibleSlots}
                            slotValidations={slotValidations}
                            onClick={() => onToggleQuickAssignDay(day.key)}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <CalendarStatsRail
                    pgyRows={pgyRows}
                    callTypes={programCallTypes}
                    statsLoading={statsLoading}
                    residentLoading={residentLoading}
                    collapsed={statsCollapsed}
                    onToggle={() => setStatsCollapsed((prev) => !prev)}
                  />
                </div>
              )}
            </div>

            {selectedResident && selectedResidentBlockedDates.length > 0 ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3">
                <p className="text-sm font-semibold text-rose-800">
                  {selectedResident.displayName} has hard-blocked days this month
                </p>
                <p className="mt-1 text-xs text-rose-700">
                  These come from approved time off, rotation restrictions, or hard
                  scheduling rules.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {selectedResidentBlockedDates.slice(0, 12).map((dateKey) => (
                    <span
                      key={dateKey}
                      className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200"
                    >
                      {dateKey}
                    </span>
                  ))}
                  {selectedResidentBlockedDates.length > 12 ? (
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
                      +{selectedResidentBlockedDates.length - 12} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-[1.35rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {selectedResident
                ? `${selectedResident.displayName} is active`
                : "No resident selected"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {selectedResident
                ? `Current tap mode: ${quickAssignSlotMode}.`
                : "Choose a resident, then tap days to build the month fast."}
            </p>
          </div>

          {saving ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Saving...
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
              <Wand2 className="h-3.5 w-3.5" />
              Fast assignment mode
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
