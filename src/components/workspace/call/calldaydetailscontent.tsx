"use client";

import React, { useState } from "react";
import { Home, MapPin, PhoneCall, StickyNote, UserRound } from "lucide-react";
import { useAdminSwapDecision } from "@/hooks/useAdminSwapDecision";
import SwapRequestStatusBadge from "@/components/workspace/call-swaps/SwapRequestStatusBadge";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";

export type ProgramCallItem = {
  id: string;
  membershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  classYear: number | null;
  userId: string | null;
  callType: string | null;
  callDate: string | null;
  startDatetime: string | null;
  endDatetime: string | null;
  site: string | null;
  isHomeCall: boolean | null;
  notes: string | null;
  isMine: boolean;
};

function isBuddyCall(call: ProgramCallItem) {
  return call.callType?.toLowerCase() === "buddy";
}

function getCallTone(call: ProgramCallItem) {
  if (isBuddyCall(call)) {
    return {
      card: call.isMine ? "border-violet-300 bg-violet-50" : "border-violet-200 bg-violet-50/60",
      chip: "bg-violet-600 text-white",
      text: "text-violet-950",
    };
  }

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

function formatCallTypeLabel(callType: string | null, allCallsForDay: ProgramCallItem[]): string {
  if (!callType) return "Call";
  const ct = callType.toLowerCase();
  if (ct === "buddy") {
    const primary = allCallsForDay.find((c) => c.callType?.toLowerCase() === "primary");
    if (primary) return `Buddy Call with ${primary.residentName}`;
    return "Buddy Call";
  }
  if (ct === "primary") return "Primary Call";
  if (ct === "backup") return "Backup Call";
  return callType;
}

type Props = {
  calls: ProgramCallItem[];
  pendingSwapRequestsByCallId?: Map<string, SwapRequestListItem>;
  canApprovePendingRequests?: boolean;
  onPendingRequestUpdated?: () => void | Promise<void>;
  onViewPendingRequest?: (requestId: string) => void;
};

export default function CallDayDetailsContent({
  calls,
  pendingSwapRequestsByCallId,
  canApprovePendingRequests = false,
  onPendingRequestUpdated,
  onViewPendingRequest,
}: Props) {
  const adminDecision = useAdminSwapDecision();
  const [adminNoteByRequestId, setAdminNoteByRequestId] = useState<Record<string, string>>({});
  const [messageByRequestId, setMessageByRequestId] = useState<Record<string, string>>({});
  const [errorRequestId, setErrorRequestId] = useState<string | null>(null);

  async function handleAdminDecision(
    request: SwapRequestListItem,
    decision: "approve" | "reject"
  ) {
    try {
      adminDecision.setError(null);
      setErrorRequestId(null);
      setMessageByRequestId((current) => ({ ...current, [request.id]: "" }));

      await adminDecision.decide({
        requestId: request.id,
        decision,
        note: adminNoteByRequestId[request.id]?.trim() || null,
      });

      setMessageByRequestId((current) => ({
        ...current,
        [request.id]:
          decision === "approve"
            ? "Approved. The call was officially reassigned."
            : "Rejected. The current schedule stays unchanged.",
      }));

      await onPendingRequestUpdated?.();
    } catch {
      setErrorRequestId(request.id);
      // hook stores the message
    }
  }

  if (calls.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
        No calls scheduled for this day.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {calls.map((call) => {
        const tone = getCallTone(call);
        const pendingRequest = pendingSwapRequestsByCallId?.get(call.id) ?? null;
        const isLoading = adminDecision.loadingRequestId === pendingRequest?.id;
        const statusMessage = pendingRequest ? messageByRequestId[pendingRequest.id] : "";
        const isBuddy = isBuddyCall(call);

        return (
          <div
            key={call.id}
            className={`rounded-[1.5rem] border p-4 shadow-sm ${tone.card}`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-base font-bold ${tone.text}`}>
                  {call.residentName}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {formatCallTypeLabel(call.callType, calls)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isBuddy ? (
                  <span className="rounded-full bg-violet-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-violet-700 ring-1 ring-violet-200">
                    Buddy
                  </span>
                ) : null}

                {call.isMine ? (
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${tone.chip}`}>
                    Mine
                  </span>
                ) : null}

                {call.trainingLevel ? (
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                    {call.trainingLevel}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <MapPin className="h-3.5 w-3.5" />
                  Site
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {call.site || "No site listed"}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <Home className="h-3.5 w-3.5" />
                  Coverage
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {call.isHomeCall ? "Home call" : "In-house / standard"}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <PhoneCall className="h-3.5 w-3.5" />
                  Call Type
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {call.callType || "Not specified"}
                </p>
              </div>

              <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <UserRound className="h-3.5 w-3.5" />
                  Resident
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {call.residentName}
                </p>
              </div>
            </div>

            {call.notes ? (
              <div className="mt-4 rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                  <StickyNote className="h-3.5 w-3.5" />
                  Notes
                </p>
                <p className="mt-1 text-sm text-slate-700">{call.notes}</p>
              </div>
            ) : null}

            {pendingRequest ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 ring-1 ring-amber-200/70">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-amber-700">
                      Pending coverage request
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {(pendingRequest.requester?.fullName ?? call.residentName)} {"->"}{" "}
                      {pendingRequest.recipient?.fullName ?? "Unknown"}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      The schedule will not change until you approve this request.
                    </p>
                  </div>

                  <SwapRequestStatusBadge status={pendingRequest.status} />
                </div>

                {pendingRequest.requester_note ? (
                  <div className="mt-3 rounded-lg bg-white/80 px-3 py-3 ring-1 ring-amber-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Requester note
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {pendingRequest.requester_note}
                    </p>
                  </div>
                ) : null}

                {pendingRequest.recipient_note ? (
                  <div className="mt-3 rounded-lg bg-white/80 px-3 py-3 ring-1 ring-amber-200/70">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                      Recipient note
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {pendingRequest.recipient_note}
                    </p>
                  </div>
                ) : null}

                {canApprovePendingRequests ? (
                  <div className="mt-3 space-y-3 rounded-lg bg-white/80 px-3 py-3 ring-1 ring-amber-200/70">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-900">
                        Optional admin note
                      </label>
                      <textarea
                        value={adminNoteByRequestId[pendingRequest.id] ?? ""}
                        onChange={(event) =>
                          setAdminNoteByRequestId((current) => ({
                            ...current,
                            [pendingRequest.id]: event.target.value,
                          }))
                        }
                        placeholder="Add context for the requester and recipient"
                        className="min-h-[88px] w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      />
                    </div>

                    {statusMessage ? (
                      <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                        {statusMessage}
                      </div>
                    ) : null}

                    {adminDecision.error && errorRequestId === pendingRequest.id ? (
                      <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                        {adminDecision.error}
                      </div>
                    ) : null}

                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
                      {onViewPendingRequest ? (
                        <button
                          type="button"
                          onClick={() => onViewPendingRequest(pendingRequest.id)}
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View full request
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => handleAdminDecision(pendingRequest, "reject")}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? "Working..." : "Reject"}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAdminDecision(pendingRequest, "approve")}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? "Working..." : "Approve change"}
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
