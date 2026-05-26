"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import {
  buildCalendarWeeksSunday,
  buildRequestCalendarOverlayState,
  formatShortDate,
  getCallCardClasses,
  getPreferredRequestMonth,
  getRequestDate,
  getResidentLastName,
  getStatusColorTone,
  getToneClasses,
  getViewerRole,
  isSameMonth,
  monthLabel,
  monthRange,
  toDateKey,
} from "@/lib/workspace/call-swaps/calendar-overlay-utils";
import type {
  CalendarCallItem,
  CalendarMonthResponse,
} from "@/lib/workspace/call-swaps/calendar-overlay-utils";

// Keep local alias so inner component code is unchanged
type ProgramCallItem = CalendarCallItem;
type ProgramCallsMonthResponse = CalendarMonthResponse;

// ---------------------------------------------------------------------------
// Debug helper (resident-only, stays here)
// ---------------------------------------------------------------------------

function debugResidentRequestOverlays(
  label: string,
  payload: Record<string, unknown>
) {
  if (process.env.NODE_ENV !== "production") {
    console.log("[resident-request-overlays]", label, payload);
  }
}

// ---------------------------------------------------------------------------
// Resident-centric schedule change preview
// (uses "You" language — intentionally resident-only, stays here)
// ---------------------------------------------------------------------------

