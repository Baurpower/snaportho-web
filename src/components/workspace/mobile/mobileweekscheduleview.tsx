"use client";

import React, { useState } from "react";
import {
  GraduationCap,
  MapPin,
  Phone,
  UserRound,
  CalendarDays,
} from "lucide-react";
import { MobileCardShell } from "@/components/workspace/mobile/mobilecardshell";
import { MobileSectionHeader } from "@/components/workspace/mobile/mobilesectionheader";
import { MobileBottomSheet } from "@/components/workspace/mobile/mobilebottomsheet";
import type { WeekDayCard, WeekAcademicEvent } from "@/components/workspace/weekscheduleview";

export interface MobileWeekScheduleViewProps {
  days: WeekDayCard[];
  loading?: boolean;
  /** Optional callback for when a day is tapped (for future full edit integration) */
  onDayClick?: (day: WeekDayCard) => void;
}

/**
 * Mobile-only vertical presentation of the weekly schedule.
 * - Full-width stacked cards using Phase 2 MobileCardShell.
 * - Emphasizes calls (rose) and rotations.
 * - Shows academics, location, attending.
 * - Tapping a card opens a MobileBottomSheet with day details (read-only summary).
 * - Reuses the exact same WeekDayCard data shape from the desktop view.
 * - No new data fetching or business logic.
 */
