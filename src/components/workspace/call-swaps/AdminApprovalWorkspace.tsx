"use client";

import React, { useRef, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, XCircle } from "lucide-react";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import { useAdminSwapDecision } from "@/hooks/useAdminSwapDecision";
import AdminSchedulePreview from "./AdminSchedulePreview";
import SwapValidationSummary from "./SwapValidationSummary";

// ---------------------------------------------------------------------------
// AdminApprovalWorkspace
//
// Right-panel decision workspace for a single admin-selected request.
// Contains:
//   • AdminSchedulePreview (neutral third-party schedule impact)
//   • SwapValidationSummary (null in Phase 1 — shows "No conflicts detected")
//   • Optional admin note (persisted in parent-managed state so notes survive
//     request switches when the parent passes notesByRequestId down)
//   • Approve / Reject buttons via useAdminSwapDecision
// ---------------------------------------------------------------------------

export default function AdminApprovalWorkspace({
  request,
  adminNotesByRequestId,
  onChangeAdminNote,
  onRequestUpdated,
  onViewDetails,
  previewMode = "current",
  validation = null,
}: {
  request: SwapRequestListItem | null;
  /** Notes keyed by request ID — lifted to parent so they persist across switches */
  adminNotesByRequestId: Record<string, string>;
  onChangeAdminNote: (requestId: string, note: string) => void;
  onRequestUpdated?: () => Promise<void>;
  onViewDetails?: (requestId: string) => void;
  previewMode?: "current" | "preview";
  /**
   * Projected-schedule validation result for this request.
   * null → "No conflicts detected" (informational — never blocks approval).
   */
  validation?: { errors: string[]; warnings: string[] } | null;
}) {
  const { decide, loadingRequestId, error, setError } = useAdminSwapDecision();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Track the last request ID we decided on, so we can show a message even
  // after the parent removes the request from the pending queue.
  const lastDecidedRequestIdRef = useRef<string | null>(null);

  if (!request) {
    return (
      <div className="flex items-center gap-4 rounded-[1.5rem] border border-dashed border-slate-200 bg-white px-6 py-8 shadow-sm">
        <ClipboardCheck className="h-9 w-9 shrink-0 text-slate-300" />
        <div>
          <p className="text-sm font-semibold text-slate-700">No request selected</p>
          <p className="mt-0.5 text-sm text-slate-500">
            Choose a request from the queue to review the schedule impact and approve or reject.
          </p>
        </div>
      </div>
    );
  }

  const isLoading = loadingRequestId === request.id;
  const note = adminNotesByRequestId[request.id] ?? "";

  async function handleDecision(decision: "approve" | "reject") {
    if (!request) return;
    try {
      setError(null);
      setSuccessMessage(null);
      lastDecidedRequestIdRef.current = request.id;
      await decide({
        requestId: request.id,
        decision,
        note: note.trim() || null,
      });
      setSuccessMessage(
        decision === "approve"
          ? "Approved. The schedule has been officially updated."
          : "Rejected. No schedule change was made."
      );
      await onRequestUpdated?.();
    } catch {
      // useAdminSwapDecision stores the error message internally
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ClipboardCheck className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Admin decision
          </p>
          <h2 className="text-lg font-bold tracking-tight text-slate-950">
            Review &amp; approve
          </h2>
        </div>
        {/* Approve / reject inline at top-right so they're always visible */}
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void handleDecision("reject")}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Reject
          </button>
          <button
            type="button"
            onClick={() => void handleDecision("approve")}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="h-3.5 w-3.5" />
            )}
            Approve
          </button>
        </div>
      </div>

      {/* Schedule change preview */}
      <div className="mt-3">
        <AdminSchedulePreview request={request} previewMode={previewMode} />
      </div>

      {/* Validation summary — informational only, never blocks approval */}
      <div className="mt-2">
        <SwapValidationSummary validation={validation} />
      </div>

      {/* Success message */}
      {successMessage ? (
        <div className="mt-3 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {/* Error message */}
      {error ? (
        <div className="mt-3 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {/* Admin note + secondary actions */}
      <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label
            htmlFor={`admin-note-${request.id}`}
            className="mb-1.5 block text-sm font-semibold text-slate-900"
          >
            Optional admin note
          </label>
          <textarea
            id={`admin-note-${request.id}`}
            key={request.id}
            value={note}
            onChange={(event) => onChangeAdminNote(request.id, event.target.value)}
            placeholder="Add any context for the requester and recipient"
            rows={2}
            className="min-h-[68px] w-full rounded-[1rem] border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
          />
        </div>
        {onViewDetails ? (
          <button
            type="button"
            onClick={() => onViewDetails(request.id)}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View full details
          </button>
        ) : null}
      </div>
    </div>
  );
}
