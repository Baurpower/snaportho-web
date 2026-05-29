"use client";

import React, { useMemo } from "react";
import { PhoneCall, MapPin, Home, UserRound } from "lucide-react";
import { MobileCardShell } from "@/components/workspace/mobile/mobilecardshell";
import { MobileSectionHeader } from "@/components/workspace/mobile/mobilesectionheader";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";

export interface MobileProgramCallAgendaProps {
  calls: ProgramCallItem[];
  /** Human label for the current month, e.g. "March 2025" */
  monthLabel: string;
  /** Current mobile view filter */
  viewMode: "mine" | "program";
  /** Callback when user taps a day to see details */
  onDayClick?: (dateKey: string) => void;
  /** Optional loading state */
  loading?: boolean;
}

/**
 * Mobile-only vertical agenda for the Program Call Calendar.
 * - Groups calls by date (using callDate).
 * - Within each day, sorts so the current user's call (isMine) appears first.
 * - "My Calls" view filters to only isMine === true.
 * - Uses Phase 2 MobileCardShell + MobileSectionHeader.
 * - Full-width, no horizontal scroll, 44px+ touch targets.
 * - Purely presentational. Parent (callhubclient) owns all data and navigation.
 */
export function MobileProgramCallAgenda({
  calls,
  monthLabel,
  viewMode,
  onDayClick,
  loading = false,
}: MobileProgramCallAgendaProps) {
  // Group + sort per day (defensive copy + sort so isMine is always first)
  const days = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();

    const sourceCalls =
      viewMode === "mine" ? calls.filter((c) => c.isMine) : calls;

    for (const call of sourceCalls) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }

    // Sort each day's calls: isMine first, then by name
    for (const [key, list] of map.entries()) {
      list.sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return a.residentName.localeCompare(b.residentName);
      });
      map.set(key, list);
    }

    // Return sorted day entries (newest to oldest within the month is usually preferred for agenda)
    return Array.from(map.entries())
      .sort(([a], [b]) => b.localeCompare(a)) // descending date order (most recent first)
      .map(([date, dayCalls]) => ({ date, calls: dayCalls }));
  }, [calls, viewMode]);

  const hasAnyMyCalls = calls.some((c) => c.isMine);

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading calls...
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100">
          <PhoneCall className="h-6 w-6 text-slate-400" />
        </div>
        <p className="text-base font-semibold text-slate-950">
          {viewMode === "mine" ? "No personal calls" : "No calls"} this month
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {viewMode === "mine" && !hasAnyMyCalls
            ? "You have no call assignments in the current view."
            : "Switch to the other view or change months to see more assignments."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <MobileSectionHeader
        eyebrow="CALL SCHEDULE"
        title={monthLabel}
        description={
          viewMode === "mine"
            ? "Your call assignments this month (highlighted first)"
            : "All program call assignments this month"
        }
        icon={<PhoneCall className="h-5 w-5" />}
      />

      {days.map(({ date, calls: dayCalls }) => {
        const dateObj = new Date(`${date}T00:00:00`);
        const dayLabel = dateObj.toLocaleDateString("en-US", {
          weekday: "long",
          month: "short",
          day: "numeric",
        });

        const myCallInDay = dayCalls.find((c) => c.isMine);

        return (
          <div key={date} className="space-y-2">
            {/* Date header */}
            <div className="flex items-baseline justify-between px-1">
              <div>
                <span className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {dayLabel}
                </span>
                {myCallInDay && viewMode === "program" && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                    You have a call
                  </span>
                )}
              </div>
              <span className="text-xs text-slate-400">
                {dayCalls.length} assignment{dayCalls.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Calls for this day - stacked cards */}
            <div className="space-y-2">
              {dayCalls.map((call) => {
                const tone = getCallTone(call);
                const isPersonal = call.isMine;

                return (
                  <MobileCardShell
                    key={call.id}
                    accentClassName={isPersonal ? "bg-sky-500" : tone.accent}
                    onClick={() => onDayClick?.(date)}
                    className="active:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.5px] ${tone.chip}`}
                          >
                            {call.callType ?? (isPersonal ? "Call" : "Assignment")}
                          </span>
                          {isPersonal && (
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-700">
                              MY CALL
                            </span>
                          )}
                          {call.isHomeCall && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                              <Home className="h-3 w-3" /> Home
                            </span>
                          )}
                        </div>

                        <p className="mt-2 text-base font-bold leading-tight tracking-tight text-slate-950">
                          {call.residentName}
                        </p>

                        {(call.site || call.startDatetime) && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-slate-600">
                            {call.site && (
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                                {call.site}
                              </span>
                            )}
                            {call.startDatetime && call.endDatetime && (
                              <span className="text-xs text-slate-500">
                                {formatTimeRange(call.startDatetime, call.endDatetime)}
                              </span>
                            )}
                          </div>
                        )}

                        {call.notes && (
                          <p className="mt-2 line-clamp-2 text-sm text-slate-500">
                            {call.notes}
                          </p>
                        )}
                      </div>

                      <div className="shrink-0 text-right">
                        <UserRound className="h-5 w-5 text-slate-300" />
                      </div>
                    </div>
                  </MobileCardShell>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Local tone helper (mirrors the one in CallDayDetailsContent for visual consistency)
function getCallTone(call: ProgramCallItem) {
  if (call.isMine) {
    return {
      card: "border-sky-300 bg-sky-50",
      chip: "bg-sky-600 text-white",
      accent: "bg-sky-500",
      text: "text-sky-950",
    };
  }
  if (call.isHomeCall) {
    return {
      card: "border-violet-200 bg-violet-50",
      chip: "bg-violet-600 text-white",
      accent: "bg-violet-500",
      text: "text-violet-950",
    };
  }
  return {
    card: "border-slate-200 bg-slate-50",
    chip: "bg-slate-900 text-white",
    accent: "bg-slate-400",
    text: "text-slate-900",
  };
}

function formatTimeRange(start: string, end: string): string {
  try {
    const s = new Date(start).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const e = new Date(end).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    return `${s} – ${e}`;
  } catch {
    return "";
  }
}
