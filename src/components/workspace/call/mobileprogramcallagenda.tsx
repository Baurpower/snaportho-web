"use client";

import React, { useMemo } from "react";
import { PhoneCall, Home } from "lucide-react";
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

    // Return sorted day entries — chronological ascending (start of month → end of month)
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
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
          weekday: "short",
          month: "short",
          day: "numeric",
        });

        return (
          <div key={date} className="space-y-1.5">
            {/* Date header - compact */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-600">
                {dayLabel}
              </span>
              <span className="text-[10px] text-slate-400">
                {dayCalls.length} assignment{dayCalls.length === 1 ? "" : "s"}
              </span>
            </div>

            {/* Calls for this day - stacked compact cards */}
            <div className="space-y-1.5">
              {dayCalls.map((call) => {
                const tone = getCallTone(call);
                const isPersonal = call.isMine;

                return (
                  <MobileCardShell
                    key={call.id}
                    accentClassName={isPersonal ? "bg-sky-500" : tone.accent}
                    onClick={() => onDayClick?.(date)}
                    className="active:bg-slate-50"
                    contentClassName="p-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.5px] ${tone.chip}`}
                          >
                            {call.callType ?? (isPersonal ? "Call" : "Assignment")}
                          </span>
                          {isPersonal && (
                            <span className="inline-flex items-center rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-700">
                              MY CALL
                            </span>
                          )}
                          {call.isHomeCall && (
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold text-violet-700">
                              <Home className="h-2.5 w-2.5" /> Home
                            </span>
                          )}
                          {call.site && (
                            <span className="text-[9px] text-slate-500 truncate">
                              {call.site}
                            </span>
                          )}
                          {call.startDatetime && call.endDatetime && (
                            <span className="text-[9px] text-slate-400">
                              {formatTimeRange(call.startDatetime, call.endDatetime)}
                            </span>
                          )}
                        </div>

                        <p className="mt-1 text-sm font-semibold leading-tight tracking-tight text-slate-950 truncate">
                          {call.residentName}
                        </p>
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
  if (call.callType?.toLowerCase() === "buddy") {
    return {
      card: call.isMine ? "border-violet-300 bg-violet-50" : "border-violet-200 bg-violet-50/60",
      chip: "bg-violet-600 text-white",
      accent: "bg-violet-500",
      text: "text-violet-950",
    };
  }
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
