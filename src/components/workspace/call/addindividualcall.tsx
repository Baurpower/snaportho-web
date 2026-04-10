"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  Loader2,
  MapPin,
  PhoneCall,
  StickyNote,
  X,
} from "lucide-react";

type CallTypeOption = "Primary" | "Backup";

type ExistingCall = {
  id: string;
  date: string;
  callType: CallTypeOption;
  site: string | null;
  isHomeCall: boolean;
  notes: string | null;
  membershipId: string | null;
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

function getMonthBoundsLocal(year: number, monthIndex: number) {
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);

  return {
    monthStart: toDateKey(start),
    monthEnd: toDateKey(end),
  };
}

function getCallTypeStyles(callType: CallTypeOption) {
  if (callType === "Primary") {
    return {
      chipActive: "bg-sky-600 text-white shadow-sm",
      chipInactive: "bg-sky-50 text-sky-900 hover:bg-sky-100",
      selectedDay: "border-sky-400 bg-sky-50 shadow-sm",
      selectedIcon: "bg-sky-600 text-white",
      selectedBadge: "bg-sky-600 text-white",
      focus: "focus:border-sky-300 focus:ring-sky-100",
      previewTone: "border-sky-200 bg-sky-50",
    };
  }

  return {
    chipActive: "bg-violet-600 text-white shadow-sm",
    chipInactive: "bg-violet-50 text-violet-900 hover:bg-violet-100",
    selectedDay: "border-violet-400 bg-violet-50 shadow-sm",
    selectedIcon: "bg-violet-600 text-white",
    selectedBadge: "bg-violet-600 text-white",
    focus: "focus:border-violet-300 focus:ring-violet-100",
    previewTone: "border-violet-200 bg-violet-50",
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

export default function AddIndividualCall() {
  const router = useRouter();
  const today = new Date();

  const [visibleMonth, setVisibleMonth] = useState({
    year: today.getFullYear(),
    monthIndex: today.getMonth(),
  });

  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [existingCalls, setExistingCalls] = useState<ExistingCall[]>([]);
  const [callType, setCallType] = useState<CallTypeOption>("Primary");
  const [site, setSite] = useState("");
  const [isHomeCall, setIsHomeCall] = useState(false);
  const [notes, setNotes] = useState("");

  const [saving, setSaving] = useState(false);
  const [loadingExistingCalls, setLoadingExistingCalls] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [redirectCountdown, setRedirectCountdown] = useState(3);
  const [lastSavedSummary, setLastSavedSummary] = useState<{
    dates: string[];
    callType: CallTypeOption;
    site: string | null;
    isHomeCall: boolean;
    notes: string | null;
  } | null>(null);

  const callTypeStyles = getCallTypeStyles(callType);

  const weeks = useMemo(
    () => buildCalendarWeeksSunday(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  const { monthStart, monthEnd } = useMemo(
    () => getMonthBoundsLocal(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  const todayKey = toDateKey(new Date());

  useEffect(() => {
    let cancelled = false;

    async function loadExistingCalls() {
      try {
        setLoadingExistingCalls(true);
        setLocalError(null);

        const response = await fetch(
          `/api/me/calls?monthStart=${encodeURIComponent(
            monthStart
          )}&monthEnd=${encodeURIComponent(monthEnd)}`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.error ?? "Failed to load personal call schedule"
          );
        }

        if (!cancelled) {
          setExistingCalls(Array.isArray(payload?.calls) ? payload.calls : []);
        }
      } catch (error) {
        if (!cancelled) {
          setExistingCalls([]);
          setLocalError(
            error instanceof Error
              ? error.message
              : "Failed to load personal call schedule"
          );
        }
      } finally {
        if (!cancelled) {
          setLoadingExistingCalls(false);
        }
      }
    }

    loadExistingCalls();

    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd]);

  useEffect(() => {
    if (!showSuccessModal) return;

    setRedirectCountdown(3);

    const interval = window.setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) {
          window.clearInterval(interval);
          router.push("/work/call");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [showSuccessModal, router]);

  function toggleDate(dateKey: string) {
    setLocalError(null);
    setSuccessMessage(null);

    setSelectedDates((prev) =>
      prev.includes(dateKey)
        ? prev.filter((item) => item !== dateKey)
        : [...prev, dateKey].sort()
    );
  }

  async function handleSave() {
    try {
      setLocalError(null);
      setSuccessMessage(null);

      if (selectedDates.length === 0) {
        setLocalError("Select at least one call day.");
        return;
      }

      setSaving(true);

      const datesToSave = [...selectedDates].sort();
      const siteValue = site.trim() || null;
      const notesValue = notes.trim() || null;

      const response = await fetch("/api/me/calls", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dates: datesToSave,
          callType,
          site: siteValue,
          isHomeCall,
          notes: notesValue,
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save call days");
      }

      setExistingCalls((prev) => {
        const withoutOverlaps = prev.filter(
          (call) => !datesToSave.includes(call.date)
        );

        const newCalls: ExistingCall[] = datesToSave.map((date, index) => ({
          id:
            payload?.calls?.[index]?.id ??
            `${date}-${callType}-${Math.random().toString(36).slice(2, 8)}`,
          date,
          callType,
          site: siteValue,
          isHomeCall,
          notes: notesValue,
          membershipId: payload?.calls?.[index]?.membershipId ?? null,
        }));

        return [...withoutOverlaps, ...newCalls].sort((a, b) =>
          a.date.localeCompare(b.date)
        );
      });

      setLastSavedSummary({
        dates: datesToSave,
        callType,
        site: siteValue,
        isHomeCall,
        notes: notesValue,
      });

      setSuccessMessage(
        `Saved ${datesToSave.length} ${callType.toLowerCase()} call day${
          datesToSave.length === 1 ? "" : "s"
        }.`
      );

      setSelectedDates([]);
      setSite("");
      setIsHomeCall(false);
      setNotes("");
      setShowSuccessModal(true);
    } catch (error) {
      setLocalError(
        error instanceof Error ? error.message : "Failed to save call days"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 px-5 py-5 md:px-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Individual Add
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  Tap your call days
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pick primary or backup, then quickly tap the days you cover.
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
                label="Primary"
                active={callType === "Primary"}
                activeClassName="bg-sky-600 text-white shadow-sm"
                inactiveClassName="bg-sky-50 text-sky-900 hover:bg-sky-100"
                onClick={() => setCallType("Primary")}
              />
              <ChipButton
                label="Backup"
                active={callType === "Backup"}
                activeClassName="bg-violet-600 text-white shadow-sm"
                inactiveClassName="bg-violet-50 text-violet-900 hover:bg-violet-100"
                onClick={() => setCallType("Backup")}
              />
            </div>
          </div>

          <div className="px-3 pb-4 pt-3 md:px-4">
            {loadingExistingCalls ? (
              <div className="mb-4 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                Loading your saved call schedule...
              </div>
            ) : null}

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
                    const isSelected = selectedDates.includes(key);

                    const existingCall = existingCalls.find(
                      (call) => call.date === key
                    );
                    const isPersisted = !!existingCall;
                    const persistedType = existingCall?.callType ?? null;
                    const persistedStyles = persistedType
                      ? getCallTypeStyles(persistedType)
                      : null;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => inMonth && toggleDate(key)}
                        className={[
                          "min-h-[88px] rounded-[1.35rem] border p-2.5 text-left transition",
                          inMonth
                            ? "border-slate-200 bg-white hover:border-slate-300"
                            : "border-transparent bg-slate-50/60",
                          isToday && inMonth ? "ring-2 ring-slate-900/10" : "",
                          isSelected
                            ? callTypeStyles.selectedDay
                            : isPersisted && persistedStyles
                            ? persistedStyles.selectedDay
                            : "",
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
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${callTypeStyles.selectedIcon}`}
                            >
                              <Check className="h-3.5 w-3.5" />
                            </span>
                          ) : isPersisted && persistedStyles ? (
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full shadow-sm ${persistedStyles.selectedIcon}`}
                            >
                              <PhoneCall className="h-3.5 w-3.5" />
                            </span>
                          ) : null}
                        </div>

                        {isSelected ? (
                          <div className="mt-5">
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${callTypeStyles.selectedBadge}`}
                            >
                              <PhoneCall className="h-3 w-3" />
                              {callType}
                            </div>
                          </div>
                        ) : isPersisted && persistedStyles && persistedType ? (
                          <div className="mt-5">
                            <div
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${persistedStyles.selectedBadge}`}
                            >
                              <PhoneCall className="h-3 w-3" />
                              {persistedType}
                            </div>
                          </div>
                        ) : null}
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
            Call Details
          </p>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
            Apply to selected days
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Keep this quick: choose primary or backup, then save the dates.
          </p>

          <div className="mt-5 rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-sm font-semibold text-slate-900">
              {selectedDates.length} selected day
              {selectedDates.length === 1 ? "" : "s"}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {selectedDates.length === 0 ? (
                <span className="text-sm text-slate-500">
                  Tap calendar days to begin.
                </span>
              ) : (
                selectedDates.map((date) => (
                  <span
                    key={date}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                  >
                    {formatShortDate(date)}
                    <button
                      type="button"
                      onClick={() => toggleDate(date)}
                      className="text-slate-400 transition hover:text-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          <div className="mt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">Call type</p>
            <div className="flex flex-wrap gap-2">
              <ChipButton
                label="Primary"
                active={callType === "Primary"}
                activeClassName="bg-sky-600 text-white shadow-sm"
                inactiveClassName="bg-sky-50 text-sky-900 hover:bg-sky-100"
                onClick={() => setCallType("Primary")}
              />
              <ChipButton
                label="Backup"
                active={callType === "Backup"}
                activeClassName="bg-violet-600 text-white shadow-sm"
                inactiveClassName="bg-violet-50 text-violet-900 hover:bg-violet-100"
                onClick={() => setCallType("Backup")}
              />
            </div>
          </div>

          <div className="mt-5 grid gap-4">
            <label className="block">
              <span className="mb-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <MapPin className="h-4 w-4" />
                Site
              </span>
              <input
                value={site}
                onChange={(e) => setSite(e.target.value)}
                placeholder="Main hospital, trauma center, etc."
                className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${callTypeStyles.focus}`}
              />
            </label>

            <div className="rounded-[1rem] border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-slate-700" />
                  <div>
                    <p className="text-sm font-semibold text-slate-700">
                      Home call
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Toggle for at-home call coverage
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsHomeCall((prev) => !prev)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full transition ${
                    isHomeCall
                      ? callType === "Primary"
                        ? "bg-sky-600"
                        : "bg-violet-600"
                      : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                      isHomeCall ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
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
                placeholder="Optional notes for these call days"
                className={`w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition ${callTypeStyles.focus}`}
              />
            </label>
          </div>

          <div
            className={`mt-6 rounded-[1rem] border border-dashed px-4 py-4 ${callTypeStyles.previewTone}`}
          >
            <p className="text-sm font-semibold text-slate-900">Preview</p>
            <p className="mt-2 text-sm text-slate-600">
              {selectedDates.length === 0
                ? "No dates selected yet."
                : `${selectedDates.length} day${
                    selectedDates.length === 1 ? "" : "s"
                  } • ${callType} • ${site.trim() || "No site"} • ${
                    isHomeCall ? "Home call" : "In-house call"
                  }`}
            </p>
          </div>

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
              disabled={saving || selectedDates.length === 0}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Save Call Days"}
            </button>

            <span className="text-xs text-slate-500">
              {selectedDates.length === 0
                ? "Select at least one date to save."
                : "Ready to save your call days."}
            </span>
          </div>
        </div>
      </div>

      {showSuccessModal && lastSavedSummary ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl md:p-7">
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                  lastSavedSummary.callType === "Primary"
                    ? "bg-sky-100 text-sky-700"
                    : "bg-violet-100 text-violet-700"
                }`}
              >
                <Check className="h-6 w-6" />
              </div>

              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Call Saved
                </p>
                <h3 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
                  {lastSavedSummary.callType} call added
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  Your call entry was saved successfully.
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
              <div className="grid gap-3 text-sm">
                <div>
                  <p className="font-semibold text-slate-900">Dates</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {lastSavedSummary.dates.map((date) => (
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
                    <p className="font-semibold text-slate-900">Call type</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.callType}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Coverage</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.isHomeCall ? "Home call" : "In-house call"}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Site</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.site || "No site entered"}
                    </p>
                  </div>

                  <div>
                    <p className="font-semibold text-slate-900">Notes</p>
                    <p className="mt-1 text-slate-600">
                      {lastSavedSummary.notes || "No notes entered"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              Returning to Call Hub in{" "}
              <span className="font-bold text-slate-950">
                {redirectCountdown}
              </span>{" "}
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
                onClick={() => router.push("/work/call")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800"
              >
                Go to Call Hub
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}