export function MobileWeekScheduleView({
  days,
  loading = false,
  onDayClick,
}: MobileWeekScheduleViewProps) {
  const [selectedDay, setSelectedDay] = useState<WeekDayCard | null>(null);

  if (loading) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Loading this week...
      </div>
    );
  }

  if (!days || days.length === 0) {
    return (
      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
        No schedule data for this week.
      </div>
    );
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <div className="mt-4 space-y-3">
      <MobileSectionHeader
        eyebrow="THIS WEEK"
        title="Current Week"
        description="Your schedule at a glance"
        icon={<CalendarDays className="h-5 w-5" />}
      />

      {days.map((day) => {
        const isToday = day.date === todayKey;
        const title = getDisplayTitle(day);
        const hasContent = day.hasCall || day.rotationPill || (day.academicEvents && day.academicEvents.length > 0) || day.location || day.attending;

        return (
          <MobileCardShell
            key={`${day.dayKey}-${day.date}`}
            accentClassName={day.hasCall ? "bg-rose-500" : day.rotationColor ? getRotationAccent(day.rotationColor) : undefined}
            onClick={() => {
              setSelectedDay(day);
              onDayClick?.(day);
            }}
            className={isToday ? "ring-2 ring-slate-900/10" : ""}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {day.dayKey}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-slate-950">
                    {formatShortDate(day.date)}
                  </span>
                  {isToday && (
                    <span className="ml-1 rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white">
                      TODAY
                    </span>
                  )}
                </div>

                <p className="mt-1 text-base font-bold tracking-tight text-slate-950 line-clamp-2">
                  {title}
                </p>

                <div className="mt-2 space-y-1.5 text-sm">
                  {day.hasCall && (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                      <Phone className="h-3.5 w-3.5 shrink-0" />
                      <span>{day.callLabel ?? "Call"}</span>
                    </div>
                  )}

                  {day.rotationPill && (
                    <div
                      className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-semibold ${getRotationPillClasses(day.rotationColor)}`}
                    >
                      <span className="truncate">{day.rotationPill}</span>
                    </div>
                  )}

                  {day.academicEvents && day.academicEvents.length > 0 && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-indigo-100 px-2.5 py-1 text-[11px] font-semibold text-indigo-700">
                      <GraduationCap className="h-3.5 w-3.5 shrink-0" />
                      <span>
                        {day.academicEvents[0].title}
                        {day.academicEvents.length > 1 && ` +${day.academicEvents.length - 1}`}
                      </span>
                    </div>
                  )}

                  {day.location && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate text-xs">{day.location}</span>
                    </div>
                  )}

                  {day.attending && (
                    <div className="flex items-center gap-1.5 text-slate-600">
                      <UserRound className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                      <span className="truncate text-xs">{day.attending}</span>
                    </div>
                  )}
                </div>

                {!hasContent && (
                  <div className="mt-3 text-xs text-slate-400">No assignments yet</div>
                )}
              </div>
            </div>
          </MobileCardShell>
        );
      })}

      <MobileBottomSheet
        open={!!selectedDay}
        onClose={() => setSelectedDay(null)}
        title={selectedDay ? `${selectedDay.dayKey} — ${formatLongDate(selectedDay.date)}` : ""}
        description={selectedDay ? getSecondaryLabel(selectedDay) : undefined}
      >
        {selectedDay && (
          <div className="space-y-4 text-sm">
            {selectedDay.hasCall && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3">
                <div className="flex items-center gap-2 font-semibold text-rose-700">
                  <Phone className="h-4 w-4" /> Call
                </div>
                <div className="mt-1 text-rose-900">{selectedDay.callLabel ?? "On call"}</div>
              </div>
            )}

            {selectedDay.rotationPill && (
              <div className={`rounded-xl border p-3 ${getRotationBorderClass(selectedDay.rotationColor)}`}>
                <div className="font-semibold">Rotation</div>
                <div className="mt-1">{selectedDay.rotationPill}</div>
              </div>
            )}

            {selectedDay.academicEvents && selectedDay.academicEvents.length > 0 && (
              <div>
                <div className="mb-2 font-semibold flex items-center gap-2 text-indigo-700">
                  <GraduationCap className="h-4 w-4" /> Academic Events
                </div>
                {selectedDay.academicEvents.map((ev: WeekAcademicEvent) => (
                  <div key={ev.id} className="mb-2 rounded-xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-900">
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-xs text-indigo-600 mt-0.5">
                      {[ev.eventTypeName, ev.startTime, ev.location].filter(Boolean).join(" · ")}
                      {ev.isRequired && " · Required"}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {(selectedDay.location || selectedDay.attending) && (
              <div className="space-y-2 text-slate-600">
                {selectedDay.location && <div><MapPin className="inline h-4 w-4 mr-1" />{selectedDay.location}</div>}
                {selectedDay.attending && <div><UserRound className="inline h-4 w-4 mr-1" />{selectedDay.attending}</div>}
              </div>
            )}

            <div className="pt-2 text-xs text-slate-400">
              Tap Plan Week above for full editing on mobile.
            </div>
          </div>
        )}
      </MobileBottomSheet>
    </div>
  );
}

// Small helpers duplicated from desktop for independence (safe for additive mobile view)
function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

function getDisplayTitle(day: WeekDayCard) {
  if (day.dayCategory === "Custom") return day.customTitle ?? day.primaryLabel ?? "Custom";
  return day.primaryLabel ?? "Unplanned";
}

function getSecondaryLabel(day: WeekDayCard) {
  if (day.dayCategory === "Custom") return "Custom";
  return day.dayCategory ?? "Unplanned";
}

function getRotationPillClasses(color: string | null) {
  if (!color) return "bg-slate-100 text-slate-700";
  const n = color.toLowerCase();
  if (n.includes("sky") || n.includes("blue")) return "bg-sky-100 text-sky-900";
  if (n.includes("emerald") || n.includes("green")) return "bg-emerald-100 text-emerald-800";
  if (n.includes("violet") || n.includes("purple")) return "bg-violet-100 text-violet-800";
  if (n.includes("amber") || n.includes("yellow")) return "bg-amber-100 text-amber-800";
  if (n.includes("rose") || n.includes("red")) return "bg-rose-100 text-rose-800";
  return "bg-slate-100 text-slate-700";
}

function getRotationAccent(color: string | null) {
  if (!color) return "bg-slate-400";
  const n = color.toLowerCase();
  if (n.includes("sky") || n.includes("blue")) return "bg-sky-500";
  if (n.includes("emerald") || n.includes("green")) return "bg-emerald-500";
  if (n.includes("violet") || n.includes("purple")) return "bg-violet-500";
  if (n.includes("amber") || n.includes("yellow")) return "bg-amber-500";
  if (n.includes("rose") || n.includes("red")) return "bg-rose-500";
  return "bg-slate-400";
}

function getRotationBorderClass(color: string | null) {
  const base = "bg-white";
  if (!color) return `border-slate-200 ${base}`;
  const n = color.toLowerCase();
  if (n.includes("sky")) return `border-sky-200 ${base}`;
  if (n.includes("emerald")) return `border-emerald-200 ${base}`;
  if (n.includes("violet")) return `border-violet-200 ${base}`;
  if (n.includes("amber")) return `border-amber-200 ${base}`;
  if (n.includes("rose")) return `border-rose-200 ${base}`;
  return `border-slate-200 ${base}`;
}
