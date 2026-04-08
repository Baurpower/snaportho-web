"use client";

import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Save,
  RotateCcw,
  X,
} from "lucide-react";
import type {
  AssignmentFlag,
  CalendarDay,
  DraftDayAssignment,
  ProgramRule,
  ResidentOption,
  ResidentAvailabilityForDate,
  ResidentAvailabilityMap,
} from "@/components/workspace/call/programcalltypes";

type DisplayFlag = {
  key: string;
  label: string;
  tone: "rose" | "amber" | "sky" | "violet" | "slate";
  description?: string | null;
  source: "assignment" | "availability";
  category?: "rule" | "time_off" | "rotation" | "warning";
};

function pgyLabel(
  resident:
    | ResidentOption
    | {
        trainingLevel: string | null;
        pgyYear?: number | null;
      }
) {
  if (resident.trainingLevel) return resident.trainingLevel;
  if (typeof resident.pgyYear === "number") return `PGY-${resident.pgyYear}`;
  return "Unknown";
}

function flagToneClasses(tone: DisplayFlag["tone"]) {
  if (tone === "rose") {
    return {
      dot: "bg-rose-500",
      badge: "border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100",
      panel: "border-rose-200 bg-rose-50",
    };
  }

  if (tone === "amber") {
    return {
      dot: "bg-amber-500",
      badge: "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100",
      panel: "border-amber-200 bg-amber-50",
    };
  }

  if (tone === "violet") {
    return {
      dot: "bg-violet-500",
      badge: "border-violet-200 bg-violet-50 text-violet-700 hover:bg-violet-100",
      panel: "border-violet-200 bg-violet-50",
    };
  }

  if (tone === "slate") {
    return {
      dot: "bg-slate-500",
      badge: "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100",
      panel: "border-slate-200 bg-slate-50",
    };
  }

  return {
    dot: "bg-sky-500",
    badge: "border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100",
    panel: "border-sky-200 bg-sky-50",
  };
}

function getResidentDayAvailability(
  availabilityByResident: ResidentAvailabilityMap,
  membershipId: string | null | undefined,
  dateKey: string
): ResidentAvailabilityForDate | null {
  if (!membershipId) return null;
  return availabilityByResident[membershipId]?.[dateKey] ?? null;
}

function buildDisplayFlags(params: {
  assignmentFlags: AssignmentFlag[];
  availabilityDay: ResidentAvailabilityForDate | null;
}): DisplayFlag[] {
  const assignmentFlags: DisplayFlag[] = params.assignmentFlags.map((flag) => ({
    key: `assignment-${flag.key}`,
    label: flag.label,
    tone: flag.tone,
    description: flag.description ?? null,
    source: "assignment",
    category: "rule",
  }));

  const availabilityFlags: DisplayFlag[] =
    params.availabilityDay?.flags.map((flag) => ({
      key: `availability-${flag.key}`,
      label: flag.label,
      tone: flag.tone,
      description: flag.description ?? null,
      source: "availability",
      category: flag.category,
    })) ?? [];

  return [...availabilityFlags, ...assignmentFlags];
}

function countChangedSlots(
  draftAssignments: Record<string, DraftDayAssignment>,
  originalAssignments: Record<string, DraftDayAssignment>
) {
  const allKeys = new Set([
    ...Object.keys(draftAssignments),
    ...Object.keys(originalAssignments),
  ]);

  let changed = 0;

  for (const key of allKeys) {
    const draft = draftAssignments[key];
    const original = originalAssignments[key];

    if (
      (draft?.primaryMembershipId ?? null) !==
      (original?.primaryMembershipId ?? null)
    ) {
      changed += 1;
    }

    if (
      (draft?.backupMembershipId ?? null) !==
      (original?.backupMembershipId ?? null)
    ) {
      changed += 1;
    }
  }

  return changed;
}

