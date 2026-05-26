"use client";

import React from "react";
import type { SwapRequestStatus } from "@/lib/workspace/call-swaps/types";

const STATUS_CONFIG: Record<
  SwapRequestStatus,
  {
    label: string;
    className: string;
  }
> = {
  pending_recipient: {
    label: "Waiting for recipient",
    className: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  },
  declined: {
    label: "Declined",
    className: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  },
  accepted_pending_admin: {
    label: "Accepted - pending admin approval",
    className: "bg-sky-100 text-sky-800 ring-1 ring-sky-200",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-100 text-rose-800 ring-1 ring-rose-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-slate-200 text-slate-700 ring-1 ring-slate-300",
  },
  expired: {
    label: "Expired",
    className: "bg-slate-100 text-slate-600 ring-1 ring-slate-200",
  },
};

export default function SwapRequestStatusBadge({
  status,
}: {
  status: SwapRequestStatus;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${config.className}`}
    >
      {config.label}
    </span>
  );
}
