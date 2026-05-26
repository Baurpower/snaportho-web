"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Loader2,
  MessageSquareText,
  UserRound,
  X,
} from "lucide-react";
import SwapRequestStatusBadge from "./SwapRequestStatusBadge";
import {
  getSwapAuditNote,
  getSwapAuditSubtitle,
  getSwapAuditTitle,
} from "@/lib/workspace/call-swaps/audit-labels";
import type {
  ShiftSwapAuditLog,
  SwapRequestListItem,
} from "@/lib/workspace/call-swaps/types";

type DetailResponse = {
  item: SwapRequestListItem;
  auditLog: ShiftSwapAuditLog[];
};

function isDetailResponse(
  payload: DetailResponse | { error?: string } | null
): payload is DetailResponse {
  return Boolean(payload && "item" in payload);
}

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatCallDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getScheduleImpactText(item: SwapRequestListItem) {
  const requesterName = item.requester?.fullName ?? "Unknown resident";
  const recipientName = item.recipient?.fullName ?? "Unknown resident";
  const isTrade = item.request_type === "trade" && item.recipientCall;

  if (item.status === "approved") {
    return {
      title: "Schedule updated",
      body: isTrade
        ? `${recipientName} now has ${formatCallDate(
            item.requesterCall?.callDate
          )} and ${requesterName} now has ${formatCallDate(
            item.recipientCall?.callDate
          )}.`
        : `${recipientName} is assigned after approval.`,
    };
  }

  if (item.status === "declined" || item.status === "rejected") {
    return {
      title: "No schedule change occurred",
      body: `${requesterName} remains assigned to this call.`,
    };
  }

  if (item.status === "cancelled" || item.status === "expired") {
    return {
      title: "No schedule change occurred",
      body: `${requesterName} remains assigned to this call.`,
    };
  }

  return {
    title: "Schedule impact",
    body: isTrade
      ? `Current schedule: ${requesterName} has ${formatCallDate(
          item.requesterCall?.callDate
        )} and ${recipientName} has ${formatCallDate(
          item.recipientCall?.callDate
        )}. If approved, they exchange those calls.`
      : `Current schedule: ${requesterName} is assigned. If approved: ${recipientName} will be assigned.`,
  };
}

function TimelineStep({
  label,
  complete,
  current,
}: {
  label: string;
  complete: boolean;
  current: boolean;
}) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${
        current
          ? "border-sky-300 bg-sky-50 text-sky-900"
          : complete
          ? "border-emerald-200 bg-emerald-50 text-emerald-900"
          : "border-slate-200 bg-white text-slate-500"
      }`}
    >
      <span
        className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] ${
          current
            ? "bg-sky-600 text-white"
            : complete
            ? "bg-emerald-600 text-white"
            : "bg-slate-100 text-slate-600"
        }`}
      >
        {complete ? <CheckCircle2 className="h-3 w-3" /> : current ? "•" : ""}
      </span>
      {label}
    </div>
  );
}

