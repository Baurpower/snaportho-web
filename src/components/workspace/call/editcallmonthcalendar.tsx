"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowRightLeft,
  CalendarDays,
  Check,
  Clock3,
  PhoneCall,
  Repeat,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import type { ProgramCallItem } from "./callmonthcalendar";

type EditMode = "switch" | "swap" | "delete";

type ResidentOption = {
  membershipId: string;
  residentName: string;
  trainingLevel: string | null;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfWeekSunday(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
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

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function isEditableQuickCall(call: ProgramCallItem) {
  return !call.startDatetime && !call.endDatetime && !!call.callDate;
}

function getCallTone(call: ProgramCallItem) {
  if (call.isMine) {
    return {
      card: "border-sky-300 bg-sky-50",
      chip: "bg-sky-600 text-white",
      text: "text-sky-950",
    };
  }

  if (call.isHomeCall) {
    return {
      card: "border-violet-200 bg-violet-50",
      chip: "bg-violet-600 text-white",
      text: "text-violet-950",
    };
  }

  return {
    card: "border-slate-200 bg-slate-50",
    chip: "bg-slate-900 text-white",
    text: "text-slate-900",
  };
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export default function EditCallMonthCalendar({
  year,
  monthIndex,
  calls,
  loading,
  residents,
  onCancel,
  onSwitch,
  onSwap,
  onDelete,
}: {
  year: number;
  monthIndex: number;
  calls: ProgramCallItem[];
  loading?: boolean;
  residents: ResidentOption[];
  onCancel: () => void;
  onSwitch?: (payload: {
    callId: string;
    fromMembershipId: string | null;
    toMembershipId: string;
  }) => Promise<void> | void;
  onSwap?: (payload: {
    firstCallId: string;
    secondCallId: string;
  }) => Promise<void> | void;
  onDelete?: (payload: { callId: string }) => Promise<void> | void;
}) {
  const [mode, setMode] = useState<EditMode>("switch");
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [secondSelectedCallId, setSecondSelectedCallId] = useState<string | null>(null);
  const [deleteSelectedCallIds, setDeleteSelectedCallIds] = useState<string[]>([]);
  const [switchTargetMembershipId, setSwitchTargetMembershipId] = useState<string>("");
  const [working, setWorking] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [showSwitchModal, setShowSwitchModal] = useState(false);

  const weeks = useMemo(
    () => buildCalendarWeeksSunday(year, monthIndex),
    [year, monthIndex]
  );

  const todayKey = toDateKey(new Date());

  const callsByDate = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();

    for (const call of calls) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => a.residentName.localeCompare(b.residentName));
      map.set(key, value);
    }

    return map;
  }, [calls]);

  const selectedCall =
    selectedCallId ? calls.find((call) => call.id === selectedCallId) ?? null : null;

  const secondSelectedCall =
    secondSelectedCallId
      ? calls.find((call) => call.id === secondSelectedCallId) ?? null
      : null;

  const deleteSelectedCalls = useMemo(
    () =>
      deleteSelectedCallIds
        .map((id) => calls.find((call) => call.id === id) ?? null)
        .filter((call): call is ProgramCallItem => !!call),
    [deleteSelectedCallIds, calls]
  );

  const switchTargetResident = useMemo(
    () =>
      residents.find((resident) => resident.membershipId === switchTargetMembershipId) ?? null,
    [residents, switchTargetMembershipId]
  );

  useEffect(() => {
    setLocalError(null);
  }, [mode, selectedDateKey, selectedCallId, secondSelectedCallId, deleteSelectedCallIds]);

  function resetSelection(nextMode?: EditMode) {
    setSelectedCallId(null);
    setSecondSelectedCallId(null);
    setDeleteSelectedCallIds([]);
    setSwitchTargetMembershipId("");
    setShowSwitchModal(false);
    if (nextMode) setMode(nextMode);
  }

  async function confirmSingleDelete(callId: string) {
    if (!onDelete) return;
    await onDelete({ callId });
  }

  async function handleDeleteConfirm() {
    if (!onDelete || deleteSelectedCallIds.length === 0) return;

    try {
      setLocalError(null);
      setWorking(true);

      for (const callId of deleteSelectedCallIds) {
        const call = calls.find((item) => item.id === callId);
        if (!call) continue;

        if (!isEditableQuickCall(call)) {
          throw new Error("One or more timed calls should be edited from the full call editor.");
        }
      }

      for (const callId of deleteSelectedCallIds) {
        await confirmSingleDelete(callId);
      }

      setDeleteSelectedCallIds([]);
      setSelectedDateKey(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to delete selected calls.");
      throw err;
    } finally {
      setWorking(false);
    }
  }

  async function handleSwitchConfirm() {
    if (!selectedCall || !switchTargetMembershipId || !onSwitch) return;

    try {
      setLocalError(null);
      setWorking(true);

      if (!isEditableQuickCall(selectedCall)) {
        throw new Error("This timed call should be edited from the full call editor.");
      }

      if (selectedCall.membershipId === switchTargetMembershipId) {
        throw new Error("That resident already owns this call.");
      }

      await onSwitch({
        callId: selectedCall.id,
        fromMembershipId: selectedCall.membershipId,
        toMembershipId: switchTargetMembershipId,
      });

      setSelectedCallId(null);
      setSwitchTargetMembershipId("");
      setShowSwitchModal(false);
      setSelectedDateKey(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to switch call.");
      throw err;
    } finally {
      setWorking(false);
    }
  }

  async function handleSwapConfirm() {
    if (!selectedCall || !secondSelectedCall || !onSwap) return;

    try {
      setLocalError(null);
      setWorking(true);

      if (!isEditableQuickCall(selectedCall) || !isEditableQuickCall(secondSelectedCall)) {
        throw new Error("Timed calls cannot be swapped in quick edit mode.");
      }

      if (selectedCall.id === secondSelectedCall.id) {
        throw new Error("Pick two different calls to swap.");
      }

      await onSwap({
        firstCallId: selectedCall.id,
        secondCallId: secondSelectedCall.id,
      });

      setSelectedCallId(null);
      setSecondSelectedCallId(null);
      setSelectedDateKey(null);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Failed to swap calls.");
      throw err;
    } finally {
      setWorking(false);
    }
  }

  function toggleDeleteSelection(call: ProgramCallItem) {
    setDeleteSelectedCallIds((prev) =>
      prev.includes(call.id) ? prev.filter((id) => id !== call.id) : [...prev, call.id]
    );
  }

  function handleCallClick(call: ProgramCallItem) {
    if (!isEditableQuickCall(call)) {
      setLocalError("Timed calls should be edited in the full workflow.");
      return;
    }

    if (mode === "delete") {
      toggleDeleteSelection(call);
      return;
    }

    if (mode === "switch") {
      setSelectedCallId(call.id);
      return;
    }

    if (mode === "swap") {
      if (!selectedCallId) {
        setSelectedCallId(call.id);
        return;
      }

      if (selectedCallId === call.id) {
        setSelectedCallId(null);
        return;
      }

      if (!secondSelectedCallId) {
        setSecondSelectedCallId(call.id);
        return;
      }

      if (secondSelectedCallId === call.id) {
        setSecondSelectedCallId(null);
        return;
      }

      setSelectedCallId(call.id);
      setSecondSelectedCallId(null);
    }
  }

  function handleTopConfirm() {
    setLocalError(null);

    if (mode === "switch") {
      if (!selectedCall) {
        setLocalError("Pick a call to switch.");
        return;
      }
      setShowSwitchModal(true);
      return;
    }

    if (mode === "swap") {
      void handleSwapConfirm();
      return;
    }

    if (mode === "delete") {
      void handleDeleteConfirm();
    }
  }

  const topConfirmDisabled =
    working ||
    (mode === "switch" && !selectedCall) ||
    (mode === "swap" && (!selectedCall || !secondSelectedCall)) ||
    (mode === "delete" && deleteSelectedCallIds.length === 0);

  if (loading) {
    return (
      <div className="overflow-hidden rounded-[1.5rem] border border-amber-200 bg-white shadow-xl">
        <div className="border-b border-amber-200 px-4 py-4 md:px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-950">
                Edit Program Call Calendar
              </h2>
              <p className="mt-1 text-xs text-slate-500 md:text-sm">
                Loading editable calendar...
              </p>
            </div>
          </div>
        </div>

        <div className="p-5 text-sm text-slate-500">Loading edit mode...</div>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-hidden rounded-[1.5rem] border border-amber-200 bg-white shadow-xl">
        <div className="border-b border-amber-200 px-4 py-4 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <CalendarDays className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-slate-950">
                  Edit Program Call Calendar
                </h2>
                <p className="mt-1 text-xs text-slate-500 md:text-sm">
                  Pick a mode, then click calls directly on the calendar.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 self-start rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <X className="h-4 w-4" />
              Exit Edit
            </button>
          </div>
        </div>

        <div className="border-b border-slate-200 bg-amber-50/40 px-4 py-3 md:px-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => resetSelection("switch")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "switch"
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <Repeat className="h-4 w-4" />
                Switch
              </button>

              <button
                type="button"
                onClick={() => resetSelection("swap")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "swap"
                    ? "bg-amber-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <ArrowRightLeft className="h-4 w-4" />
                Swap
              </button>

              <button
                type="button"
                onClick={() => resetSelection("delete")}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                  mode === "delete"
                    ? "bg-rose-600 text-white"
                    : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>

            <button
              type="button"
              onClick={handleTopConfirm}
              disabled={topConfirmDisabled}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                mode === "delete"
                  ? "bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
                  : "bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50"
              } disabled:cursor-not-allowed`}
            >
              <Check className="h-4 w-4" />
              {working
                ? "Saving..."
                : mode === "switch"
                ? "Confirm Switch"
                : mode === "swap"
                ? "Confirm Swap"
                : `Delete ${deleteSelectedCallIds.length > 0 ? `(${deleteSelectedCallIds.length})` : ""}`}
            </button>
          </div>

          <p className="mt-2 text-xs text-slate-600 md:text-sm">
            {mode === "switch" &&
              "Click one call, then confirm. You will choose the new resident in a popup."}
            {mode === "swap" &&
              "Click two calls to mark A and B, then confirm the swap from here."}
            {mode === "delete" &&
              "Click as many calls as you want to remove, then confirm delete from here."}
          </p>
        </div>

        {localError ? (
          <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 md:px-5">
            {localError}
          </div>
        ) : null}

        <div className="px-2 pb-2 pt-2 md:px-3">
          <div className="mb-1.5 grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="py-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1">
                {week.map((date) => {
                  const key = toDateKey(date);
                  const inMonth = isSameMonth(date, year, monthIndex);
                  const isToday = key === todayKey;
                  const dayCalls = callsByDate.get(key) ?? [];

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => inMonth && setSelectedDateKey(key)}
                      className={[
                        "h-[138px] rounded-[1rem] border px-2 py-1.5 text-left transition md:h-[144px] xl:h-[148px]",
                        inMonth
                          ? "border-slate-200 bg-white hover:border-amber-300"
                          : "border-transparent bg-slate-50/60",
                        isToday && inMonth ? "ring-2 ring-amber-300" : "",
                        selectedDateKey === key ? "ring-2 ring-amber-400" : "",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-1.5">
                        <span
                          className={[
                            "text-[11px] font-semibold",
                            inMonth ? "text-slate-700" : "text-slate-300",
                          ].join(" ")}
                        >
                          {date.getDate()}
                        </span>

                        {dayCalls.length > 0 && inMonth ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                            <PhoneCall className="h-2.5 w-2.5" />
                            {dayCalls.length}
                          </div>
                        ) : null}
                      </div>

                      <div className="mt-1.5 h-[102px] space-y-1 overflow-y-auto pr-0.5 md:h-[108px] xl:h-[112px]">
                        {dayCalls.map((call) => {
                          const tone = getCallTone(call);
                          const editable = isEditableQuickCall(call);
                          const isSelected = selectedCallId === call.id;
                          const isSecondSelected = secondSelectedCallId === call.id;
                          const isDeleteSelected = deleteSelectedCallIds.includes(call.id);

                          return (
                            <div
                              key={call.id}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCallClick(call);
                              }}
                              className={[
                                `rounded-lg border px-2 py-1.5 transition ${tone.card}`,
                                editable
                                  ? "cursor-pointer hover:border-amber-300"
                                  : "cursor-not-allowed opacity-70",
                                mode === "switch" && isSelected ? "ring-2 ring-amber-500" : "",
                                mode === "swap" && isSelected ? "ring-2 ring-amber-500" : "",
                                mode === "swap" && isSecondSelected ? "ring-2 ring-sky-500" : "",
                                mode === "delete" && isDeleteSelected ? "ring-2 ring-rose-500" : "",
                              ].join(" ")}
                              title={
                                editable
                                  ? `${call.residentName} • ${call.callType ?? "Call"} • ${call.site ?? "No site"}`
                                  : "Timed call: edit in full workflow"
                              }
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <div className="min-w-0">
                                  <p className={`truncate text-[10px] font-semibold ${tone.text}`}>
                                    {call.residentName}
                                  </p>
                                  <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                    <span className="truncate">{call.callType ?? "Call"}</span>
                                    {!editable ? (
                                      <>
                                        <span>•</span>
                                        <Clock3 className="h-2.5 w-2.5" />
                                      </>
                                    ) : null}
                                  </div>
                                </div>

                                {mode === "switch" && isSelected ? (
                                  <span className="shrink-0 rounded-full bg-amber-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                                    Picked
                                  </span>
                                ) : mode === "swap" && isSelected ? (
                                  <span className="shrink-0 rounded-full bg-amber-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                                    A
                                  </span>
                                ) : mode === "swap" && isSecondSelected ? (
                                  <span className="shrink-0 rounded-full bg-sky-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                                    B
                                  </span>
                                ) : mode === "delete" && isDeleteSelected ? (
                                  <span className="shrink-0 rounded-full bg-rose-600 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-[0.12em] text-white">
                                    Delete
                                  </span>
                                ) : !editable ? (
                                  <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                                    Timed
                                  </span>
                                ) : call.trainingLevel ? (
                                  <span className="shrink-0 rounded-full bg-white px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                                    {call.trainingLevel}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 md:px-5">
          <div className="flex items-start gap-2 text-xs text-slate-600 md:text-sm">
            <UserRound className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              {mode === "switch" && (
                <span>
                  Selected:{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedCall
                      ? `${selectedCall.residentName} • ${selectedCall.callType ?? "Call"} • ${formatShortDate(selectedCall.callDate)}`
                      : "No call selected"}
                  </span>
                </span>
              )}
              {mode === "swap" && (
                <span>
                  A:{" "}
                  <span className="font-semibold text-slate-900">
                    {selectedCall
                      ? `${selectedCall.residentName} • ${selectedCall.callType ?? "Call"}`
                      : "None"}
                  </span>
                  {" • "}B:{" "}
                  <span className="font-semibold text-slate-900">
                    {secondSelectedCall
                      ? `${secondSelectedCall.residentName} • ${secondSelectedCall.callType ?? "Call"}`
                      : "None"}
                  </span>
                </span>
              )}
              {mode === "delete" && (
                <span>
                  Marked for delete:{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteSelectedCalls.length}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {showSwitchModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Switch Call
                </p>
                <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                  Choose replacement resident
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  {selectedCall
                    ? `${selectedCall.residentName} • ${selectedCall.callType ?? "Call"} • ${formatShortDate(selectedCall.callDate)}`
                    : "No call selected"}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(false);
                  setSwitchTargetMembershipId("");
                }}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Switch to resident
              </label>
              <select
                value={switchTargetMembershipId}
                onChange={(e) => setSwitchTargetMembershipId(e.target.value)}
                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-300"
              >
                <option value="">Select resident</option>
                {residents.map((resident) => (
                  <option key={resident.membershipId} value={resident.membershipId}>
                    {resident.residentName}
                    {resident.trainingLevel ? ` • ${resident.trainingLevel}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowSwitchModal(false);
                  setSwitchTargetMembershipId("");
                }}
                className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => void handleSwitchConfirm()}
                disabled={!switchTargetMembershipId || working}
                className="inline-flex items-center gap-2 rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Repeat className="h-4 w-4" />
                {working
                  ? "Saving..."
                  : `Confirm${switchTargetResident ? ` → ${switchTargetResident.residentName}` : ""}`}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}