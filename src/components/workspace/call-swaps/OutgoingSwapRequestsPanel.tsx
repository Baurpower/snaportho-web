"use client";

import React, { useMemo, useState } from "react";
import { Loader2, Send, XCircle } from "lucide-react";
import { useCancelSwapRequest } from "@/hooks/useCancelSwapRequest";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import SwapRequestCard from "./SwapRequestCard";

function groupRequests(requests: SwapRequestListItem[]) {
  return {
    waiting: requests.filter((request) => request.status === "pending_recipient"),
    awaitingAdmin: requests.filter(
      (request) => request.status === "accepted_pending_admin"
    ),
    completed: requests.filter((request) =>
      ["approved", "rejected", "declined", "cancelled", "expired"].includes(
        request.status
      )
    ),
  };
}

export default function OutgoingSwapRequestsPanel({
  activeRequests,
  completedRequests,
  currentRosterId,
  onRequestUpdated,
  onViewDetails,
  selectedRequestId,
}: {
  activeRequests: SwapRequestListItem[];
  completedRequests: SwapRequestListItem[];
  currentRosterId: string | null;
  onRequestUpdated?: () => void | Promise<void>;
  onViewDetails?: (requestId: string) => void;
  selectedRequestId?: string | null;
}) {
  const { cancelRequest, loadingRequestId, error, setError } = useCancelSwapRequest();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const outgoingCompleted = useMemo(
    () => completedRequests.filter((request) => request.requester?.id === currentRosterId),
    [completedRequests, currentRosterId]
  );

  const grouped = useMemo(
    () => groupRequests([...activeRequests, ...outgoingCompleted]),
    [activeRequests, outgoingCompleted]
  );
  const hasAnyRequests =
    grouped.waiting.length > 0 ||
    grouped.awaitingAdmin.length > 0 ||
    grouped.completed.length > 0;

  async function handleCancel(requestId: string) {
    try {
      setError(null);
      setSuccessMessage(null);
      await cancelRequest({ requestId });
      setSuccessMessage("Coverage request cancelled.");
      await onRequestUpdated?.();
    } catch {
      // hook sets the error
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          <Send className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
            Outgoing requests
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Requests you sent
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            These are coverage requests. The schedule only changes after the recipient accepts and an admin approves.
          </p>
        </div>
      </div>

      {successMessage ? (
        <div className="mt-4 rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {successMessage}
        </div>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="mt-4 space-y-5">
        {!hasAnyRequests ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            No coverage requests sent.
          </div>
        ) : (
          [
          {
            title: "Waiting for recipient",
            items: grouped.waiting,
          },
          {
            title: "Accepted - awaiting admin approval",
            items: grouped.awaitingAdmin,
          },
          {
            title: "Completed history",
            items: grouped.completed,
          },
          ].map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {section.title}
              </p>

              {section.items.length === 0 ? (
                <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
                  No requests in this section.
                </div>
              ) : (
                <div className="space-y-3">
                  {section.items.map((request) => {
                    const canCancel =
                      request.status === "pending_recipient" ||
                      request.status === "accepted_pending_admin";
                    const isLoading = loadingRequestId === request.id;

                    return (
                      <SwapRequestCard
                        key={request.id}
                        request={request}
                        currentRosterId={currentRosterId}
                        onViewDetails={onViewDetails}
                        selected={selectedRequestId === request.id}
                        variant="resident"
                        actions={
                          canCancel ? (
                            <button
                              type="button"
                              onClick={() => handleCancel(request.id)}
                              disabled={isLoading}
                              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                              Cancel
                            </button>
                          ) : null
                        }
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
