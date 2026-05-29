"use client";

import React from "react";
import { Calendar, PhoneCall, Users, PlaneTakeoff } from "lucide-react";
import { MobileCardShell } from "@/components/workspace/mobile/mobilecardshell";
import { MobileSectionHeader } from "@/components/workspace/mobile/mobilesectionheader";

export type AheadMonth = {
  year: number;
  monthIndex: number;
  label: string;
};

type UserCalendarEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string | null;
  kind: "rotation" | "call" | "event";
};

type ProgramCallItem = {
  id: string;
  residentName: string;
  callType: string | null;
  callDate: string | null;
  isMine?: boolean;
};

type RotationTimelineEvent = {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  color?: string | null;
};

type TimeOffItem = {
  id: string;
  startDate: string | null;
  endDate: string | null;
  reason?: string | null;
};

export interface MobileMonthsAheadViewProps {
  months: AheadMonth[];
  monthDataByKey: Record<string, UserCalendarEvent[] | null>;
  rotationTimelineEvents: RotationTimelineEvent[];
  programCallsByMonthKey: Record<string, ProgramCallItem[]>;
  timeOffByMonthKey: Record<string, TimeOffItem[]>;
  loading?: boolean;
  rotationLoading?: boolean;
  onPrevious: () => void;
  onNext: () => void;
  currentMembershipId?: string | null;
  currentDisplayName?: string | null;
}

/**
 * Mobile-only Months Ahead view.
 * Reuses the exact same data already loaded and passed to MonthsScheduleView:
 * - aheadMonths
 * - monthDataByKey, programCallsByMonthKey, timeOffByMonthKey, rotationTimelineEvents
 *
 * Renders clean full-width summary cards per month (no 7-col mini calendars).
 * Shows call counts, rotation coverage hints, and personal highlights where available.
 * Uses Phase 2 primitives for consistency.
 * No new data fetching.
 */
export function MobileMonthsAheadView({
  months,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  monthDataByKey: _monthDataByKey, // passed for API compatibility + future richer summaries
  rotationTimelineEvents,
  programCallsByMonthKey,
  timeOffByMonthKey,
  loading = false,
  rotationLoading = false,
  onPrevious,
  onNext,
  // currentMembershipId available for future personal highlights if needed
}: MobileMonthsAheadViewProps) {
  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading months ahead...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <MobileSectionHeader
        eyebrow="SCHEDULE"
        title="Months Ahead"
        description="Upcoming rotations, calls & events"
        icon={<Calendar className="h-5 w-5" />}
        action={
          <div className="flex items-center gap-1">
            <button
              onClick={onPrevious}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Previous months"
            >
              ←
            </button>
            <button
              onClick={onNext}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              aria-label="Next months"
            >
              →
            </button>
          </div>
        }
      />

      {months.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
          No upcoming months to display.
        </div>
      ) : (
        months.map((month) => {
          const key = `${month.year}-${month.monthIndex}`;
          // const events = monthDataByKey[key] ?? []; // available for richer summaries later
          const calls = programCallsByMonthKey[key] ?? [];
          const timeOff = timeOffByMonthKey[key] ?? [];

          // Simple counts from existing data (no new logic)
          const callCount = calls.length;
          const myCallCount = calls.filter((c) => c.isMine).length;

          // Count distinct rotations overlapping the month from the already-loaded timeline
          const monthStart = `${month.year}-${String(month.monthIndex + 1).padStart(2, "0")}-01`;
          const rotationCount = rotationTimelineEvents.filter((r) => {
            return r.startDate <= monthStart && r.endDate >= monthStart; // rough overlap
          }).length;

          const hasPersonalItems = myCallCount > 0 || timeOff.length > 0;

          return (
            <MobileCardShell key={key}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-lg font-bold tracking-tight text-slate-950">
                    {month.label}
                  </div>
                  <div className="text-xs text-slate-500">{month.year}</div>
                </div>
                <div className="text-right text-xs text-slate-400">
                  {rotationLoading ? "…" : `${rotationCount} rotations`}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <div className="inline-flex items-center gap-1.5 rounded-xl bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">
                  <PhoneCall className="h-3.5 w-3.5" />
                  {callCount} call{callCount === 1 ? "" : "s"}
                  {myCallCount > 0 && ` (${myCallCount} yours)`}
                </div>

                {rotationCount > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-sky-100 px-3 py-1 text-xs font-semibold text-sky-700">
                    <Users className="h-3.5 w-3.5" />
                    {rotationCount} rotation{rotationCount === 1 ? "" : "s"}
                  </div>
                )}

                {timeOff.length > 0 && (
                  <div className="inline-flex items-center gap-1.5 rounded-xl bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                    <PlaneTakeoff className="h-3.5 w-3.5" />
                    {timeOff.length} time off
                  </div>
                )}
              </div>

              {!hasPersonalItems && callCount === 0 && rotationCount === 0 && (
                <div className="mt-3 text-xs text-slate-400">No scheduled items yet for this month.</div>
              )}

              {hasPersonalItems && (
                <div className="mt-2 text-xs text-emerald-600 font-medium">
                  Personal items scheduled
                </div>
              )}
            </MobileCardShell>
          );
        })
      )}
    </div>
  );
}
