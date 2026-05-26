"use client";

import React, { useState } from "react";
import { CheckCircle2, Inbox, Loader2, XCircle } from "lucide-react";
import { useRespondToSwapRequest } from "@/hooks/useRespondToSwapRequest";
import type { SwapRequestListItem } from "@/lib/workspace/call-swaps/types";
import SwapRequestCard from "./SwapRequestCard";

export default function IncomingSwapRequestsPanel({
  requests,
  currentRosterId,
  onRequestUpdated,
  onViewDetails,
  selectedRequestId,
}: {
  requests: SwapRequestListItem[];
  currentRosterId: string | null;
  onRequestUpdated?: () => void | Promise<void>;
  onViewDetails?: (requestId: string) => void;
  selectedRequestId?: string | null;
}) {
  const { respond, loadingRequestId, error, setError } = useRespondToSwapRequest();
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [responseNote, setResponseNote] = useState("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleDecision(
    requestId: string,
    decision: "accept" | "decline"
  ) {
    try {
      setError(null);
      setSuccessMessage(null);
      await respond({
        requestId,
        decision,
        note: responseNote.trim() || null,
      });
      setExpandedRequestId(null);
      setResponseNote("");
      setSuccessMessage(
        decision === "accept"
          ? "Accepted. This request now needs admin approval before the official schedule changes."
          : "Coverage request declined."
      );
      await onRequestUpdated?.();
    } catch {
      // hook handles message state
    }
  }

  return (
    <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
          <Inbox className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
            Incoming requests
          </p>
          <h2 className="mt-1 text-xl font-bold tracking-tight text-slate-950">
            Requests waiting on you
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Accepting does not officially change the schedule. Admin approval is still required.
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

      <div className="mt-4 space-y-3">
        {requests.length === 0 ? (
          <div className="rounded-[1.25rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center text-sm text-slate-500">
            No coverage requests waiting on you.
          </div>
        ) : (
          requests.map((request) => {
            const isExpanded = expandedRequestId === request.id;
            const isLoading = loadingRequestId === request.id;

            return (
              <div key={request.id} className="space-y-3">
                <SwapRequestCard
                  request={request}
                  currentRosterId={currentRosterId}
                  onViewDetails={onViewDetails}
                  selected={selectedRequestId === request.id}
                  variant="resident"
                  actions={
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedRequestId((current) =>
                            current === request.id ? null : request.id
                          )
                        }
                        className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                      >
                        {isExpanded ? "Hide response" : "Respond"}
                      </button>
                    </>
                  }
                />

                {isExpanded ? (
                  <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 p-4">
                    <div className="rounded-[1rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                      <p className="font-semibold">If you accept</p>
                      <p className="mt-1 leading-6">
                        You are agreeing to cover this call. An admin still has to
                        approve before the schedule changes.
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
                          1. You accept
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
                          2. Admin approves
                        </span>
                        <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-sky-800 ring-1 ring-sky-200">
                          3. Schedule updates
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 rounded-[1rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      Review your calendar before accepting, especially if you already have a call near this date.
                    </div>

                    <p className="mt-4 text-sm font-semibold text-slate-900">
                      Can you cover this call?
                    </p>

                    <label className="mb-2 block text-sm font-semibold text-slate-900">
                      Optional response note
                    </label>
                    <textarea
                      value={responseNote}
                      onChange={(event) => setResponseNote(event.target.value)}
                      placeholder="Optional note for the requester or admin"
                      className="min-h-[100px] w-full rounded-[1rem] border border-slate-200 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />

                    <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <button
                        type="button"
                        onClick={() => handleDecision(request.id, "decline")}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        Decline
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDecision(request.id, "accept")}
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Accept request
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
