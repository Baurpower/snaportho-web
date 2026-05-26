"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import {
  buildCalendarWeeksSunday,
  buildRequestCalendarOverlayState,
  getCallCardClasses,
  getPreferredRequestMonth,
  getResidentLastName,
  getToneClasses,
  isSameMonth,
  monthLabel,
  monthRange,
  toDateKey,
} from "@/lib/workspace/call-swaps/calendar-overlay-utils";
import type {
  CalendarCallItem,
  CalendarMonthResponse,
} from "@/lib/workspace/call-swaps/calendar-overlay-utils";
import {
  buildProjectedCalls,
  type ProjectedCallItem,
} from "@/lib/workspace/call-swaps/projected-schedule";

// ---------------------------------------------------------------------------
// Month data fetching
// ---------------------------------------------------------------------------

function logRefresh(label: string, details?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  const suffix = details ? ` ${JSON.stringify(details)}` : "";
  console.info(`[admin-approval-refresh] ${label}${suffix}`);
}

/**
 * `refreshKey` is an external integer counter. Incrementing it from outside
 * forces a re-fetch of the current month without changing the visible month.
 */
function useAdminCalendarMonth(year: number, monthIndex: number, refreshKey = 0) {
  const [data, setData] = useState<CalendarMonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { monthStart, monthEnd } = monthRange(year, monthIndex);
    let cancelled = false;

    async function load() {
      try {
        logRefresh("calendar.month.fetch.start", { year, monthIndex, monthStart, monthEnd, refreshKey });
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          { credentials: "include", cache: "no-store" }
        );

        const payload = (await response.json().catch(() => null)) as
          | CalendarMonthResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("calls" in payload)) {
          const msg =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(msg ?? "Failed to load calendar data.");
        }

        if (!cancelled) {
          logRefresh("calendar.month.fetch.done", { callCount: payload.calls.length, refreshKey });
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load calendar data."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
    // refreshKey is intentionally in the dep array — incrementing it from the
    // parent forces a re-fetch of the same month after admin approval/reject
    // without resetting month navigation.
  }, [year, monthIndex, refreshKey]);

  return { data, loading, error };
}

// ---------------------------------------------------------------------------
// Admin calendar cell
//
// Handles both current-schedule and preview-mode rendering.
// Projected calls (call._isProjected === true) receive:
//   • dashed border
//   • "Prev" micro-badge
//   • amber tint when there is no request overlay
//   • original owner subline ("from LastName") when there is no overlay text
// ---------------------------------------------------------------------------

