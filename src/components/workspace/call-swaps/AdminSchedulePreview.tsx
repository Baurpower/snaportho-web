"use client";

import React from "react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import { formatShortDate, getStatusColorTone, getToneClasses } from "@/lib/workspace/call-swaps/calendar-overlay-utils";

// ---------------------------------------------------------------------------
// Neutral admin schedule change preview
//
// Intentionally uses third-party language — no "you", no "your".
// Coverage:  "If approved: Gupta takes Rosevear's Jun 15 Primary."
// Trade:     "If approved: Walsh takes Rosevear's Jun 15 Primary;
//             Rosevear takes Walsh's Jun 3 Primary."
//
// When previewMode === "preview" and the request is still accepted_pending_admin,
// a small hint line indicates this request is included in the projected schedule.
// ---------------------------------------------------------------------------

export default function AdminSchedulePreview({
  request,
  previewMode = "current",
}: {
  request: SwapRequestListItem | null;
  previewMode?: "current" | "preview";
}) {
  if (!request) {
    return (
      <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
        Select a request to preview the schedule change.
      </div>
    );
  }

  const requesterName = request.requester?.fullName ?? "Unknown resident";
  const recipientName = request.recipient?.fullName ?? "Unknown resident";
  const isTrade = request.request_type === "trade" && !!request.recipientCall;

  const previewTone = getStatusColorTone(request.status);
  const toneClasses = getToneClasses(previewTone, false);

  const requesterCallLabel = `${formatShortDate(
    request.requesterCall?.callDate
  )} — ${request.requesterCall?.callType ?? "Call"}`;

  const recipientCallLabel = isTrade
    ? `${formatShortDate(request.recipientCall?.callDate)} — ${
        request.recipientCall?.callType ?? "Call"
      }`
    : null;

  const isIncludedInPreview =
    previewMode === "preview" &&
    request.status === "accepted_pending_admin";

  return (
    <div className={`rounded-[1.15rem] border bg-white px-3.5 py-3 ${toneClasses.card}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`h-2.5 w-2.5 rounded-full ${toneClasses.strip}`} />
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
          {request.status === "accepted_pending_admin"
            ? "If approved"
            : request.status === "approved"
            ? "Approved change"
            : "Schedule preview"}
        </p>
      </div>

      <div className="mt-2.5 space-y-2">
        {/* Coverage leg: recipient takes requester's call */}
        <div className="flex items-start gap-2">
          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${toneClasses.strip}`} />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-950">
              {recipientName} takes {requesterName}&apos;s {requesterCallLabel}
            </p>
            {!isTrade ? (
              <p className="mt-0.5 text-xs text-slate-500">
                No return shift — coverage only.
              </p>
            ) : null}
          </div>
        </div>

        {/* Trade return leg: requester takes recipient's call */}
        {isTrade && recipientCallLabel ? (
          <div className="flex items-start gap-2">
            <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${getToneClasses("violet", false).strip}`} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-950">
                {requesterName} takes {recipientName}&apos;s {recipientCallLabel}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {/* Preview inclusion hint */}
      {isIncludedInPreview ? (
        <p className="mt-3 border-t border-amber-200 pt-2.5 text-[10px] font-medium text-amber-700">
          ↻ This request is included in the preview schedule.
        </p>
      ) : null}
    </div>
  );
}
