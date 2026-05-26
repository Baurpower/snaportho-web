"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  UserRound,
  X,
} from "lucide-react";
import RecipientPicker, { type CoverageRecipientOption } from "./RecipientPicker";
import { useCreateSwapRequest } from "@/hooks/useCreateSwapRequest";
import type {
  CreateSwapRequestInput,
  SwapRequestListItem,
  SwapRequestStatus,
} from "@/lib/workspace/call-swaps/types";
import type { ProgramCallItem } from "@/components/workspace/call/callmonthcalendar";

type ResidentOption = {
  rosterId: string;
  programMembershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  pgyYear: number | null;
  gradYear: number | null;
};

type ProgramCallsMonthResponse = {
  myRosterId: string | null;
  residents: ResidentOption[];
  calls: ProgramCallItem[];
};

const ACTIVE_REQUEST_STATUSES = new Set<SwapRequestStatus>([
  "pending_recipient",
  "accepted_pending_admin",
]);

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

function buildCalendarWeeksSunday(year: number, monthIndex: number) {
  const monthStart = new Date(year, monthIndex, 1);
  const monthEnd = new Date(year, monthIndex + 1, 0);
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

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return "Date unavailable";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "Date unavailable";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getCallLabel(call: ProgramCallItem | null) {
  if (!call) return "Call";
  return `${call.callType ?? "Call"} • ${formatLongDate(call.callDate)}`;
}

function getResidentLastName(displayName: string) {
  const trimmed = displayName.trim();
  if (!trimmed) return displayName;
  const parts = trimmed.split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] ?? displayName;
}

function getCurrentAcademicYear() {
  return new Date().getFullYear();
}

function getLatestRequestForCall(
  requests: SwapRequestListItem[],
  callId: string
) {
  return requests
    .filter((request) => request.requesterCall?.id === callId)
    .sort((a, b) => {
      const left = Date.parse(b.updated_at ?? b.created_at);
      const right = Date.parse(a.updated_at ?? a.created_at);
      return Number.isNaN(left) || Number.isNaN(right) ? 0 : left - right;
    })[0] ?? null;
}

function getRosterId(call: ProgramCallItem) {
  // `membershipId` is a legacy scheduler field that can still carry roster-style ids.
  return call.rosterId ?? call.membershipId ?? null;
}

function getCompactCallMeta(call: ProgramCallItem) {
  return call.isHomeCall ? "Home" : call.site ?? null;
}

