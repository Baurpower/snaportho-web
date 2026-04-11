"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseMedical,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Loader2,
  MapPin,
  PlaneTakeoff,
  StickyNote,
  UserRound,
  X,
  Bell,
} from "lucide-react";

type TimeOffType = "personal" | "conference";
type ConstraintLevel = "hard" | "soft" | "informational";
type ApprovalStatus = "requested" | "approved" | "denied";

type MonthContextResponse = {
  monthStart: string;
  monthEnd: string;
  membership: {
    id: string;
    rosterId?: string | null;
    displayName: string | null;
    gradYear?: number | null;
    pgyYear?: number | null;
    trainingLevel: string | null;
  } | null;
  rotations: Array<{
    id: string;
    startDate: string | null;
    endDate: string | null;
    title: string;
    color: string | null;
    siteLabel?: string | null;
    teamLabel?: string | null;
    notes?: string | null;
  }>;
  calls: Array<{
    id: string;
    title: string | null;
    date: string | null;
    callType: string | null;
    startDatetime: string | null;
    endDatetime: string | null;
    site: string | null;
    isHomeCall: boolean | null;
    notes: string | null;
  }>;
  events: Array<{
    id: string;
    title: string | null;
    date: string | null;
    category: string | null;
    startTime?: string | null;
    endTime?: string | null;
    isAllDay?: boolean | null;
    location?: string | null;
    description?: string | null;
    attending?: string | null;
  }>;
  timeOff: Array<{
    id: string;
    membershipId: string | null;
    residentName?: string | null;
    trainingLevel?: string | null;
    classYear?: number | null;
    userId?: string | null;
    type: TimeOffType | null;
    usingPto: boolean;
    startDate: string | null;
    endDate: string | null;
    title: string | null;
    location: string | null;
    notes: string | null;
    approvalStatus: ApprovalStatus | null;
    approved: boolean | null;
    isMine: boolean;
  }>;
};