function SchedulePreview({
  item,
}: {
  item: SwapRequestListItem;
}) {
  const requesterName = item.requester?.fullName ?? "Unknown resident";
  const isTrade = item.request_type === "trade" && item.recipientCall;
  const approved = item.status === "approved";

  if (isTrade) {
    return (
      <div className="space-y-4">
        <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Requested change
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            You take: {formatCallDate(item.requesterCall?.callDate)} —{" "}
            {item.requesterCall?.callType ?? "Call"}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">
            {requesterName} takes your shift on:{" "}
            {formatCallDate(item.recipientCall?.callDate)} —{" "}
            {item.recipientCall?.callType ?? "Call"}
          </p>
        </div>

        <div className="rounded-[1.25rem] border border-violet-200 bg-violet-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-violet-700">
            {approved ? "What changed" : "What happens next"}
          </p>
          <p className="mt-2 text-sm text-slate-700">
            If accepted, this swap goes to an admin for approval before the
            schedule changes.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Requested change
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          You take: {formatCallDate(item.requesterCall?.callDate)} —{" "}
          {item.requesterCall?.callType ?? "Call"}
        </p>
        <p className="mt-2 text-sm text-slate-700">
          {requesterName} gives up this call.
        </p>
      </div>

      <div className="rounded-[1.25rem] border border-sky-200 bg-sky-50 px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">
          Return shift
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-900">
          No return shift — only this call changes hands.
        </p>
      </div>

      <div className="rounded-[1.25rem] border border-slate-200 bg-white px-4 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          What happens next
        </p>
        <p className="mt-2 text-sm text-slate-700">
          If accepted, this goes to an admin for approval before the schedule
          changes.
        </p>
      </div>
    </div>
  );
}

export default function SwapRequestDetailDrawer({
  requestId,
  open,
  onClose,
  viewerMode = "default",
}: {
  requestId: string | null;
  open: boolean;
  onClose: () => void;
  viewerMode?: "default" | "resident";
}) {
  const [item, setItem] = useState<SwapRequestListItem | null>(null);
  const [auditLog, setAuditLog] = useState<ShiftSwapAuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !requestId) return;

    let cancelled = false;

    async function loadDetail() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/program/calls/swaps/${requestId}`, {
          credentials: "include",
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | DetailResponse
          | { error?: string }
          | null;

        if (!response.ok || !isDetailResponse(payload)) {
          const errorMessage =
            payload && "error" in payload ? payload.error : undefined;
          throw new Error(errorMessage ?? "Failed to load swap request details.");
        }

        if (!cancelled) {
          setItem(payload.item);
          setAuditLog(payload.auditLog ?? []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load swap request details."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadDetail();

    return () => {
      cancelled = true;
    };
  }, [open, requestId]);

  const timeline = useMemo(() => auditLog, [auditLog]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            className="fixed inset-0 z-[185] bg-slate-950/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            className="fixed right-0 top-0 z-[190] flex h-full w-full max-w-[38rem] flex-col border-l border-slate-200 bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
          >
            <div className="shrink-0 border-b border-slate-200 px-5 py-5 md:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {item?.request_type === "trade"
                      ? "Swap request details"
                      : "Coverage request details"}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                    {item?.request_type === "trade"
                      ? "Shift trade request"
                      : "Direct coverage request"}
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 md:px-6">
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading request details...
                </div>
              ) : error ? (
                <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              ) : item ? (
                <div className="space-y-5">
                  <div className="flex flex-wrap items-center gap-3">
                    <SwapRequestStatusBadge status={item.status} />
                    <span className="text-xs text-slate-500">
                      Created {formatDate(item.created_at)}
                    </span>
                  </div>

                  {viewerMode === "resident" ? (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.request_type === "coverage_only"
                          ? "Coverage request"
                          : "Swap request"}
                      </p>
                      <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                        {(item.requester?.fullName ?? "Unknown")} {"→"}{" "}
                        {(item.recipient?.fullName ?? "Unknown")}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {item.request_type === "trade"
                          ? "This request proposes a two-way call exchange."
                          : `${item.recipient?.fullName ?? "Unknown"} is being asked to cover ${
                              item.requester?.fullName ?? "Unknown"
                            }'s call.`}
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {item.request_type === "coverage_only"
                          ? "Coverage request"
                          : "Swap request"}
                      </p>
                      <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                        {(item.requester?.fullName ?? "Unknown")} {"→"}{" "}
                        {(item.recipient?.fullName ?? "Unknown")}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-700">
                        {(item.recipient?.fullName ?? "Unknown")} is being asked to
                        cover {(item.requester?.fullName ?? "Unknown")}&apos;s call.
                      </p>
                    </div>
                  )}

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      Call details
                    </p>
                    <p className="mt-2 text-lg font-bold tracking-tight text-slate-950">
                      {item.requesterCall?.callType ?? "Call"} • {formatCallDate(item.requesterCall?.callDate)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      {item.requesterCall?.site ?? "No service/site listed"}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {item.requesterCall?.isHomeCall ? "Home call" : "Standard coverage"}
                    </p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <UserRound className="h-3.5 w-3.5" />
                        Requester
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {item.requester?.fullName ?? "Unknown"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200">
                      <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        <UserRound className="h-3.5 w-3.5" />
                        Recipient
                      </p>
                      <p className="mt-1 text-sm font-medium text-slate-800">
                        {item.recipient?.fullName ?? "Unknown"}
                      </p>
                    </div>
                  </div>

                  {[
                    {
                      label: "Requester note",
                      value: item.requester_note,
                    },
                    {
                      label: "Recipient note",
                      value: item.recipient_note,
                    },
                    {
                      label: "Admin note",
                      value: item.admin_note,
                    },
                  ]
                    .filter((entry) => entry.value)
                    .map((entry) => (
                      <div
                        key={entry.label}
                        className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200"
                      >
                        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                          <MessageSquareText className="h-3.5 w-3.5" />
                          {entry.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">{entry.value}</p>
                      </div>
                    ))}

                  {viewerMode === "resident" ? (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Schedule Change Preview
                      </p>
                      <div className="mt-3">
                        <SchedulePreview item={item} />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Schedule impact
                      </p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {getScheduleImpactText(item).title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-slate-700">
                        {getScheduleImpactText(item).body}
                      </p>
                    </div>
                  )}

                  {viewerMode === "resident" ? (
                    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                        Approval status
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <TimelineStep
                          label="Request sent"
                          complete
                          current={false}
                        />
                        <TimelineStep
                          label="Recipient accepts"
                          complete={
                            item.status !== "pending_recipient" &&
                            item.status !== "declined"
                          }
                          current={item.status === "pending_recipient"}
                        />
                        <TimelineStep
                          label="Admin approves"
                          complete={item.status === "approved"}
                          current={item.status === "accepted_pending_admin"}
                        />
                        <TimelineStep
                          label="Schedule updates"
                          complete={item.status === "approved"}
                          current={false}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                      <Clock3 className="h-3.5 w-3.5" />
                      Timeline
                    </p>

                    {timeline.length === 0 ? (
                      <p className="mt-2 text-sm text-slate-500">
                        No timeline events available yet.
                      </p>
                    ) : (
                      <div className="mt-3 space-y-3">
                        {timeline.map((entry) => (
                          <div
                            key={entry.id}
                            className="rounded-xl bg-white px-3 py-3 ring-1 ring-slate-200"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900">
                                  {getSwapAuditTitle(entry)}
                                </p>
                                {entry.actor?.fullName ? (
                                  <p className="mt-1 text-xs text-slate-600">
                                    {entry.actor.fullName}
                                  </p>
                                ) : null}
                                {getSwapAuditSubtitle(entry) ? (
                                  <p className="mt-1 text-xs text-slate-500">
                                    {getSwapAuditSubtitle(entry)}
                                  </p>
                                ) : null}
                                <p className="mt-1 text-xs text-slate-500">
                                  {formatDate(entry.created_at)}
                                </p>
                              </div>
                              {entry.new_status ? (
                                <SwapRequestStatusBadge status={entry.new_status} />
                              ) : null}
                            </div>

                            {getSwapAuditNote(entry) ? (
                              <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                                {getSwapAuditNote(entry)}
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