function ProgressPill({
  step,
  label,
  active,
  done,
}: {
  step: number;
  label: string;
  active: boolean;
  done: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${
        active
          ? "border-sky-300 bg-sky-50 text-sky-900"
          : done
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          active
            ? "bg-sky-600 text-white"
            : done
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {step}
      </span>
      {label}
    </div>
  );
}

function isDev() {
  return process.env.NODE_ENV !== "production";
}

export default function ChangeMyCallModal({
  open,
  onClose,
  programId,
  currentRosterId,
  calls,
  residents,
  outgoingRequests,
  initialYear,
  initialMonthIndex,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  programId: string | null;
  currentRosterId: string | null;
  calls: ProgramCallItem[];
  residents: ResidentOption[];
  outgoingRequests: SwapRequestListItem[];
  initialYear: number;
  initialMonthIndex: number;
  onCreated?: () => void | Promise<void>;
}) {
  const { createRequest, loading, error, setError } = useCreateSwapRequest();
  const [selectedMyCallId, setSelectedMyCallId] = useState<string | null>(null);
  const [selectedMyCallSnapshot, setSelectedMyCallSnapshot] =
    useState<ProgramCallItem | null>(null);
  const [selectedRecipientRosterId, setSelectedRecipientRosterId] =
    useState<string | null>(null);
  const [selectedRecipientCallId, setSelectedRecipientCallId] =
    useState<string | null>(null);
  const [selectedRecipientCallSnapshot, setSelectedRecipientCallSnapshot] =
    useState<ProgramCallItem | null>(null);
  const [note, setNote] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [helperMessage, setHelperMessage] = useState<string | null>(null);
  const [visibleYear, setVisibleYear] = useState(initialYear);
  const [visibleMonthIndex, setVisibleMonthIndex] = useState(initialMonthIndex);
  const [modalCalls, setModalCalls] = useState<ProgramCallItem[]>(calls);
  const [modalResidents, setModalResidents] = useState<ResidentOption[]>(residents);
  const [modalMyRosterId, setModalMyRosterId] = useState<string | null>(
    currentRosterId
  );
  const [isLoadingModalMonth, setIsLoadingModalMonth] = useState(false);
  const [modalMonthError, setModalMonthError] = useState<string | null>(null);
  const monthRequestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    setSelectedMyCallId(null);
    setSelectedMyCallSnapshot(null);
    setSelectedRecipientRosterId(null);
    setSelectedRecipientCallId(null);
    setSelectedRecipientCallSnapshot(null);
    setNote("");
    setSuccessMessage(null);
    setHelperMessage(null);
    setError(null);
    setVisibleYear(initialYear);
    setVisibleMonthIndex(initialMonthIndex);
    setModalCalls(calls);
    setModalResidents(residents);
    setModalMyRosterId(currentRosterId);
    setIsLoadingModalMonth(false);
    setModalMonthError(null);
  }, [
    calls,
    currentRosterId,
    initialMonthIndex,
    initialYear,
    open,
    residents,
    setError,
  ]);

  useEffect(() => {
    if (!open) return;

    const isInitialVisibleMonth =
      visibleYear === initialYear && visibleMonthIndex === initialMonthIndex;
    const hasInitialMonthData = calls.length > 0 || residents.length > 0;

    if (isInitialVisibleMonth && hasInitialMonthData) {
      setModalCalls(calls);
      setModalResidents(residents);
      setModalMyRosterId(currentRosterId);
      setIsLoadingModalMonth(false);
      setModalMonthError(null);
      return;
    }

    const requestId = monthRequestIdRef.current + 1;
    monthRequestIdRef.current = requestId;
    const controller = new AbortController();
    const { monthStart, monthEnd } = getMonthRange(visibleYear, visibleMonthIndex);

    setIsLoadingModalMonth(true);
    setModalMonthError(null);

    fetch(
      `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
      {
        credentials: "include",
        signal: controller.signal,
      }
    )
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | ProgramCallsMonthResponse
          | { error?: string }
          | null;

        if (!response.ok || !payload || !("calls" in payload)) {
          const errorMessage =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(
            errorMessage ?? "Could not load this month’s call schedule."
          );
        }

        if (monthRequestIdRef.current !== requestId) return;

        setModalCalls(payload.calls ?? []);
        setModalResidents(payload.residents ?? []);
        setModalMyRosterId(payload.myRosterId ?? currentRosterId);
        setModalMonthError(null);
      })
      .catch((fetchError) => {
        if (controller.signal.aborted) return;
        if (monthRequestIdRef.current !== requestId) return;

        setModalMonthError(
          fetchError instanceof Error
            ? fetchError.message
            : "Could not load this month’s call schedule."
        );
        setModalCalls([]);
        setModalResidents([]);
        setModalMyRosterId(currentRosterId);
      })
      .finally(() => {
        if (controller.signal.aborted) return;
        if (monthRequestIdRef.current !== requestId) return;
        setIsLoadingModalMonth(false);
      });

    return () => {
      controller.abort();
    };
  }, [
    calls,
    currentRosterId,
    initialMonthIndex,
    initialYear,
    open,
    residents,
    calls.length,
    residents.length,
    visibleMonthIndex,
    visibleYear,
  ]);

  const currentYear = getCurrentAcademicYear();
  const effectiveRosterId = modalMyRosterId ?? currentRosterId;

  const eligibleRecipients = useMemo<CoverageRecipientOption[]>(() => {
    return modalResidents
      .filter((resident) => {
        if (!effectiveRosterId || resident.rosterId === effectiveRosterId) return false;
        if (resident.gradYear === null) return false;
        if (resident.gradYear < currentYear) return false;
        return true;
      })
      .map((resident) => ({
        rosterId: resident.rosterId,
        programMembershipId: resident.programMembershipId,
        displayName: resident.residentName,
        trainingLevel: resident.trainingLevel,
        pgyYear: resident.pgyYear,
        gradYear: resident.gradYear,
      }));
  }, [currentYear, effectiveRosterId, modalResidents]);

  const eligibleRecipientIds = useMemo(
    () => new Set(eligibleRecipients.map((recipient) => recipient.rosterId)),
    [eligibleRecipients]
  );

  const callsByDate = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();

    for (const call of modalCalls) {
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
  }, [modalCalls]);

  const myCalls = useMemo(
    () =>
      modalCalls.filter((call) => {
        const rosterId = getRosterId(call);
        return call.isMine && rosterId === effectiveRosterId;
      }),
    [effectiveRosterId, modalCalls]
  );

  const outgoingRequestsByCallId = useMemo(() => {
    const map = new Map<string, SwapRequestListItem>();

    for (const call of myCalls) {
      const latest = getLatestRequestForCall(outgoingRequests, call.id);
      if (latest) {
        map.set(call.id, latest);
      }
    }

    return map;
  }, [myCalls, outgoingRequests]);

  const selectedMyCallFromCalls =
    myCalls.find((call) => call.id === selectedMyCallId) ?? null;
  const selectedMyCall = selectedMyCallFromCalls ?? selectedMyCallSnapshot;
  const selectedRecipient =
    eligibleRecipients.find(
      (recipient) => recipient.rosterId === selectedRecipientRosterId
    ) ?? null;
  const selectedRecipientCallFromCalls =
    modalCalls.find((call) => call.id === selectedRecipientCallId) ?? null;
  const selectedRecipientCall =
    selectedRecipientCallFromCalls ?? selectedRecipientCallSnapshot;
  // `outgoingRequestsByCallId` stores the LATEST request regardless of status.
  // We only want to block submission / show the amber warning when the latest
  // request is still ACTIVE (pending_recipient or accepted_pending_admin).
  // A completed/cancelled/rejected latest request must NOT block a new request.
  const selectedMyCallLatestRequest = selectedMyCallId
    ? (outgoingRequestsByCallId.get(selectedMyCallId) ?? null)
    : null;
  const selectedMyCallRequest =
    selectedMyCallLatestRequest !== null &&
    ACTIVE_REQUEST_STATUSES.has(selectedMyCallLatestRequest.status)
      ? selectedMyCallLatestRequest
      : null;

  const weeks = useMemo(
    () => buildCalendarWeeksSunday(visibleYear, visibleMonthIndex),
    [visibleMonthIndex, visibleYear]
  );

  const filteredOutRecipientCount = Math.max(
    0,
    modalResidents.length - 1 - eligibleRecipients.length
  );
  const requestMode =
    selectedRecipientCall && selectedRecipient ? "trade" : selectedRecipient ? "coverage_only" : null;
  const sendButtonLabel =
    requestMode === "trade"
      ? "Send swap request"
      : requestMode === "coverage_only"
      ? "Send coverage request"
      : "Send request";
  const selectedModeLabel =
    requestMode === "trade"
      ? "Swap request"
      : requestMode === "coverage_only"
      ? "Coverage request"
      : "Choose coverage or swap";

  const canSubmit =
    Boolean(programId) &&
    Boolean(currentRosterId) &&
    Boolean(selectedMyCall?.id) &&
    Boolean(selectedRecipient?.rosterId) &&
    !selectedMyCallRequest;

  async function handleSubmit() {
    const resolvedSelectedMyCall =
      myCalls.find((call) => call.id === selectedMyCallId) ??
      selectedMyCallSnapshot;
    const resolvedSelectedRecipientCall =
      modalCalls.find((call) => call.id === selectedRecipientCallId) ??
      selectedRecipientCallSnapshot;
    const derivedRequestType: CreateSwapRequestInput["requestType"] =
      resolvedSelectedRecipientCall ? "trade" : "coverage_only";

    // ── Debug log BEFORE any guard returns so TypeScript hasn’t narrowed yet ──
    if (isDev()) {
      // [coverage-request-debug] — full pre-submit state trace
      console.info("[coverage-request-debug] pre-submit", {
        selectedMyCallId,
        selectedRecipientRosterId,
        selectedRecipientCallId,
        derivedRequestType,
        selectedMyCallFound: Boolean(resolvedSelectedMyCall?.id),
        selectedMyCallId_inMyCalls: Boolean(
          myCalls.find((call) => call.id === selectedMyCallId)
        ),
        selectedMyCallId_inModalCalls: Boolean(
          modalCalls.find((call) => call.id === selectedMyCallId)
        ),
        selectedRecipientCallFound: Boolean(resolvedSelectedRecipientCall?.id),
        // Use selectedMyCallLatestRequest (pre-active-filter) for blocking info
        // — it hasn’t been narrowed by a guard yet so TS accepts it.
        latestRequestForSelectedCall: selectedMyCallLatestRequest?.id ?? null,
        latestRequestStatus: selectedMyCallLatestRequest?.status ?? null,
        latestRequestType: selectedMyCallLatestRequest?.request_type ?? null,
        isLatestRequestActive: selectedMyCallRequest !== null,
        activeRequestId: selectedMyCallRequest?.id ?? null,
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    if (!programId || !currentRosterId || !selectedMyCall || !selectedRecipient) {
      setError("Choose your call and the resident you want to ask.");
      return;
    }

    if (selectedMyCallRequest) {
      setError("You already have a pending request for this call.");
      return;
    }

    if (!resolvedSelectedMyCall?.id) {
      setError(
        "Your selected call could not be resolved. Please try clicking the calendar cell again."
      );
      return;
    }

    const payload: CreateSwapRequestInput = {
      programId,
      requesterRosterId: currentRosterId,
      recipientRosterId: selectedRecipient.rosterId,
      requesterCallId: resolvedSelectedMyCall.id,
      recipientCallId: resolvedSelectedRecipientCall?.id ?? null,
      requestType: derivedRequestType,
      requesterNote: note.trim() || null,
    };

    if (isDev()) {
      // [change-my-call-submit] — payload-focused log kept for backward compat
      console.info("[change-my-call-submit]", {
        selectedMyCallId,
        selectedRecipientRosterId,
        selectedRecipientCallId,
        requestType: derivedRequestType,
        modalCallsCount: modalCalls.length,
        myCallsCount: myCalls.length,
        firstFewCallIds: modalCalls.slice(0, 5).map((call) => ({
          id: call.id,
          callDate: call.callDate,
          residentName: call.residentName,
        })),
        selectedMyCallFoundInMyCalls: Boolean(
          myCalls.find((call) => call.id === selectedMyCallId)
        ),
        selectedMyCallFoundInCalls: Boolean(
          modalCalls.find((call) => call.id === selectedMyCallId)
        ),
        selectedRecipientCallFoundInCalls: Boolean(
          modalCalls.find((call) => call.id === selectedRecipientCallId)
        ),
        payload,
      });
    }

    try {
      await createRequest(payload);

      setSuccessMessage("You’ll be notified when they respond.");
      setHelperMessage(null);
      await onCreated?.();
    } catch {
      // Hook stores the error.
    }
  }

  function handleClose() {
    if (loading) return;
    onClose();
  }

  function handleCallClick(call: ProgramCallItem) {
    const rosterId = getRosterId(call);
    const isMyCall = call.isMine && rosterId === effectiveRosterId;
    const latestRequest = outgoingRequestsByCallId.get(call.id) ?? null;
    const hasActiveRequest = latestRequest
      ? ACTIVE_REQUEST_STATUSES.has(latestRequest.status)
      : false;

    setError(null);

    if (isMyCall) {
      if (hasActiveRequest) {
        setHelperMessage("You already have a pending request for this call.");
        return;
      }

      if (selectedMyCallId === call.id) {
        setSelectedMyCallId(null);
        setSelectedMyCallSnapshot(null);
        setSelectedRecipientRosterId(null);
        setSelectedRecipientCallId(null);
        setSelectedRecipientCallSnapshot(null);
        setHelperMessage("First, choose one of your calls.");
        return;
      }

      setSelectedMyCallId(call.id);
      setSelectedMyCallSnapshot(call);
      setHelperMessage(
        "Now choose: ask someone to cover, or click another resident’s shift to request a swap."
      );
      return;
    }

    if (!selectedMyCallId) {
      setHelperMessage("Choose one of your calls first.");
      return;
    }

    if (!rosterId || rosterId === effectiveRosterId || !eligibleRecipientIds.has(rosterId)) {
      setHelperMessage("Choose another resident to ask for coverage.");
      return;
    }

    if (selectedRecipientCallId === call.id) {
      setSelectedRecipientRosterId(null);
      setSelectedRecipientCallId(null);
      setSelectedRecipientCallSnapshot(null);
      setHelperMessage("Recipient cleared. Choose another resident to ask.");
      return;
    }

    setSelectedRecipientRosterId(rosterId);
    setSelectedRecipientCallId(call.id);
    setSelectedRecipientCallSnapshot(call);
    setHelperMessage(null);
  }

  function shiftVisibleMonth(offset: number) {
    setSelectedMyCallId(null);
    setSelectedMyCallSnapshot(null);
    setSelectedRecipientRosterId(null);
    setSelectedRecipientCallId(null);
    setSelectedRecipientCallSnapshot(null);
    setHelperMessage(null);
    setError(null);
    const nextDate = new Date(visibleYear, visibleMonthIndex + offset, 1);
    setVisibleYear(nextDate.getFullYear());
    setVisibleMonthIndex(nextDate.getMonth());
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[170] bg-slate-950/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleClose}
          />

          <motion.div
            className="fixed inset-x-0 top-1/2 z-[180] mx-auto w-full max-w-7xl -translate-y-1/2 px-4"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
          >
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-2xl">
              <div className="border-b border-slate-200 px-5 py-5 md:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
                      Change my call
                    </div>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">
                      Change My Call
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                      Pick your call, then pick the resident you want to ask.
                      Choose a resident from the list for coverage-only, or click
                      one of their shifts to request a true trade. The schedule
                      only changes if they accept and an admin approves.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="max-h-[80vh] overflow-y-auto overflow-x-hidden">
                {successMessage ? (
                  <div className="max-h-[85vh] overflow-y-auto px-5 py-5 md:px-6">
                    <div className="mx-auto max-w-2xl space-y-4">
                      <div className="rounded-[1.5rem] border border-emerald-200 bg-emerald-50 px-5 py-5 text-emerald-900">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="mt-0.5 h-5 w-5" />
                          <div>
                            <p className="text-lg font-bold">Request sent</p>
                            <p className="mt-1 text-sm leading-6">
                              {successMessage}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-700">
                        <p className="font-semibold text-slate-900">My call</p>
                        <p className="mt-1">{getCallLabel(selectedMyCall)}</p>
                        <p className="mt-3 font-semibold text-slate-900">Asking</p>
                        <p className="mt-1">
                          {selectedRecipient?.displayName ?? "Resident selected"}
                        </p>
                      </div>

                      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                        <Link
                          href="/work/call/swaps"
                          onClick={handleClose}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View swap requests
                        </Link>
                        <button
                          type="button"
                          onClick={handleClose}
                          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                        >
                          Close
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 p-5 md:p-6">
                    <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-4 text-sm text-sky-900">
                      <p className="font-semibold">
                        First choose one of your calls. Then either pick a resident to cover it, or click another resident’s shift to request a swap.
                      </p>
                      <p className="mt-1 leading-6">
                        Use the coverage picker for direct coverage only. Use the calendar when you want to trade with a specific shift.
                      </p>
                    </div>

                    {helperMessage ? (
                      <div className="rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                        {helperMessage}
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                            <CalendarDays className="h-4 w-4 text-sky-600" />
                            {monthLabel(visibleYear, visibleMonthIndex)}
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => shiftVisibleMonth(-1)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => shiftVisibleMonth(1)}
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50"
                            >
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="mt-4 min-w-0">
                          {isLoadingModalMonth ? (
                            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-10 text-center">
                              <Loader2 className="mx-auto h-8 w-8 animate-spin text-slate-400" />
                              <p className="mt-3 text-sm font-semibold text-slate-800">
                                Loading month schedule
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Fetching calls for {monthLabel(visibleYear, visibleMonthIndex)}.
                              </p>
                            </div>
                          ) : modalMonthError ? (
                            <div className="rounded-[1.5rem] border border-rose-200 bg-rose-50 px-5 py-8 text-center text-rose-800">
                              <p className="text-sm font-semibold">
                                Could not load this month’s call schedule.
                              </p>
                              <p className="mt-1 text-sm">
                                {modalMonthError}
                              </p>
                            </div>
                          ) : myCalls.length === 0 ? (
                            <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                              <UserRound className="mx-auto h-8 w-8 text-slate-400" />
                              <p className="mt-3 text-sm font-semibold text-slate-800">
                                No assigned calls are available in this calendar view
                              </p>
                              <p className="mt-1 text-sm text-slate-500">
                                Move to a month with your scheduled calls on the main
                                call page, then reopen Change My Call.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              <div className="grid grid-cols-7 gap-1">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                                  (day) => (
                                    <div
                                      key={day}
                                      className="py-1 text-center text-[9px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                                    >
                                      {day}
                                    </div>
                                  )
                                )}
                              </div>

                              <div className="space-y-1">
                                {weeks.map((week, weekIndex) => (
                                  <div
                                    key={`change-my-call-week-${weekIndex}`}
                                    className="grid grid-cols-7 gap-1"
                                  >
                                    {week.map((date) => {
                                      const dateKey = toDateKey(date);
                                      const inMonth = isSameMonth(
                                        date,
                                        visibleYear,
                                        visibleMonthIndex
                                      );
                                      const dayCalls = callsByDate.get(dateKey) ?? [];

                                      return (
                                        <div
                                          key={dateKey}
                                          className={`min-h-[108px] rounded-[0.9rem] border px-1 py-1 ${
                                            inMonth
                                              ? "border-slate-200 bg-white"
                                              : "border-transparent bg-slate-50/60"
                                          }`}
                                        >
                                          <div className="flex items-start justify-between gap-1">
                                            <span
                                              className={`text-[10px] font-semibold ${
                                                inMonth
                                                  ? "text-slate-700"
                                                  : "text-slate-300"
                                              }`}
                                            >
                                              {date.getDate()}
                                            </span>
                                          </div>

                                          <div className="mt-1 space-y-1">
                                            {dayCalls.map((call) => {
                                              const rosterId = getRosterId(call);
                                              const isMyCall =
                                                call.isMine && rosterId === currentRosterId;
                                              const latestRequest =
                                                outgoingRequestsByCallId.get(call.id) ??
                                                null;
                                              const hasActiveRequest = latestRequest
                                                ? ACTIVE_REQUEST_STATUSES.has(
                                                    latestRequest.status
                                                  )
                                                : false;
                                              const isRecipientOption =
                                                !isMyCall &&
                                                rosterId !== null &&
                                                eligibleRecipientIds.has(rosterId);
                                              const isSelectedMyCall =
                                                selectedMyCallId === call.id;
                                              const isSelectedRecipient =
                                                selectedRecipientCallId === call.id ||
                                                (!selectedRecipientCallId &&
                                                  rosterId === selectedRecipientRosterId &&
                                                  selectedRecipientRosterId !== null);

                                              return (
                                                <button
                                                  key={call.id}
                                                  type="button"
                                                  onClick={() => handleCallClick(call)}
                                                  className={`w-full rounded-lg border px-1.5 py-1 text-left transition ${
                                                    isSelectedMyCall
                                                      ? "border-sky-500 bg-sky-100 shadow-sm"
                                                      : isSelectedRecipient
                                                      ? "border-violet-400 bg-violet-50 shadow-sm"
                                                      : isMyCall
                                                      ? hasActiveRequest
                                                        ? "border-amber-200 bg-amber-50"
                                                        : "border-sky-200 bg-sky-50 hover:border-sky-300"
                                                      : isRecipientOption
                                                      ? "border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/60"
                                                      : "border-slate-200 bg-slate-50 text-slate-500 opacity-80"
                                                  }`}
                                                >
                                                  <div className="flex items-center gap-1">
                                                    <p className="truncate text-[10px] font-bold text-slate-900">
                                                      {getResidentLastName(call.residentName)}
                                                    </p>
                                                  </div>

                                                  <p className="mt-0.5 truncate text-[10px] text-slate-700">
                                                    {call.callType ?? "Call"}
                                                  </p>
                                                  {getCompactCallMeta(call) ? (
                                                    <p className="mt-0.5 truncate text-[9px] text-slate-500">
                                                      {getCompactCallMeta(call)}
                                                    </p>
                                                  ) : null}

                                                  <div className="mt-1 flex flex-wrap gap-1">
                                                    {isSelectedMyCall ? (
                                                      <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                                        Selected
                                                      </span>
                                                    ) : null}
                                                    {isSelectedRecipient ? (
                                                      <span className="rounded-full bg-violet-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                                                        Swap
                                                      </span>
                                                    ) : null}
                                                    {!isSelectedMyCall &&
                                                    !isSelectedRecipient &&
                                                    isMyCall ? (
                                                      <span className="rounded-full bg-sky-100 px-1.5 py-0.5 text-[9px] font-bold text-sky-800">
                                                        Mine
                                                      </span>
                                                    ) : null}
                                                    {hasActiveRequest && latestRequest ? (
                                                      <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[9px] font-bold text-amber-800">
                                                        Pending
                                                      </span>
                                                    ) : null}
                                                  </div>
                                                </button>
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
                          )}
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="rounded-[1.25rem] border border-slate-200 bg-white px-3.5 py-3 shadow-sm xl:sticky xl:top-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                            Coverage only
                          </p>
                          <p className="mt-1 text-sm font-semibold text-slate-900">
                            Ask someone to cover
                          </p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            Choose a resident here for coverage only. No return shift.
                          </p>
                          <div className="mt-3 max-h-[320px] overflow-y-auto">
                            <RecipientPicker
                              recipients={eligibleRecipients}
                              selectedRosterId={selectedRecipientCallId ? null : selectedRecipientRosterId}
                              onSelect={(rosterId) => {
                                setSelectedRecipientRosterId(rosterId);
                                setSelectedRecipientCallId(null);
                                setSelectedRecipientCallSnapshot(null);
                                setHelperMessage(null);
                                setError(null);
                              }}
                              filteredOutCount={filteredOutRecipientCount}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-sky-700">
                            {selectedModeLabel}
                          </p>
                          <h3 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">
                            Review and send
                          </h3>
                          <p className="mt-1.5 text-sm leading-5 text-slate-600">
                            {!selectedMyCall
                              ? "Pick one of your calls to get started."
                              : !selectedRecipient
                              ? "Choose a resident to cover, or click a shift to swap."
                              : requestMode === "trade"
                              ? "This request swaps two specific calls if the other resident accepts and an admin approves."
                              : "This request asks another resident to take your selected call. No return shift is involved."}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <ProgressPill
                            step={1}
                            label="My call"
                            active={!selectedMyCall}
                            done={Boolean(selectedMyCall)}
                          />
                          <ProgressPill
                            step={2}
                            label="Coverage or swap"
                            active={Boolean(selectedMyCall) && !selectedRecipient}
                            done={Boolean(selectedRecipient)}
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                        <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-3.5 py-3">
                          <p className="text-sm font-semibold text-slate-900">
                            Selected call
                          </p>
                          {!selectedMyCall ? (
                            <p className="mt-2 text-sm text-slate-600">
                              Pick one of your calls first.
                            </p>
                          ) : (
                            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">
                                {getCallLabel(selectedMyCall)}
                              </p>
                              <p>You currently own this call.</p>
                            </div>
                          )}
                        </div>

                        <div className="rounded-[1.15rem] border border-slate-200 bg-slate-50 px-3.5 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-slate-900">
                              Preview
                            </p>
                            {requestMode ? (
                              <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600 ring-1 ring-slate-200">
                                {requestMode === "trade" ? "Swap" : "Coverage"}
                              </span>
                            ) : null}
                          </div>
                          {!selectedMyCall ? (
                            <div className="mt-2 space-y-1 text-sm text-slate-600">
                              <p>Pick one of your calls first.</p>
                            </div>
                          ) : !selectedRecipient ? (
                            <div className="mt-2 space-y-1 text-sm text-slate-600">
                              <p>Choose a resident to cover, or click another resident’s shift to swap.</p>
                            </div>
                          ) : requestMode === "trade" && selectedRecipientCall ? (
                            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">Swap request</p>
                              <p>
                                {selectedRecipient.displayName} takes your call on{" "}
                                {formatShortDate(selectedMyCall?.callDate)}.
                              </p>
                              <p>
                                You take their call on{" "}
                                {formatShortDate(selectedRecipientCall.callDate)}.
                              </p>
                              <p className="font-medium text-slate-900">
                                Both calls exchange owners if approved.
                              </p>
                            </div>
                          ) : (
                            <div className="mt-2 space-y-1.5 text-sm text-slate-700">
                              <p className="font-semibold text-slate-900">Coverage request</p>
                              <p>
                                {selectedRecipient.displayName} takes your call on{" "}
                                {formatShortDate(selectedMyCall?.callDate)}.
                              </p>
                              <p>You give up this call.</p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="mt-4">
                        <label className="mb-2 block text-sm font-semibold text-slate-900">
                          Optional note
                        </label>
                        <textarea
                          value={note}
                          onChange={(event) => setNote(event.target.value)}
                          placeholder="Anything they should know about this request?"
                          className="min-h-[82px] w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        />
                      </div>

                      {selectedMyCallRequest ? (
                        <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                          <p className="font-semibold">Active request already exists</p>
                          <p className="mt-0.5">
                            {selectedMyCallRequest.status === "accepted_pending_admin"
                              ? "This call has a swap request awaiting admin approval."
                              : "This call has a swap request pending the other resident's response."}{" "}
                            <Link
                              href="/work/call/swaps"
                              onClick={handleClose}
                              className="underline underline-offset-2 hover:text-amber-900"
                            >
                              View swap requests
                            </Link>{" "}
                            to cancel it before sending a new one.
                          </p>
                        </div>
                      ) : null}

                      {error ? (
                        <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                          {error}
                        </div>
                      ) : null}

                      <div className="mt-4 flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={handleSubmit}
                          disabled={!canSubmit || loading}
                          className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Sending...
                            </>
                          ) : (
                            sendButtonLabel
                          )}
                        </button>
                        {!canSubmit ? (
                          <p className="text-center text-sm text-slate-500">
                            {!selectedMyCall
                              ? "Choose your call first."
                              : selectedMyCallRequest
                              ? "Cancel the existing active request first, then send a new one."
                              : !selectedRecipient
                              ? "Choose a resident to cover, or click a shift to swap."
                              : "Complete your selections to continue."}
                          </p>
                        ) : null}

                        <Link
                          href="/work/call/swaps"
                          onClick={handleClose}
                          className="text-center text-sm font-semibold text-slate-500 transition hover:text-slate-900"
                        >
                          View all swap requests
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
