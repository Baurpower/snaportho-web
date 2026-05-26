"use client";

import React, { useMemo } from "react";
import { ClipboardCheck } from "lucide-react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import SwapRequestStatusBadge from "./SwapRequestStatusBadge";

// ---------------------------------------------------------------------------
// Compact, selectable admin approval queue (narrow left panel).
//
// This component is a pure selector list — approve / reject actions live in
// AdminApprovalWorkspace (the wide right panel).
//
// Design intent: ~280px wide, minimal vertical footprint, "select quickly"
// not "read deeply". Cards show only requester↔recipient, date, type, status.
// ---------------------------------------------------------------------------

function formatShortDate(dateString: string | null | undefined): string {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function getResidentLastName(fullName: string | null | undefined): string {
  if (!fullName) return "Unknown";
  const parts = fullName.trim().split(/\s+/);
  return parts[parts.length - 1] ?? fullName;
}

function getQueueRowSummary(request: SwapRequestListItem): string {
  const requesterLast = getResidentLastName(request.requester?.fullName);
  const recipientLast = getResidentLastName(request.recipient?.fullName);
  const isTrade = request.request_type === "trade" && !!request.recipientCall;
  return isTrade
    ? `${requesterLast} ↔ ${recipientLast}`
    : `${requesterLast} → ${recipientLast}`;
}

function CompactQueueRow({
  request,
  selected,
  onSelect,
}: {
  request: SwapRequestListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const callDate = formatShortDate(request.requesterCall?.callDate);
  const callType = request.requesterCall?.callType ?? "Call";
  const summary = getQueueRowSummary(request);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-[1rem] border px-2.5 py-2 text-left transition ${
        selected
          ? "border-blue-300 bg-blue-50 ring-2 ring-blue-100"
          : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
      }`}
    >
      <div className="flex items-start justify-between gap-1.5">
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-slate-950">
            {callDate} &middot; {callType}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-slate-500">{summary}</p>
        </div>
        <SwapRequestStatusBadge status={request.status} />
      </div>
      {request.requesterCall?.site ? (
        <p className="mt-1 truncate text-[9px] text-slate-400">
          {request.requesterCall.site}
        </p>
      ) : null}
    </button>
  );
}

export default function AdminSwapApprovalQueue({
  requests,
  selectedRequestId,
  onSelectRequest,
}: {
  requests: SwapRequestListItem[];
  currentRosterId: string | null;
  selectedRequestId?: string | null;
  onSelectRequest?: (requestId: string) => void;
  onViewDetails?: (requestId: string) => void;
}) {
  const sortedRequests = useMemo(
    () =>
      [...requests].sort((a, b) =>
        (a.requesterCall?.callDate ?? "").localeCompare(
          b.requesterCall?.callDate ?? ""
        )
      ),
    [requests]
  );

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-3 shadow-sm">
      {/* Compact header */}
      <div className="flex items-center gap-2 px-0.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ClipboardCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
            Approval queue
          </p>
          <p className="truncate text-sm font-bold text-slate-950">
            {sortedRequests.length === 0
              ? "No pending requests"
              : `${sortedRequests.length} awaiting review`}
          </p>
        </div>
      </div>

      {/* Queue list */}
      <div className="mt-3 max-h-[60vh] space-y-1.5 overflow-y-auto pr-0.5">
        {sortedRequests.length === 0 ? (
          <div className="rounded-[1rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
            No swaps awaiting approval.
          </div>
        ) : (
          sortedRequests.map((request) => (
            <CompactQueueRow
              key={request.id}
              request={request}
              selected={selectedRequestId === request.id}
              onSelect={() => onSelectRequest?.(request.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