function AdminCalendarCell({
  date,
  inMonth,
  calls,
  overlaysByAssignmentId,
  selectedAssignmentIds,
  hasSelectedRequest,
  onSelectRequest,
}: {
  date: Date;
  inMonth: boolean;
  calls: ProjectedCallItem[];
  overlaysByAssignmentId: Map<
    string,
    ReturnType<
      typeof buildRequestCalendarOverlayState
    >["overlaysByAssignmentId"] extends Map<string, infer V>
      ? V
      : never
  >;
  selectedAssignmentIds: Set<string>;
  hasSelectedRequest: boolean;
  onSelectRequest?: (requestId: string) => void;
}) {
  return (
    <div
      className={`min-h-[142px] rounded-[0.9rem] border px-1.5 py-1 transition ${
        inMonth
          ? "border-slate-200 bg-white"
          : "border-transparent bg-slate-50/60"
      }`}
    >
      <div className="text-[10px] font-semibold text-slate-700">
        {date.getDate()}
      </div>

      <div className="mt-1 space-y-1">
        {calls.map((call) => {
          const isProjected = call._isProjected === true;
          const originalOwner = call._originalOwnerLabel ?? null;

          const overlays = overlaysByAssignmentId.get(call.id) ?? [];
          const hiddenOverlayCount = Math.max(0, overlays.length - 1);
          const strongestOverlay = overlays[0] ?? null;
          const isSelectedCall = selectedAssignmentIds.has(call.id);
          const isDimmed = hasSelectedRequest && !isSelectedCall;
          const baseCallTone = getCallCardClasses(call);
          const overlayTone = strongestOverlay
            ? getToneClasses(
                strongestOverlay.colorTone,
                strongestOverlay.isSelectedRequest
              )
            : null;

          const isClickable = !!strongestOverlay && !!onSelectRequest;

          // Build card classes, handling projected state
          const cardCx = isProjected
            ? overlayTone
              ? // Projected + overlay: keep overlay styling, add dashed border
                `${overlayTone.card} [border-style:dashed]`
              : // Projected + no overlay: amber tint with dashed border
                "border-amber-200 bg-amber-50/60 [border-style:dashed]"
            : // Not projected: normal styling
              (overlayTone?.card ?? baseCallTone.card);

          return (
            <div
              key={call.id}
              onClick={
                isClickable
                  ? () => onSelectRequest!(strongestOverlay!.requestId)
                  : undefined
              }
              role={isClickable ? "button" : undefined}
              tabIndex={isClickable ? 0 : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onSelectRequest!(strongestOverlay!.requestId);
                      }
                    }
                  : undefined
              }
              className={`overflow-hidden rounded-lg border px-1.5 py-1.5 transition ${cardCx} ${
                isDimmed ? "opacity-60" : ""
              } ${
                isClickable
                  ? "cursor-pointer hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                  : ""
              }`}
            >
              {/* Colored top strip — only for request overlays */}
              {overlayTone ? (
                <div
                  className={`-mx-1.5 -mt-1.5 mb-1.5 h-1 ${overlayTone.strip}`}
                />
              ) : null}

              {/* Name row + badges */}
              <div className="flex items-start justify-between gap-1">
                <div className="min-w-0">
                  <p
                    className={`truncate text-[11px] font-bold ${
                      strongestOverlay ? "text-slate-950" : baseCallTone.label
                    }`}
                  >
                    {getResidentLastName(call.residentName)}
                  </p>
                  <p className="truncate text-[9px] text-slate-600">
                    {call.callType ?? "Call"}
                  </p>
                </div>

                {/* Badge column: preview pill (top) + stage label (bottom) */}
                <div className="flex shrink-0 flex-col items-end gap-0.5">
                  {isProjected ? (
                    <span className="rounded-full border border-amber-300 bg-amber-100 px-1 py-px text-[6px] font-black uppercase tracking-[0.08em] text-amber-800">
                      Prev
                    </span>
                  ) : null}
                  {strongestOverlay ? (
                    <span
                      className={`rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.11em] ${overlayTone?.pill}`}
                    >
                      {strongestOverlay.stageLabel}
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Subline: relationship label, original owner hint, or Home */}
              {strongestOverlay ? (
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p
                    className={`truncate text-[10px] font-semibold ${overlayTone?.sublabel}`}
                  >
                    {strongestOverlay.relationshipLine}
                  </p>
                  {hiddenOverlayCount > 0 ? (
                    <span className="rounded-full border border-slate-200 bg-slate-100 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.11em] text-slate-700">
                      +{hiddenOverlayCount}
                    </span>
                  ) : null}
                </div>
              ) : isProjected && originalOwner ? (
                // No overlay but projected: show original owner as subline
                <p className="mt-1 truncate text-[8px] font-medium text-amber-700">
                  from {getResidentLastName(originalOwner)}
                </p>
              ) : call.isHomeCall ? (
                <p className="mt-1 truncate text-[8px] font-medium text-slate-500">
                  Home
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminRequestCalendar({
  requests,
  selectedRequestId,
  onSelectRequest,
  onCallsLoaded,
  previewMode = "current",
  refreshKey = 0,
  className = "",
}: {
  requests: SwapRequestListItem[];
  selectedRequestId?: string | null;
  onSelectRequest?: (requestId: string) => void;
  /**
   * Fired whenever the month's raw calls are (re-)loaded. Receives the
   * unmodified CalendarCallItem array from the API — before any projection.
   * Used by the parent to run projected-schedule validation.
   */
  onCallsLoaded?: (calls: CalendarCallItem[]) => void;
  /** "current" renders official schedule; "preview" projects all pending requests */
  previewMode?: "current" | "preview";
  /**
   * Increment this to trigger an immediate re-fetch of the current month's
   * call data without resetting month navigation. Use after admin approval/
   * reject so the calendar reflects the updated owner immediately.
   */
  refreshKey?: number;
  className?: string;
}) {
  // Auto-navigate to the month of the earliest pending request
  const initialMonth = useMemo(
    () => getPreferredRequestMonth(requests),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [] // Only on mount — we don't want month to jump on every queue change
  );

  const [visibleMonth, setVisibleMonth] = useState(initialMonth);
  const { data, loading, error } = useAdminCalendarMonth(
    visibleMonth.year,
    visibleMonth.monthIndex,
    refreshKey
  );

  // Emit raw calls to the parent for validation whenever the month data changes.
  // Use a ref so the effect dep array stays stable even if the parent passes a
  // new function reference each render (avoids unnecessary re-fires).
  const onCallsLoadedRef = useRef(onCallsLoaded);
  onCallsLoadedRef.current = onCallsLoaded;

  useEffect(() => {
    if (data?.calls) {
      onCallsLoadedRef.current?.(data.calls);
    }
  }, [data]);

  const goToPrevMonth = useCallback(() => {
    setVisibleMonth((prev) => {
      const d = new Date(prev.year, prev.monthIndex - 1, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setVisibleMonth((prev) => {
      const d = new Date(prev.year, prev.monthIndex + 1, 1);
      return { year: d.getFullYear(), monthIndex: d.getMonth() };
    });
  }, []);

  const weeks = useMemo(
    () => buildCalendarWeeksSunday(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  // Only project accepted_pending_admin requests
  const pendingAdminRequests = useMemo(
    () => requests.filter((r) => r.status === "accepted_pending_admin"),
    [requests]
  );

  // Derive display calls from mode:
  //   current  → official calls from the API (no changes)
  //   preview  → buildProjectedCalls applies all pending requests in memory
  //
  // Cast is safe — ProjectedCallItem only adds optional fields to CalendarCallItem.
  const displayCalls = useMemo<ProjectedCallItem[]>(() => {
    const rawCalls: CalendarCallItem[] = data?.calls ?? [];
    if (previewMode === "preview") {
      return buildProjectedCalls(rawCalls, pendingAdminRequests);
    }
    return rawCalls as ProjectedCallItem[];
  }, [previewMode, data?.calls, pendingAdminRequests]);

  // callsByDate uses displayCalls so preview owners appear in the right cells
  const callsByDate = useMemo(() => {
    const map = new Map<string, ProjectedCallItem[]>();
    for (const call of displayCalls) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }
    for (const [, list] of map.entries()) {
      list.sort((a, b) => a.residentName.localeCompare(b.residentName));
    }
    return map;
  }, [displayCalls]);

  // The selected request object (for overlay dimming)
  const selectedRequest = useMemo(
    () =>
      selectedRequestId
        ? (requests.find((r) => r.id === selectedRequestId) ?? null)
        : null,
    [requests, selectedRequestId]
  );

  // Overlay state always uses the official (non-projected) call IDs —
  // projection does not change IDs so the result is identical either way.
  const overlayState = useMemo(
    () =>
      buildRequestCalendarOverlayState({
        calls: data?.calls ?? [],
        requests: pendingAdminRequests,
        selectedRequest,
        currentRosterId: null,
        viewerRoleOverride: "admin",
      }),
    [data?.calls, pendingAdminRequests, selectedRequest]
  );

  const hasSelectedRequest = !!selectedRequest;
  const pendingCount = pendingAdminRequests.length;

  return (
    <div
      className={`rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`}
    >
      {/* Header row — compact, clearly secondary to the approval workspace above */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: icon + label */}
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
            <CalendarDays className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-600">
              {previewMode === "preview" ? "Preview schedule" : "Schedule context"}
            </p>
            <p className="text-sm font-bold text-slate-950">
              {pendingCount === 0
                ? "Program schedule"
                : previewMode === "preview"
                ? `Projected if all ${pendingCount} request${pendingCount === 1 ? "" : "s"} approved`
                : `${pendingCount} request${pendingCount === 1 ? "" : "s"} — click any overlay to select`}
            </p>
          </div>
        </div>

        {/* Right: month nav + legend pills */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[120px] text-center text-sm font-semibold text-slate-700">
              {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex flex-wrap gap-1.5 text-[11px] font-semibold">
            {previewMode === "preview" ? (
              <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-amber-900">
                Preview — projected owners shown
              </span>
            ) : (
              <>
                <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
                  Pending admin
                </span>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
                  Approved
                </span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-800">
                  Rejected
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Error state */}
      {error ? (
        <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Loading state */}
      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading schedule...
        </div>
      ) : null}

      {/* Empty state */}
      {!loading &&
      !error &&
      pendingCount === 0 &&
      (data?.calls.length ?? 0) === 0 ? (
        <div className="mt-4 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
          No schedule data for this month.
        </div>
      ) : null}

      {/* Calendar grid */}
      <div className="mt-4 space-y-1">
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div
              key={`admin-cal-week-${weekIndex}`}
              className="grid grid-cols-7 gap-1"
            >
              {week.map((date) => {
                const key = toDateKey(date);
                const inMonth = isSameMonth(
                  date,
                  visibleMonth.year,
                  visibleMonth.monthIndex
                );
                const dayCalls = callsByDate.get(key) ?? [];

                return (
                  <AdminCalendarCell
                    key={key}
                    date={date}
                    inMonth={inMonth}
                    calls={dayCalls}
                    overlaysByAssignmentId={
                      overlayState.overlaysByAssignmentId
                    }
                    selectedAssignmentIds={overlayState.selectedAssignmentIds}
                    hasSelectedRequest={hasSelectedRequest}
                    onSelectRequest={onSelectRequest}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