function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatShortDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfWeekSunday(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function buildCalendarWeeksSunday(year: number, monthIndex: number) {
  const monthStart = startOfMonth(year, monthIndex);
  const monthEnd = endOfMonth(year, monthIndex);

  const gridStart = startOfWeekSunday(monthStart);
  const gridEnd = addDays(startOfWeekSunday(monthEnd), 6);

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function enumerateDateKeys(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function getSortedRange(a: string, b: string) {
  return a <= b
    ? { startDate: a, endDate: b }
    : { startDate: b, endDate: a };
}

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

function getTimeOffStyles(type: TimeOffType) {
  if (type === "conference") {
    return {
      chipActive: "bg-violet-600 text-white shadow-sm",
      chipInactive: "bg-violet-50 text-violet-900 hover:bg-violet-100",
      selectedDay: "border-violet-400 bg-violet-50 shadow-sm",
      selectedIcon: "bg-violet-600 text-white",
      selectedBadge: "bg-violet-600 text-white",
      focus: "focus:border-violet-300 focus:ring-violet-100",
      previewTone: "border-violet-200 bg-violet-50",
      accentIcon: BriefcaseMedical,
      accentSoft: "bg-violet-100 text-violet-700",
      label: "Conference",
    };
  }

  return {
    chipActive: "bg-slate-900 text-white shadow-sm",
    chipInactive: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    selectedDay: "border-slate-400 bg-slate-50 shadow-sm",
    selectedIcon: "bg-slate-900 text-white",
    selectedBadge: "bg-slate-900 text-white",
    focus: "focus:border-slate-300 focus:ring-slate-100",
    previewTone: "border-slate-200 bg-slate-50",
    accentIcon: UserRound,
    accentSoft: "bg-slate-100 text-slate-700",
    label: "Personal",
  };
}

function ChipButton({
  active,
  label,
  activeClassName,
  inactiveClassName,
  onClick,
}: {
  active: boolean;
  label: string;
  activeClassName: string;
  inactiveClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
        active ? activeClassName : inactiveClassName
      }`}
    >
      {label}
    </button>
  );
}

export default function AddTimeOffPage() {
  const router = useRouter();
  const today = new Date();

  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  });

  const [timeOffType, setTimeOffType] = useState<TimeOffType>("personal");
  const [usingPto, setUsingPto] = useState(false);

  const [selectedStartDate, setSelectedStartDate] = useState<string | null>(null);
  const [selectedEndDate, setSelectedEndDate] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [constraintLevel, setConstraintLevel] =
    useState<ConstraintLevel>("soft");

  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [lastSavedSummary, setLastSavedSummary] = useState<{
    eventType: TimeOffType;
    usingPto: boolean;
    startDate: string;
    endDate: string;
    title: string | null;
    location: string | null;
    notes: string | null;
    constraintLevel: ConstraintLevel;
    approvalStatus: ApprovalStatus;
    sourceKind: string;
  } | null>(null);

  const [monthContext, setMonthContext] = useState<MonthContextResponse | null>(
    null
  );
  const [monthContextLoading, setMonthContextLoading] = useState(false);
  const [monthContextError, setMonthContextError] = useState<string | null>(null);

  const typeStyles = getTimeOffStyles(timeOffType);
  const AccentIcon = typeStyles.accentIcon;

  const weeks = useMemo(
    () => buildCalendarWeeksSunday(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  const todayKey = toDateKey(new Date());

  const selectedDateKeys = useMemo(() => {
    if (!selectedStartDate) return [];
    if (!selectedEndDate) return [selectedStartDate];

    const { startDate, endDate } = getSortedRange(
      selectedStartDate,
      selectedEndDate
    );
    return enumerateDateKeys(startDate, endDate);
  }, [selectedStartDate, selectedEndDate]);

  const selectionSummary = useMemo(() => {
    if (!selectedStartDate) return null;
    if (!selectedEndDate) {
      return {
        startDate: selectedStartDate,
        endDate: selectedStartDate,
      };
    }

    return getSortedRange(selectedStartDate, selectedEndDate);
  }, [selectedStartDate, selectedEndDate]);

  useEffect(() => {
    let cancelled = false;

    async function loadMonthContext() {
      try {
        setMonthContextLoading(true);
        setMonthContextError(null);

        const { monthStart, monthEnd } = getMonthRange(
          visibleMonth.year,
          visibleMonth.monthIndex
        );

        const response = await fetch(
          `/api/me/month-lite?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load month context");
        }

        if (!cancelled) {
          setMonthContext(payload as MonthContextResponse);
        }
      } catch (error) {
        if (!cancelled) {
          setMonthContextError(
            error instanceof Error ? error.message : "Failed to load month context"
          );
        }
      } finally {
        if (!cancelled) {
          setMonthContextLoading(false);
        }
      }
    }

    loadMonthContext();

    return () => {
      cancelled = true;
    };
  }, [visibleMonth.year, visibleMonth.monthIndex]);

  const myCallDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const call of monthContext?.calls ?? []) {
      if (call.date) set.add(call.date);
    }
    return set;
  }, [monthContext]);

  const myExistingTimeOffDateSet = useMemo(() => {
    const set = new Set<string>();
    for (const item of monthContext?.timeOff ?? []) {
      if (!item.startDate || !item.endDate) continue;
      for (const dateKey of enumerateDateKeys(item.startDate, item.endDate)) {
        set.add(dateKey);
      }
    }
    return set;
  }, [monthContext]);

  const myRotationDateMap = useMemo(() => {
    const map = new Map<string, { title: string; color: string | null }>();

    for (const rotation of monthContext?.rotations ?? []) {
      if (!rotation.startDate || !rotation.endDate) continue;

      for (const dateKey of enumerateDateKeys(rotation.startDate, rotation.endDate)) {
        if (!map.has(dateKey)) {
          map.set(dateKey, {
            title: rotation.title,
            color: rotation.color ?? null,
          });
        }
      }
    }

    return map;
  }, [monthContext]);

  const selectedConflictDates = useMemo(() => {
    return selectedDateKeys.filter((dateKey) => myCallDateSet.has(dateKey));
  }, [selectedDateKeys, myCallDateSet]);

  const monthCallCount = useMemo(
    () => (monthContext?.calls ?? []).filter((call) => !!call.date).length,
    [monthContext]
  );

  const currentRotationLabel = useMemo(() => {
    const todayRotation = myRotationDateMap.get(todayKey);
    if (todayRotation) return todayRotation.title;

    const firstRotation = monthContext?.rotations?.[0];
    return firstRotation?.title ?? null;
  }, [myRotationDateMap, todayKey, monthContext]);

  useEffect(() => {
    if (!showSuccessModal) return;

    setRedirectCountdown(3);

    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          router.push("/work/time-off");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showSuccessModal, router]);

  function resetSelection() {
    setSelectedStartDate(null);
    setSelectedEndDate(null);
  }

  function handleDateClick(dateKey: string) {
    setLocalError(null);
    setSuccessMessage(null);

    if (!selectedStartDate) {
      setSelectedStartDate(dateKey);
      setSelectedEndDate(null);
      return;
    }

    if (selectedStartDate && !selectedEndDate) {
      if (dateKey === selectedStartDate) {
        setSelectedEndDate(dateKey);
        return;
      }

      setSelectedEndDate(dateKey);
      return;
    }

    setSelectedStartDate(dateKey);
    setSelectedEndDate(null);
  }

  async function handleSave() {
    try {
      setLocalError(null);
      setSuccessMessage(null);

      if (!selectionSummary) {
        setLocalError("Select at least one date for your time off.");
        return;
      }

      if (selectedConflictDates.length > 0) {
        setLocalError(
          "One or more selected dates already have call assigned. Clear those dates or reassign the call before saving time off."
        );
        return;
      }

      setSaving(true);

      const titleValue = title.trim() || null;
      const locationValue = location.trim() || null;
      const notesValue = notes.trim() || null;
      const sourceKind = "self_reported";
      const approvalStatus: ApprovalStatus = "requested";

      const response = await fetch("/api/program/time-off", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          eventType: timeOffType,
          usingPto,
          sourceKind,
          constraintLevel,
          title: titleValue,
          notes: notesValue,
          location: locationValue,
          startDate: selectionSummary.startDate,
          endDate: selectionSummary.endDate,
          approvalStatus,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save time-off request");
      }

      setLastSavedSummary({
        eventType: timeOffType,
        usingPto,
        startDate: selectionSummary.startDate,
        endDate: selectionSummary.endDate,
        title: titleValue,
        location: locationValue,
        notes: notesValue,
        constraintLevel,
        approvalStatus,
        sourceKind,
      });

      setSuccessMessage("Saved your time-off request.");
      resetSelection();
      setTitle("");
      setLocation("");
      setNotes("");
      setConstraintLevel("soft");
      setUsingPto(false);
      setShowSuccessModal(true);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to save time-off request"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_390px]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Time-Off Add
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  Tap your date range
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose personal or conference, decide whether you are using
                  PTO, then tap a start date and an end date.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth((prev) => {
                      const next = new Date(prev.year, prev.monthIndex - 1, 1);
                      return {
                        year: next.getFullYear(),
                        monthIndex: next.getMonth(),
                      };
                    })
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                <div className="min-w-[190px] rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-center">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                    Visible Month
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-slate-950">
                    {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setVisibleMonth((prev) => {
                      const next = new Date(prev.year, prev.monthIndex + 1, 1);
                      return {
                        year: next.getFullYear(),
                        monthIndex: next.getMonth(),
                      };
                    })
                  }
                  className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <ChipButton
                label="Personal"
                active={timeOffType === "personal"}
                activeClassName="bg-slate-900 text-white shadow-sm"
                inactiveClassName="bg-slate-100 text-slate-900 hover:bg-slate-200"
                onClick={() => setTimeOffType("personal")}
              />
              <ChipButton
                label="Conference"
                active={timeOffType === "conference"}
                activeClassName="bg-violet-600 text-white shadow-sm"
                inactiveClassName="bg-violet-50 text-violet-900 hover:bg-violet-100"
                onClick={() => setTimeOffType("conference")}
              />
            </div>
          </div>

          <div className="px-3 pb-4 pt-3 md:px-4">
            <div className="mb-2 grid grid-cols-7 gap-1.5">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="space-y-1.5">
              {weeks.map((week, weekIndex) => (
                <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1.5">
                  {week.map((date) => {
                    const key = toDateKey(date);
                    const inMonth = isSameMonth(
                      date,
                      visibleMonth.year,
                      visibleMonth.monthIndex
                    );
                    const isToday = key === todayKey;
                    const isSelected = selectedDateKeys.includes(key);

                    const hasExistingCall = myCallDateSet.has(key);
                    const hasExistingTimeOff = myExistingTimeOffDateSet.has(key);
                    const rotationForDay = myRotationDateMap.get(key) ?? null;
                    const selectedHasConflict = isSelected && hasExistingCall;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => inMonth && handleDateClick(key)}
                        className={[
                          "min-h-[116px] rounded-[1.45rem] border p-3 text-left transition",
                          inMonth
                            ? "bg-white hover:border-slate-300"
                            : "border-transparent bg-slate-50/60",
                          isToday && inMonth ? "ring-2 ring-slate-900/10" : "",
                          isSelected ? typeStyles.selectedDay : "",
                          selectedHasConflict
                            ? "border-amber-400 ring-2 ring-amber-200"
  : hasExistingCall && inMonth
  ? "border-rose-400 bg-rose-50/40"
  : hasExistingTimeOff && inMonth
  ? "border-emerald-300"
  : "border-slate-200"
                        ].join(" ")}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span
                            className={[
                              "text-xs font-semibold",
                              inMonth ? "text-slate-700" : "text-slate-300",
                            ].join(" ")}
                          >
                            {date.getDate()}
                          </span>

                          {isSelected ? (
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${typeStyles.selectedIcon}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-2.5 flex min-h-[56px] flex-col justify-start gap-2">
                          {hasExistingCall ? (
  <div
    className={`inline-flex w-fit items-center gap-2 rounded-full px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] ${
      selectedHasConflict
        ? "bg-amber-500 text-white"
        : "bg-rose-600 text-white shadow-sm"
    }`}
  >
    <Bell className="h-3.5 w-3.5" />
    {selectedHasConflict ? "Call conflict" : "Call"}
  </div>
) : null}

                          {rotationForDay ? (
                            <div className="truncate rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700">
                              {rotationForDay.title}
                            </div>
                          ) : null}

                          {!hasExistingCall && isSelected ? (
                            <div
                              className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${typeStyles.selectedBadge}`}
                            >
                              <AccentIcon className="h-3 w-3" />
                              {typeStyles.label}
                            </div>
                          ) : !hasExistingCall && hasExistingTimeOff ? (
                            <div className="inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white">
                              <PlaneTakeoff className="h-3 w-3" />
                              Existing off
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl md:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Time-Off Details
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Apply to selected dates
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Keep this quick: choose the request type, set PTO if needed, and
            save your request.
          </p>

          <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {selectedDateKeys.length} selected day
              {selectedDateKeys.length === 1 ? "" : "s"}
            </p>

            <div className="mt-3">
              {!selectionSummary ? (
                <span className="text-sm text-slate-500">
                  Tap a start date, then tap an end date.
                </span>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    Start: {formatShortDate(selectionSummary.startDate)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                    End: {formatShortDate(selectionSummary.endDate)}
                  </span>
                  <button
                    type="button"
                    onClick={resetSelection}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-50"
                  >
                    Clear
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">Visible month context</p>

            {monthContextLoading ? (
              <p className="mt-2 text-sm text-slate-500">Loading month details...</p>
            ) : monthContextError ? (
              <p className="mt-2 text-sm text-rose-600">{monthContextError}</p>
            ) : (
              <div className="mt-3 grid gap-3">
<div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3">
  <div className="flex items-center gap-2">
    <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-600 text-white">
      <Bell className="h-4.5 w-4.5" />
    </div>
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-700">
        Calls this month
      </p>
      <p className="text-lg font-bold text-rose-950">
        {monthCallCount}
      </p>
    </div>
  </div>
</div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Rotation
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentRotationLabel ? (
                      <span className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200">
                        {currentRotationLabel}
                      </span>
                    ) : (
                      <span className="text-sm text-slate-500">No visible rotation</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">
              Request type
            </p>
            <div className="flex flex-wrap gap-2">
              <ChipButton
                label="Personal"
                active={timeOffType === "personal"}
                activeClassName="bg-slate-900 text-white shadow-sm"
                inactiveClassName="bg-slate-100 text-slate-900 hover:bg-slate-200"
                onClick={() => setTimeOffType("personal")}
              />
              <ChipButton
                label="Conference"
                active={timeOffType === "conference"}
                activeClassName="bg-violet-600 text-white shadow-sm"
                inactiveClassName="bg-violet-50 text-violet-900 hover:bg-violet-100"
                onClick={() => setTimeOffType("conference")}
              />
            </div>
          </div>

          <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <PlaneTakeoff className="h-4 w-4 text-slate-700" />
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    Using PTO
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Toggle this on if this request is using PTO.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setUsingPto((prev) => !prev)}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                  usingPto
                    ? timeOffType === "conference"
                      ? "bg-violet-600"
                      : "bg-slate-900"
                    : "bg-slate-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                    usingPto ? "translate-x-6" : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <CalendarDays className="h-4 w-4" />
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  timeOffType === "conference"
                    ? "AAOS annual meeting, OTA, course, etc."
                    : "Optional short label for this request"
                }
                className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${typeStyles.focus}`}
              />
            </label>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MapPin className="h-4 w-4" />
                Location
              </span>
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Optional city, hospital, conference site, etc."
                className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${typeStyles.focus}`}
              />
            </label>

            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <Clock3 className="h-4 w-4" />
                    Constraint level
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Hard = should not schedule over it, soft = try to avoid,
                    informational = visible only.
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <ChipButton
  label="Hard"
  active={constraintLevel === "hard"}
  activeClassName="bg-blue-200 text-blue-900 shadow-sm"
  inactiveClassName="bg-blue-50 text-blue-800 hover:bg-blue-100"
  onClick={() => setConstraintLevel("hard")}
/>
                <ChipButton
  label="Soft"
  active={constraintLevel === "soft"}
  activeClassName="bg-pink-200 text-pink-900 shadow-sm"
  inactiveClassName="bg-pink-50 text-pink-700 hover:bg-pink-100"
  onClick={() => setConstraintLevel("soft")}
/>
                <ChipButton
                  label="Info"
                  active={constraintLevel === "informational"}
                  activeClassName="bg-slate-700 text-white shadow-sm"
                  inactiveClassName="bg-slate-100 text-slate-900 hover:bg-slate-200"
                  onClick={() => setConstraintLevel("informational")}
                />
              </div>
            </div>

            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <StickyNote className="h-4 w-4" />
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                placeholder="Optional notes for this time-off request"
                className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${typeStyles.focus}`}
              />
            </label>
          </div>

          <div
            className={`mt-6 rounded-[1rem] border border-dashed px-4 py-4 ${typeStyles.previewTone}`}
          >
            <p className="text-sm font-semibold text-slate-900">Preview</p>
            <p className="mt-2 text-sm text-slate-600">
              {!selectionSummary
                ? "No dates selected yet."
                : `${typeStyles.label} • ${
                    usingPto ? "Uses PTO" : "No PTO"
                  } • ${formatLongDate(
                    selectionSummary.startDate
                  )} to ${formatLongDate(selectionSummary.endDate)} • ${
                    constraintLevel === "hard"
                      ? "Hard block"
                      : constraintLevel === "soft"
                      ? "Soft preference"
                      : "Informational"
                  } • Requested`}
            </p>
          </div>

          {selectedConflictDates.length > 0 ? (
            <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              You selected {selectedConflictDates.length} day
              {selectedConflictDates.length === 1 ? "" : "s"} that already have call assigned:
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedConflictDates.map((dateKey) => (
                  <span
                    key={dateKey}
                    className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
                  >
                    {formatShortDate(dateKey)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {localError ? (
            <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {localError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {successMessage}
            </div>
          ) : null}

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !selectionSummary}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <AccentIcon className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Time-Off"}
            </button>

            <span className="text-xs text-slate-500">
              {!selectionSummary
                ? "Select a date range to save."
                : "Ready to save your time-off request."}
            </span>
          </div>
        </div>
      </div>

      {showSuccessModal && lastSavedSummary ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-7">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${typeStyles.accentSoft}`}
              >
                <Check className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Time-Off Saved
                </p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  {getTimeOffStyles(lastSavedSummary.eventType).label} request added
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Your time-off request was saved successfully.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">Dates</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {enumerateDateKeys(
                      lastSavedSummary.startDate,
                      lastSavedSummary.endDate
                    ).map((date) => (
                      <span
                        key={date}
                        className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                      >
                        {formatShortDate(date)}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="font-semibold text-slate-900">Type</p>
                    <p className="mt-1 text-slate-600">
                      {getTimeOffStyles(lastSavedSummary.eventType).label}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Status</p>
                    <p className="mt-1 text-slate-600 capitalize">
                      {lastSavedSummary.approvalStatus}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Uses PTO</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.usingPto ? "Yes" : "No"}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Constraint</p>
                    <p className="mt-1 text-slate-600 capitalize">
                      {lastSavedSummary.constraintLevel}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Location</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.location || "No location entered"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="font-semibold text-slate-900">Title</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.title || "No title entered"}
                    </p>
                  </div>

                  <div className="md:col-span-2">
                    <p className="font-semibold text-slate-900">Notes</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.notes || "No notes entered"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Returning to Time-Off Planner in{" "}
              <span className="font-bold text-slate-950">{redirectCountdown}</span>{" "}
              second{redirectCountdown === 1 ? "" : "s"}.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Stay on this page
              </button>

              <button
                type="button"
                onClick={() => router.push("/work/time-off")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Go to Time-Off Planner
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}