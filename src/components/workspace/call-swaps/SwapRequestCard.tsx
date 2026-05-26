"use client";

import React from "react";
import {
  CalendarDays,
  MessageSquareText,
  MoveRight,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import SwapRequestStatusBadge from "./SwapRequestStatusBadge";
import type {
  SwapRequestListItem,
} from "@/lib/workspace/call-swaps/types";

function formatCallDate(dateString: string | null | undefined) {
  if (!dateString) return "Date unavailable";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getCoverageLine(
  request: SwapRequestListItem,
  currentRosterId: string | null
) {
  const requesterName = request.requester?.fullName ?? "Unknown resident";
  const recipientName = request.recipient?.fullName ?? "Unknown resident";

  if (request.recipient?.id === currentRosterId) {
    return `You take ${request.requesterCall?.callType ?? "Call"} on ${formatCallDate(
      request.requesterCall?.callDate
    )}.`;
  }

  if (request.requester?.id === currentRosterId) {
    return `${recipientName} takes ${request.requesterCall?.callType ?? "Call"} on ${formatCallDate(
      request.requesterCall?.callDate
    )}.`;
  }

  return `${recipientName} covers ${requesterName}'s call.`;
}

function getRequestHeadline(
  request: SwapRequestListItem,
  currentRosterId: string | null
) {
  const requesterName = request.requester?.fullName ?? "Unknown resident";
  const recipientName = request.recipient?.fullName ?? "Unknown resident";

  if (request.request_type === "trade" && request.recipient?.id === currentRosterId) {
    return `${requesterName} wants to swap calls with you`;
  }

  if (request.request_type === "trade") {
    return request.requester?.id === currentRosterId
      ? `You asked ${recipientName} to swap calls`
      : `${requesterName} wants to swap calls with you`;
  }

  return request.requester?.id === currentRosterId
    ? `You asked ${recipientName} to cover ${formatCallDate(
        request.requesterCall?.callDate
      )}`
    : `${requesterName} wants coverage for ${formatCallDate(
        request.requesterCall?.callDate
      )}`;
}

function getScheduleImpact(request: SwapRequestListItem) {
  const isTrade = request.request_type === "trade" && request.recipientCall;
  if (request.status === "approved") {
    return isTrade
      ? "Both call assignments were updated after admin approval."
      : "Schedule updated after admin approval.";
  }

  if (request.status === "declined" || request.status === "rejected") {
    return "No schedule change occurred.";
  }

  if (request.status === "cancelled" || request.status === "expired") {
    return "Request ended without a schedule change.";
  }

  return "The schedule does not change until admin approval.";
}

function ResidentChangePreview({
  request,
  currentRosterId,
}: {
  request: SwapRequestListItem;
  currentRosterId: string | null;
}) {
  const requesterName = request.requester?.fullName ?? "Unknown resident";
  const recipientName = request.recipient?.fullName ?? "Unknown resident";
  const isTrade = request.request_type === "trade" && request.recipientCall;
  const isIncoming = request.recipient?.id === currentRosterId;

  const firstLineLabel = isIncoming ? "You take" : `${recipientName} takes`;
  const coverageTransferLine = isIncoming
    ? `${requesterName} gives up this call.`
    : "You give up this call.";
  const firstLineValue = `${formatCallDate(
    request.requesterCall?.callDate
  )} — ${request.requesterCall?.callType ?? "Call"}`;
  const secondLineValue = isTrade
    ? isIncoming
      ? `${requesterName} takes your shift on: ${formatCallDate(
          request.recipientCall?.callDate
        )} — ${request.recipientCall?.callType ?? "Call"}`
      : `You take their shift on: ${formatCallDate(
          request.recipientCall?.callDate
        )} — ${request.recipientCall?.callType ?? "Call"}`
    : "No return shift selected. This is a coverage request only.";

  return (
    <div
      className={`mt-4 rounded-[1.35rem] border px-4 py-4 ${
        isTrade
          ? "border-violet-200 bg-violet-50"
          : "border-sky-200 bg-sky-50"
      }`}
    >
      <p
        className={`text-xs font-semibold uppercase tracking-[0.12em] ${
          isTrade ? "text-violet-700" : "text-sky-700"
        }`}
      >
        Requested change
      </p>
      <div className="mt-3 space-y-3">
        <div className="rounded-[1.15rem] border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {firstLineLabel}
          </p>
          <p className="mt-2 text-base font-black tracking-tight text-slate-950">
            {firstLineValue}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {request.requesterCall?.isHomeCall
              ? "Home Call"
              : request.requesterCall?.site ?? "No service/site listed"}
          </p>
          {!isTrade ? (
            <p className="mt-2 text-xs font-medium text-slate-600">
              {coverageTransferLine}
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.15rem] border border-slate-200 bg-white px-3 py-3 shadow-sm">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {isTrade ? "They cover" : "Return shift"}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {secondLineValue}
          </p>
        </div>
      </div>
    </div>
  );
}

function getActionNeeded(
  request: SwapRequestListItem,
  currentRosterId: string | null
) {
  if (request.status === "pending_recipient" && request.recipient?.id === currentRosterId) {
    return request.request_type === "trade" && request.recipientCall
      ? "Can you trade calls?"
      : "Can you cover this call?";
  }

  if (request.status === "pending_recipient") {
    return "Waiting for recipient response";
  }

  if (request.status === "accepted_pending_admin") {
    return "Accepted - awaiting admin approval";
  }

  if (request.status === "approved") {
    return "Official schedule updated after approval";
  }

  if (request.status === "declined") {
    return "Recipient declined this request";
  }

  if (request.status === "rejected") {
    return "Admin rejected this request";
  }

  if (request.status === "cancelled") {
    return "Request was cancelled";
  }

  return "Request expired before it was completed";
}

function getWhatHappensNext(request: SwapRequestListItem) {
  if (
    request.status === "pending_recipient" ||
    request.status === "accepted_pending_admin"
  ) {
    return request.request_type === "trade" && request.recipientCall
      ? "If accepted, this swap goes to an admin for approval before the schedule changes."
      : "If accepted, this goes to an admin for approval before the schedule changes.";
  }

  return getScheduleImpact(request);
}

export default function SwapRequestCard({
  request,
  currentRosterId,
  actions,
  onViewDetails,
  selected = false,
  variant = "default",
}: {
  request: SwapRequestListItem;
  currentRosterId: string | null;
  actions?: React.ReactNode;
  onViewDetails?: (requestId: string) => void;
  selected?: boolean;
  variant?: "default" | "resident";
}) {
  const notePreview =
    request.requester_note ?? request.recipient_note ?? request.admin_note ?? null;
  const isResidentVariant = variant === "resident";

  return (
    <div
      className={`rounded-[1.5rem] border bg-white p-4 shadow-sm ${
        selected ? "border-sky-300 ring-2 ring-sky-100" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {request.request_type === "coverage_only"
              ? "Coverage request"
              : "Swap request"}
          </p>
          <h3 className="mt-1 text-lg font-bold tracking-tight text-slate-950">
            {isResidentVariant
              ? getRequestHeadline(request, currentRosterId)
              : `${request.requesterCall?.callType ?? "Call"} • ${formatCallDate(
                  request.requesterCall?.callDate
                )}`}
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            {isResidentVariant
              ? request.request_type === "trade"
                ? "Review the proposed schedule exchange below."
                : "Review the proposed schedule change below."
              : request.requesterCall?.site ?? "No service/site listed"}
          </p>
        </div>

        <SwapRequestStatusBadge status={request.status} />
      </div>

      {isResidentVariant ? (
        <ResidentChangePreview
          request={request}
          currentRosterId={currentRosterId}
        />
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            {request.request_type === "trade"
              ? "Proposed swap"
              : "Proposed coverage change"}
          </p>
          <p className="mt-1 text-sm font-semibold text-slate-900">
            {(request.recipient?.fullName ?? "Unknown resident")} covers{" "}
            {(request.requester?.fullName ?? "Unknown resident")}&apos;s call
          </p>
          <p className="mt-1 text-sm text-slate-700">
            {getCoverageLine(request, currentRosterId)}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {request.requesterCall?.isHomeCall
              ? "Home call"
              : request.requesterCall?.site ?? "No service/site listed"}
          </p>
        </div>
      )}

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <UserRound className="h-3.5 w-3.5" />
            Who is asking
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {request.requester?.fullName ?? "Unknown"}
          </p>
        </div>

        <div className="rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <MoveRight className="h-3.5 w-3.5" />
            Who would cover
          </p>
          <p className="mt-1 text-sm font-medium text-slate-800">
            {request.recipient?.fullName ?? "Unknown"}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <CalendarDays className="h-3.5 w-3.5" />
          What happens next
        </p>
        <p className="mt-1 text-sm text-slate-700">
          {isResidentVariant
            ? getWhatHappensNext(request)
            : getActionNeeded(request, currentRosterId)}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5" />
          Schedule impact
        </p>
        <p className="mt-1 text-sm text-slate-700">{getScheduleImpact(request)}</p>
      </div>

      {notePreview ? (
        <div className="mt-4 rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
          <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            <MessageSquareText className="h-3.5 w-3.5" />
            Note preview
          </p>
          <p className="mt-1 line-clamp-3 text-sm text-slate-700">{notePreview}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {actions}
        {onViewDetails ? (
          <button
            type="button"
            onClick={() => onViewDetails(request.id)}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View details
          </button>
        ) : null}
      </div>
    </div>
  );
}
