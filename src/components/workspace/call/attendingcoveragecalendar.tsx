"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  ProgramAttending,
  ProgramAttendingCoverageSlot,
} from "@/lib/workspace/call/types";
import {
  getAttendingDisplayName,
  getAttendingShortName,
} from "@/lib/workspace/call/attendings-shared";

type AssignmentMap = Record<string, Record<string, string>>;

type AttendingCoverageCalendarProps = {
  year: number;
  monthIndex: number;
  attendings: ProgramAttending[];
  slots: ProgramAttendingCoverageSlot[];
  assignments: AssignmentMap;
  selectedDateKey: string | null;
  editMode: boolean;
  showMissingOnly: boolean;
  selectedSlotId: string;
  onSelectDate: (dateKey: string) => void;
  onPaintDate: (
    dateKey: string,
    options: { shiftKey: boolean; forceAssign: boolean }
  ) => void;
};

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildCalendarDays(year: number, monthIndex: number) {
  const first = new Date(year, monthIndex, 1);
  const last = new Date(year, monthIndex + 1, 0);
  const start = addDays(first, -first.getDay());
  const end = addDays(last, 6 - last.getDay());
  const days: Date[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    days.push(new Date(cursor));
  }

  return days;
}

function attendingLabel(attending: ProgramAttending) {
  return getAttendingDisplayName(attending);
}

function attendingCalendarName(attending: ProgramAttending) {
  return getAttendingShortName(attending);
}

export default function AttendingCoverageCalendar({
  year,
  monthIndex,
  attendings,
  slots,
  assignments,
  selectedDateKey,
  editMode,
  showMissingOnly,
  selectedSlotId,
  onSelectDate,
  onPaintDate,
}: AttendingCoverageCalendarProps) {
  const [dragPainting, setDragPainting] = useState(false);
  const days = useMemo(
    () => buildCalendarDays(year, monthIndex),
    [monthIndex, year]
  );
  const attendingById = useMemo(
    () => new Map(attendings.map((attending) => [attending.id, attending])),
    [attendings]
  );
  const todayKey = toDateKey(new Date());

  useEffect(() => {
    function stopPainting() {
      setDragPainting(false);
    }
    window.addEventListener("pointerup", stopPainting);
    window.addEventListener("pointercancel", stopPainting);
    return () => {
      window.removeEventListener("pointerup", stopPainting);
      window.removeEventListener("pointercancel", stopPainting);
    };
  }, []);

  return (
    <div className="overflow-x-auto pb-1">
      <div className="min-w-[840px]">
        <div className="mb-2 grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map((date) => {
            const dateKey = toDateKey(date);
            const inMonth =
              date.getFullYear() === year && date.getMonth() === monthIndex;
            const selected = selectedDateKey === dateKey;
            const today = todayKey === dateKey;
            const filled = slots.filter(
              (slot) => assignments[dateKey]?.[slot.id]
            ).length;
            const complete = slots.length > 0 && filled === slots.length;
            const partial = filled > 0 && !complete;

            return (
              <button
                key={dateKey}
                type="button"
                disabled={!inMonth}
                onClick={(event) => {
                  if (editMode) return;
                  onSelectDate(dateKey);
                  event.currentTarget.blur();
                }}
                onPointerDown={(event) => {
                  if (!editMode || !inMonth || event.button !== 0) return;
                  event.preventDefault();
                  setDragPainting(true);
                  onPaintDate(dateKey, {
                    shiftKey: event.shiftKey,
                    forceAssign: false,
                  });
                }}
                onPointerEnter={() => {
                  if (!editMode || !dragPainting || !inMonth) return;
                  onPaintDate(dateKey, {
                    shiftKey: false,
                    forceAssign: true,
                  });
                }}
                className={[
                  "group min-h-[132px] rounded-xl border p-2.5 text-left shadow-sm transition xl:min-h-[142px]",
                  inMonth
                    ? "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40"
                    : "cursor-default border-transparent bg-slate-100/60 opacity-55 shadow-none",
                  selected
                    ? "border-teal-500 bg-teal-50 ring-2 ring-teal-500/25"
                    : "",
                  today && !selected ? "ring-2 ring-sky-400/35" : "",
                  editMode && selectedSlotId
                    ? "cursor-crosshair active:scale-[0.99]"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`text-xs font-bold ${
                      inMonth ? "text-slate-900" : "text-slate-400"
                    }`}
                  >
                    {date.getDate()}
                  </span>
                  {inMonth && slots.length > 0 ? (
                    <span
                      className={`h-2 w-2 rounded-full ${
                        complete
                          ? "bg-emerald-400"
                          : partial
                          ? "bg-amber-400"
                          : "bg-slate-300"
                      }`}
                      title={
                        complete
                          ? "Fully assigned"
                          : partial
                          ? "Partially assigned"
                          : "Unassigned"
                      }
                    />
                  ) : null}
                </div>

                {inMonth ? (
                  <div className="mt-2.5 space-y-1.5">
                    {slots.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-2 py-3 text-center text-[10px] text-slate-400">
                        No coverage slots
                      </div>
                    ) : (
                      slots
                        .filter(
                          (slot) =>
                            !showMissingOnly ||
                            !assignments[dateKey]?.[slot.id]
                        )
                        .map((slot) => {
                        const attendingId = assignments[dateKey]?.[slot.id];
                        const attending = attendingId
                          ? attendingById.get(attendingId)
                          : null;

                        return (
                          <div
                            key={slot.id}
                            className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-1.5 rounded-md border px-2 py-1.5 ${
                              attending
                                ? "border-slate-200 bg-slate-50"
                                : "border-dashed border-slate-200 bg-slate-50/70"
                            }`}
                            title={
                              attending
                                ? `${slot.name}: ${attendingLabel(attending)}`
                                : `${slot.name}: Unassigned`
                            }
                          >
                            <span
                              className="flex min-w-0 items-center gap-1 text-[8px] font-black uppercase tracking-tight"
                              style={{ color: slot.color || "#7dd3fc" }}
                            >
                              <span
                                className="h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{
                                  backgroundColor: slot.color || "#38bdf8",
                                }}
                              />
                              {slot.abbreviation}
                            </span>
                            <span
                              className={`min-w-0 truncate text-[10px] leading-4 ${
                                attending
                                  ? "font-semibold text-slate-700"
                                  : "italic text-slate-400"
                              }`}
                            >
                              {attending
                                ? attendingCalendarName(attending)
                                : "Unassigned"}
                            </span>
                          </div>
                        );
                        })
                    )}
                    {showMissingOnly &&
                    slots.length > 0 &&
                    slots.every(
                      (slot) => assignments[dateKey]?.[slot.id]
                    ) ? (
                      <div className="rounded-lg bg-emerald-50 px-2 py-2 text-center text-[10px] font-semibold text-emerald-700">
                        Complete
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