function CalendarStatsRail({
  pgyRows,
  statsLoading,
  residentLoading,
  collapsed,
  onToggle,
}: {
  pgyRows: Array<{
    label: string;
    monthTotal: number;
    monthWeekend: number;
    yearTotal: number;
    yearWeekend: number;
  }>;
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
                <div
                  key={row.label}
                  className="min-w-[220px] shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      totals
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        Month
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.monthTotal}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        M Wknd
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.monthWeekend}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        Year
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.yearTotal}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        Y Wknd
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.yearWeekend}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden space-y-2 xl:block">
              {pgyRows.map((row) => (
                <div
                  key={row.label}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5"
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{row.label}</p>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      totals
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        Month
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.monthTotal}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        M Wknd
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.monthWeekend}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        Year
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.yearTotal}</p>
                    </div>

                    <div className="rounded-lg bg-slate-50 px-2 py-1.5">
                      <p className="text-[9px] uppercase tracking-[0.12em] text-slate-400">
                        Y Wknd
                      </p>
                      <p className="text-sm font-bold text-slate-950">{row.yearWeekend}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}

function AssignmentCard({
  label,
  residentName,
  secondaryText,
  flags,
  changed,
  removed,
  blocked,
  warning,
  onClick,
  onOpenFlag,
}: {
  label: "Primary" | "Backup";
  residentName: string | null;
  secondaryText: string;
  flags: DisplayFlag[];
  changed: boolean;
  removed: boolean;
  blocked: boolean;
  warning: boolean;
  onClick: () => void;
  onOpenFlag: (flag: DisplayFlag) => void;
}) {
  const filled = !!residentName;

  const toneClass = removed
    ? "border-rose-300 bg-rose-50 hover:bg-rose-100"
    : blocked
    ? "border-rose-300 bg-rose-50 hover:bg-rose-100"
    : changed
    ? "border-sky-300 bg-sky-50 hover:bg-sky-100"
    : warning || flags.length > 0
    ? "border-amber-200 bg-amber-50/70 hover:bg-amber-100/70"
    : filled
    ? "border-slate-200 bg-white hover:bg-slate-50"
    : "border-dashed border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-full min-h-[74px] w-full min-w-0 flex-col overflow-hidden rounded-xl border px-2.5 py-2 text-left transition ${toneClass}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          {label}
        </p>

        <div className="flex shrink-0 items-center gap-1">
          {blocked ? (
            <span className="hidden rounded-full border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-[8px] font-semibold text-rose-700 2xl:inline-flex">
              Blocked
            </span>
          ) : null}

          {!blocked && warning ? (
            <span className="hidden rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700 2xl:inline-flex">
              Warning
            </span>
          ) : null}

          {changed ? (
            <span className="hidden rounded-full border border-sky-200 bg-sky-100 px-1.5 py-0.5 text-[8px] font-semibold text-sky-700 2xl:inline-flex">
              Changed
            </span>
          ) : null}

          {removed ? (
            <span className="hidden rounded-full border border-rose-200 bg-rose-100 px-1.5 py-0.5 text-[8px] font-semibold text-rose-700 2xl:inline-flex">
              Removed
            </span>
          ) : null}

          {flags.length > 0 ? (
            <div className="flex items-center gap-1">
              {flags.slice(0, 1).map((flag) => {
                const tone = flagToneClasses(flag.tone);
                return (
                  <button
                    key={flag.key}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFlag(flag);
                    }}
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full border shadow-sm transition ${tone.badge}`}
                    aria-label={flag.label}
                    title={flag.label}
                  >
                    <AlertTriangle className="h-3 w-3" />
                  </button>
                );
              })}

              {flags.length > 1 ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenFlag(flags[0]);
                  }}
                  className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-slate-200 bg-white px-1 text-[8px] font-semibold text-slate-600 shadow-sm transition hover:bg-slate-50"
                  aria-label={`${flags.length} flags`}
                  title={`${flags.length} flags`}
                >
                  +{flags.length - 1}
                </button>
              ) : null}
            </div>
          ) : null}

          <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
        </div>
      </div>

      <div className="mt-1 min-w-0 flex-1">
        <p className="line-clamp-2 break-words text-[13px] font-semibold leading-snug text-slate-900">
          {residentName ?? `Select ${label.toLowerCase()}`}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {secondaryText}
        </p>
      </div>
    </button>
  );
}

function DayCell({
  day,
  current,
  original,
  residentLookup,
  getAssignmentFlags,
  rules,
  onOpenPicker,
  onOpenFlag,
  draftAssignments,
  availabilityByResident,
}: {
  day: CalendarDay;
  current: DraftDayAssignment | undefined;
  original: DraftDayAssignment | undefined;
  residentLookup: Map<string, ResidentOption>;
  getAssignmentFlags: (params: {
    residentId: string | null | undefined;
    dateKey: string;
    assignments: Record<string, DraftDayAssignment>;
    rules: ProgramRule[];
  }) => AssignmentFlag[];
  rules: ProgramRule[];
  onOpenPicker: (dateKey: string, slot: "Primary" | "Backup") => void;
  onOpenFlag: (payload: {
    dayLabel: string;
    slot: "Primary" | "Backup";
    flag: DisplayFlag;
    residentName: string | null;
  }) => void;
  draftAssignments: Record<string, DraftDayAssignment>;
  availabilityByResident: ResidentAvailabilityMap;
}) {
  const primaryResident = current?.primaryMembershipId
    ? residentLookup.get(current.primaryMembershipId)
    : null;

  const backupResident = current?.backupMembershipId
    ? residentLookup.get(current.backupMembershipId)
    : null;

  const primaryAssignmentFlags = getAssignmentFlags({
    residentId: current?.primaryMembershipId,
    dateKey: day.key,
    assignments: draftAssignments,
    rules,
  });

  const backupAssignmentFlags = getAssignmentFlags({
    residentId: current?.backupMembershipId,
    dateKey: day.key,
    assignments: draftAssignments,
    rules,
  });

  const primaryAvailability = getResidentDayAvailability(
    availabilityByResident,
    current?.primaryMembershipId,
    day.key
  );

  const backupAvailability = getResidentDayAvailability(
    availabilityByResident,
    current?.backupMembershipId,
    day.key
  );

  const primaryFlags = buildDisplayFlags({
    assignmentFlags: primaryAssignmentFlags,
    availabilityDay: primaryAvailability,
  });

  const backupFlags = buildDisplayFlags({
    assignmentFlags: backupAssignmentFlags,
    availabilityDay: backupAvailability,
  });

  const primaryChanged =
    (current?.primaryMembershipId ?? null) !==
    (original?.primaryMembershipId ?? null);

  const backupChanged =
    (current?.backupMembershipId ?? null) !==
    (original?.backupMembershipId ?? null);

  const primaryRemoved =
    !!original?.primaryMembershipId && !current?.primaryMembershipId;

  const backupRemoved =
    !!original?.backupMembershipId && !current?.backupMembershipId;

  return (
    <div
      className={`flex min-h-[174px] min-w-0 flex-col overflow-hidden border border-slate-200 p-2 ${
        day.isWeekend ? "bg-amber-50/40" : "bg-white"
      }`}
    >
      <div className="mb-2 flex min-h-[24px] items-center justify-between gap-2">
        <div className="min-w-0 flex items-center gap-1.5">
          <p className="shrink-0 text-[13px] font-bold text-slate-950">
            {day.dayNumber}
          </p>
          <span className="truncate text-[10px] text-slate-400">
            {day.dayName}
          </span>
        </div>

        {day.isWeekend ? (
          <span className="shrink-0 rounded-full border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-amber-700">
            Wknd
          </span>
        ) : null}
      </div>

      <div className="grid flex-1 grid-rows-2 gap-1.5">
        <AssignmentCard
          label="Primary"
          residentName={primaryResident?.displayName ?? null}
          secondaryText={
            primaryResident ? pgyLabel(primaryResident) : "Tap to assign"
          }
          flags={primaryFlags}
          changed={primaryChanged}
          removed={primaryRemoved}
          blocked={Boolean(primaryAvailability?.isBlocked)}
          warning={Boolean(primaryAvailability?.isWarning)}
          onClick={() => onOpenPicker(day.key, "Primary")}
          onOpenFlag={(flag) =>
            onOpenFlag({
              dayLabel: `${day.dayName} ${day.dayNumber}`,
              slot: "Primary",
              flag,
              residentName: primaryResident?.displayName ?? null,
            })
          }
        />

        <AssignmentCard
          label="Backup"
          residentName={backupResident?.displayName ?? null}
          secondaryText={
            backupResident ? pgyLabel(backupResident) : "Tap to assign"
          }
          flags={backupFlags}
          changed={backupChanged}
          removed={backupRemoved}
          blocked={Boolean(backupAvailability?.isBlocked)}
          warning={Boolean(backupAvailability?.isWarning)}
          onClick={() => onOpenPicker(day.key, "Backup")}
          onOpenFlag={(flag) =>
            onOpenFlag({
              dayLabel: `${day.dayName} ${day.dayNumber}`,
              slot: "Backup",
              flag,
              residentName: backupResident?.displayName ?? null,
            })
          }
        />
      </div>
    </div>
  );
}

type EditViewProps = {
  calendarGrid: Array<CalendarDay | null>;
  draftAssignments: Record<string, DraftDayAssignment>;
  originalAssignments: Record<string, DraftDayAssignment>;
  residentLookup: Map<string, ResidentOption>;
  getAssignmentFlags: (params: {
    residentId: string | null | undefined;
    dateKey: string;
    assignments: Record<string, DraftDayAssignment>;
    rules: ProgramRule[];
  }) => AssignmentFlag[];
  rules: ProgramRule[];
  availabilityByResident: ResidentAvailabilityMap;
  onOpenPicker: (dateKey: string, slot: "Primary" | "Backup") => void;
  pgyRows: Array<{
    label: string;
    monthTotal: number;
    monthWeekend: number;
    yearTotal: number;
    yearWeekend: number;
  }>;
  statsLoading: boolean;
  residentLoading: boolean;
  statsCollapsed: boolean;
  setStatsCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  onSave: () => void;
  onReset: () => void;
  saving: boolean;
};

export default function ProgramCallEditView({
  calendarGrid,
  draftAssignments,
  originalAssignments,
  residentLookup,
  getAssignmentFlags,
  rules,
  availabilityByResident,
  onOpenPicker,
  pgyRows,
  statsLoading,
  residentLoading,
  statsCollapsed,
  setStatsCollapsed,
  onSave,
  onReset,
  saving,
}: EditViewProps) {
  const [activeFlag, setActiveFlag] = useState<{
    dayLabel: string;
    slot: "Primary" | "Backup";
    flag: DisplayFlag;
    residentName: string | null;
  } | null>(null);

  const totalFlags = useMemo(() => {
    return calendarGrid.reduce((sum, day) => {
      if (!day) return sum;

      const current = draftAssignments[day.key];

      const primaryAssignmentFlags = getAssignmentFlags({
        residentId: current?.primaryMembershipId,
        dateKey: day.key,
        assignments: draftAssignments,
        rules,
      });

      const backupAssignmentFlags = getAssignmentFlags({
        residentId: current?.backupMembershipId,
        dateKey: day.key,
        assignments: draftAssignments,
        rules,
      });

      const primaryAvailability = getResidentDayAvailability(
        availabilityByResident,
        current?.primaryMembershipId,
        day.key
      );

      const backupAvailability = getResidentDayAvailability(
        availabilityByResident,
        current?.backupMembershipId,
        day.key
      );

      return (
        sum +
        buildDisplayFlags({
          assignmentFlags: primaryAssignmentFlags,
          availabilityDay: primaryAvailability,
        }).length +
        buildDisplayFlags({
          assignmentFlags: backupAssignmentFlags,
          availabilityDay: backupAvailability,
        }).length
      );
    }, 0);
  }, [calendarGrid, draftAssignments, getAssignmentFlags, rules, availabilityByResident]);

  const changedSlotCount = useMemo(() => {
    return countChangedSlots(draftAssignments, originalAssignments);
  }, [draftAssignments, originalAssignments]);

  const hasChanges = changedSlotCount > 0;

  return (
    <>
      <div className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 bg-slate-50 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Edit Mode
              </p>
              <h3 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
                Review and edit assignments
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Tap a card to change an assignment. Availability conflicts, time
                off, rotation restrictions, and rule flags are surfaced directly
                on the calendar.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                {totalFlags} flag{totalFlags === 1 ? "" : "s"}
              </div>

              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  hasChanges
                    ? "border-sky-200 bg-sky-50 text-sky-700"
                    : "border-slate-200 bg-white text-slate-500"
                }`}
              >
                {changedSlotCount} changed slot{changedSlotCount === 1 ? "" : "s"}
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col xl:flex-row xl:items-stretch">
          <div className="min-w-0 flex-1">
            <div className="grid w-full grid-cols-7 border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-[0.08em] text-slate-500">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="px-1 py-2 text-center">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid w-full grid-cols-7">
              {calendarGrid.map((day, index) => {
                if (!day) {
                  return (
                    <div
                      key={`blank-${index}`}
                      className="min-h-[174px] border border-slate-200 bg-slate-50/50"
                    />
                  );
                }

                return (
                  <DayCell
                    key={day.key}
                    day={day}
                    current={draftAssignments[day.key]}
                    original={originalAssignments[day.key]}
                    residentLookup={residentLookup}
                    getAssignmentFlags={getAssignmentFlags}
                    rules={rules}
                    onOpenPicker={onOpenPicker}
                    onOpenFlag={setActiveFlag}
                    draftAssignments={draftAssignments}
                    availabilityByResident={availabilityByResident}
                  />
                );
              })}
            </div>
          </div>

          <CalendarStatsRail
            pgyRows={pgyRows}
            statsLoading={statsLoading}
            residentLoading={residentLoading}
            collapsed={statsCollapsed}
            onToggle={() => setStatsCollapsed((prev) => !prev)}
          />
        </div>

        <div className="border-t border-slate-200 bg-white px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="text-sm text-slate-500">
              {hasChanges
                ? `You have ${changedSlotCount} unsaved change${changedSlotCount === 1 ? "" : "s"}.`
                : "No unsaved changes."}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={onReset}
                disabled={saving || !hasChanges}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset changes
              </button>

              <button
                type="button"
                onClick={onSave}
                disabled={saving || !hasChanges}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {activeFlag ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-[0_24px_80px_rgba(15,23,42,0.22)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <div
                    className={`h-2.5 w-2.5 rounded-full ${
                      flagToneClasses(activeFlag.flag.tone).dot
                    }`}
                  />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                    {activeFlag.flag.source === "availability"
                      ? "Availability flag"
                      : "Assignment flag"}
                  </p>
                </div>

                <h4 className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                  {activeFlag.flag.label}
                </h4>
                <p className="mt-1 text-sm text-slate-500">
                  {activeFlag.dayLabel} · {activeFlag.slot}
                  {activeFlag.residentName ? ` · ${activeFlag.residentName}` : ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveFlag(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div
              className={`mt-4 rounded-2xl border p-4 ${
                flagToneClasses(activeFlag.flag.tone).panel
              }`}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {activeFlag.flag.label}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    {activeFlag.flag.description ??
                      "This assignment triggers an availability or rule concern."}
                  </p>
                  {activeFlag.flag.category ? (
                    <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Category: {activeFlag.flag.category}
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveFlag(null)}
                className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}