function ScheduleChangePreview({
  request,
  currentRosterId,
  requestOutsideVisibleMonth,
}: {
  request: SwapRequestListItem | null;
  currentRosterId: string | null;
  requestOutsideVisibleMonth: boolean;
}) {
  if (!request) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Select a request to preview the schedule change.
      </div>
    );
  }

  const viewerRole = getViewerRole(request, currentRosterId);
  const requesterName = request.requester?.fullName ?? "Unknown resident";
  const recipientName = request.recipient?.fullName ?? "Unknown resident";
  const isTrade = request.request_type === "trade" && request.recipientCall;
  const previewTone = getStatusColorTone(request.status);
  const previewToneClasses = getToneClasses(
    previewTone,
    Boolean(requestOutsideVisibleMonth)
  );
  const primaryLine =
    viewerRole === "recipient"
      ? `You take ${formatShortDate(request.requesterCall?.callDate)} — ${
          request.requesterCall?.callType ?? "Call"
        }`
      : `${recipientName} takes ${formatShortDate(
          request.requesterCall?.callDate
        )} — ${request.requesterCall?.callType ?? "Call"}`;
  const ownerLine =
    viewerRole === "recipient"
      ? `${requesterName} gives up this call.`
      : "You give up this call.";
  const returnLine = isTrade
    ? `${viewerRole === "recipient" ? requesterName : "You"} take ${formatShortDate(
        request.recipientCall?.callDate
      )} — ${request.recipientCall?.callType ?? "Call"}`
    : null;
  const tradeToneClasses = getToneClasses("violet", false);

  return (
    <div className="space-y-2.5">
      {requestOutsideVisibleMonth ? (
        <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
          This request is outside the visible month.
        </div>
      ) : null}

      <div
        className={`rounded-[1.15rem] border bg-white px-3.5 py-3 ${previewToneClasses.card}`}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${previewToneClasses.strip}`}
          />
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
            Schedule change preview
          </p>
        </div>

        <div
          className={`mt-2.5 grid gap-2 ${
            isTrade ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"
          }`}
        >
          <div className="flex items-start gap-2">
            <span
              className={`mt-1 h-2 w-2 rounded-full ${previewToneClasses.strip}`}
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {primaryLine}
              </p>
              <p className="mt-0.5 text-xs text-slate-600">{ownerLine}</p>
            </div>
          </div>

          {isTrade && returnLine ? (
            <div className="flex items-start gap-2">
              <span
                className={`mt-1 h-2 w-2 rounded-full ${tradeToneClasses.strip}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">
                  {returnLine}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <span
                className={`mt-1 h-2 w-2 rounded-full ${previewToneClasses.strip}`}
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-950">
                  No return shift.
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Only this call changes hands.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function SwapRequestCalendarContext({
  currentRosterId,
  selectedRequest,
  requests,
}: {
  currentRosterId: string | null;
  selectedRequest: SwapRequestListItem | null;
  requests: SwapRequestListItem[];
}) {
  const selectedRequestMonth = useMemo(() => {
    if (selectedRequest) return getRequestDate(selectedRequest);
    return getPreferredRequestMonth(requests);
  }, [requests, selectedRequest]);

  const [visibleMonth, setVisibleMonth] = useState(selectedRequestMonth);
  const [data, setData] = useState<ProgramCallsMonthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVisibleMonth(selectedRequestMonth);
  }, [selectedRequestMonth]);

  useEffect(() => {
    const { monthStart, monthEnd } = monthRange(
      visibleMonth.year,
      visibleMonth.monthIndex
    );
    let cancelled = false;

    async function loadMonth() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          { credentials: "include", cache: "no-store" }
        );

        const payload = (await response.json().catch(() => null)) as
          | ProgramCallsMonthResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("calls" in payload)) {
          const errorMessage =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(
            errorMessage ?? "Failed to load calendar context."
          );
        }

        if (!cancelled) setData(payload);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load calendar context."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadMonth();
    return () => {
      cancelled = true;
    };
  }, [visibleMonth.monthIndex, visibleMonth.year]);

  const weeks = useMemo(
    () =>
      buildCalendarWeeksSunday(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.monthIndex, visibleMonth.year]
  );

  const callsByDate = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();
    for (const call of data?.calls ?? []) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }
    for (const [, value] of map.entries()) {
      value.sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return a.residentName.localeCompare(b.residentName);
      });
    }
    return map;
  }, [data?.calls]);

  const overlayState = useMemo(
    () =>
      buildRequestCalendarOverlayState({
        calls: data?.calls ?? [],
        requests,
        selectedRequest,
        currentRosterId,
        // No viewerRoleOverride → resident-centric labels (unchanged behaviour)
      }),
    [currentRosterId, data?.calls, requests, selectedRequest]
  );

  const selectedRequestVisibleInMonth = useMemo(() => {
    if (!selectedRequest) return true;
    return overlayState.selectedAssignmentIds.size > 0;
  }, [overlayState.selectedAssignmentIds.size, selectedRequest]);

  useEffect(() => {
    debugResidentRequestOverlays("render:state", {
      selectedRequestId: selectedRequest?.id ?? null,
      selectedRequestVisibleInMonth,
      visibleMonth,
      requestCount: requests.length,
      monthCallCount: data?.calls.length ?? 0,
    });
  }, [
    data?.calls.length,
    requests.length,
    selectedRequest?.id,
    selectedRequestVisibleInMonth,
    visibleMonth,
  ]);

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Schedule context
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Your month at a glance
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Active requests show directly on the calendar so you can see what
            would change.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
        <div className="text-sm font-semibold text-slate-700">
          {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
        </div>
        <div className="flex flex-wrap gap-2 text-[11px] font-semibold text-slate-600">
          <span className="rounded-full bg-sky-100 px-2 py-1 text-sky-800">
            My call
          </span>
          <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">
            Outgoing
          </span>
          <span className="rounded-full bg-violet-100 px-2 py-1 text-violet-800">
            Incoming swap
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-1 text-blue-800">
            Pending admin
          </span>
          <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">
            Approved
          </span>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading calendar context...
        </div>
      ) : null}

      <div className="mt-4 rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4 shadow-sm">
        <ScheduleChangePreview
          request={selectedRequest}
          currentRosterId={currentRosterId}
          requestOutsideVisibleMonth={!selectedRequestVisibleInMonth}
        />
      </div>

      {!selectedRequest && !overlayState.hasVisibleActiveOverlays ? (
        <div className="mt-4 rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          No active resident requests are affecting this month right now.
        </div>
      ) : null}

      <div className="mt-4 space-y-1">
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

        <div className="space-y-1">
          {weeks.map((week, weekIndex) => (
            <div
              key={`swap-context-week-${weekIndex}`}
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
                const dayHasSelectedOverlay = dayCalls.some((call) =>
                  overlayState.selectedAssignmentIds.has(call.id)
                );

                return (
                  <div
                    key={key}
                    className={`h-[142px] rounded-[0.9rem] border px-1.5 py-1 transition ${
                      inMonth
                        ? "border-slate-200 bg-white"
                        : "border-transparent bg-slate-50/60"
                    } ${
                      selectedRequest && !dayHasSelectedOverlay
                        ? "opacity-70"
                        : ""
                    }`}
                  >
                    <div className="text-[10px] font-semibold text-slate-700">
                      {date.getDate()}
                    </div>

                    <div className="mt-1 space-y-1">
                      {dayCalls.map((call) => {
                        const overlays =
                          overlayState.overlaysByAssignmentId.get(call.id) ??
                          [];
                        if (process.env.NODE_ENV !== "production") {
                          console.log(
                            "[resident-request-overlays]",
                            "render:call",
                            {
                              callId: call.id,
                              callDate: call.callDate,
                              rosterId:
                                call.rosterId ?? call.membershipId ?? null,
                              overlayCount: overlays.length,
                              overlayLabels: overlays.map(
                                (o) => o.stageLabel
                              ),
                              selectedRequestId: selectedRequest?.id ?? null,
                              matchesSelected:
                                overlayState.selectedAssignmentIds.has(
                                  call.id
                                ),
                            }
                          );
                        }
                        const hiddenOverlayCount = Math.max(
                          0,
                          overlays.length - 1
                        );
                        const strongestOverlay = overlays[0] ?? null;
                        const isSelectedCall =
                          overlayState.selectedAssignmentIds.has(call.id);
                        const isDimmed = !!selectedRequest && !isSelectedCall;
                        const baseCallTone = getCallCardClasses(call);
                        const overlayTone = strongestOverlay
                          ? getToneClasses(
                              strongestOverlay.colorTone,
                              strongestOverlay.isSelectedRequest
                            )
                          : null;

                        return (
                          <div
                            key={call.id}
                            className={`overflow-hidden rounded-lg border px-1.5 py-1.5 transition ${
                              overlayTone?.card ?? baseCallTone.card
                            } ${isDimmed ? "opacity-70" : ""}`}
                          >
                            {overlayTone ? (
                              <div
                                className={`-mx-1.5 -mt-1.5 mb-1.5 h-1 ${overlayTone.strip}`}
                              />
                            ) : null}

                            <div className="flex items-start justify-between gap-1">
                              <div className="min-w-0">
                                <p
                                  className={`truncate text-[11px] font-bold ${
                                    strongestOverlay
                                      ? "text-slate-950"
                                      : baseCallTone.label
                                  }`}
                                >
                                  {getResidentLastName(call.residentName)}
                                </p>
                                <p className="truncate text-[9px] text-slate-600">
                                  {call.callType ?? "Call"}
                                </p>
                              </div>
                              {strongestOverlay ? (
                                <span
                                  className={`rounded-full border px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.11em] ${overlayTone?.pill}`}
                                >
                                  {strongestOverlay.stageLabel}
                                </span>
                              ) : call.isMine ? (
                                <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-[0.11em] text-sky-800">
                                  Mine
                                </span>
                              ) : null}
                            </div>

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
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
