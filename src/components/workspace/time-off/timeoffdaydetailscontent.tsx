"use client";

import React from "react";
import {
  BriefcaseMedical,
  CheckCircle2,
  Clock3,
  MapPin,
  PlaneTakeoff,
  StickyNote,
  UserRound,
  XCircle,
} from "lucide-react";

export type TimeOffType = "personal" | "conference";
export type ApprovalStatus = "requested" | "approved" | "denied";

export type TimeOffItem = {
  id: string;
  membershipId: string | null;
  residentName: string;
  trainingLevel: string | null;
  classYear: number | null;
  userId: string | null;
  type: TimeOffType;
  usingPto: boolean;
  startDate: string | null;
  endDate: string | null;
  title: string | null;
  location: string | null;
  notes: string | null;
  approvalStatus?: ApprovalStatus | null;
  approved?: boolean | null;
  isMine: boolean;
};

function getTimeOffTone(item: TimeOffItem) {
  if (item.type === "conference") {
    return {
      card: item.isMine
        ? "border-violet-300 bg-violet-50"
        : "border-violet-200 bg-violet-50/70",
      chip: "bg-violet-600 text-white",
      text: "text-violet-950",
      label: "Conference",
      icon: BriefcaseMedical,
    };
  }

  return {
    card: item.isMine
      ? "border-slate-300 bg-slate-100"
      : "border-slate-200 bg-slate-50",
    chip: "bg-slate-900 text-white",
    text: "text-slate-950",
    label: "Personal",
    icon: UserRound,
  };
}

function getApprovalTone(status: ApprovalStatus | null | undefined) {
  if (status === "approved") {
    return {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: CheckCircle2,
    };
  }

  if (status === "denied") {
    return {
      label: "Denied",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: XCircle,
    };
  }

  return {
    label: "Requested",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
    icon: Clock3,
  };
}

type Props = {
  items: TimeOffItem[];
  isGoldenWeekend?: boolean;
};

export default function TimeOffDayDetailsContent({
  items,
  isGoldenWeekend = false,
}: Props) {
  return (
    <div className="space-y-4">
      {isGoldenWeekend ? (
        <div className="rounded-[1.5rem] border border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-sm font-bold text-amber-900">Golden Weekend</p>
          <p className="mt-1 text-sm text-amber-700">
            No Friday, Saturday, or Sunday call is scheduled for this weekend.
          </p>
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-5 py-8 text-center text-sm text-slate-500">
          No time-off entries for this day.
        </div>
      ) : (
        items.map((item) => {
          const tone = getTimeOffTone(item);
          const Icon = tone.icon;
          const approvalTone = getApprovalTone(item.approvalStatus);
          const ApprovalIcon = approvalTone.icon;

          return (
            <div
              key={item.id}
              className={`rounded-[1.5rem] border p-4 shadow-sm ${tone.card}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className={`text-base font-bold ${tone.text}`}>
                    {item.title ?? tone.label}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{tone.label}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${tone.chip}`}>
                    <span className="inline-flex items-center gap-1">
                      <Icon className="h-3.5 w-3.5" />
                      {item.isMine ? "Mine" : tone.label}
                    </span>
                  </span>

                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] ${approvalTone.className}`}>
                    <span className="inline-flex items-center gap-1">
                      <ApprovalIcon className="h-3.5 w-3.5" />
                      {approvalTone.label}
                    </span>
                  </span>

                  {item.usingPto ? (
                    <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700 border border-sky-200">
                      <span className="inline-flex items-center gap-1">
                        <PlaneTakeoff className="h-3.5 w-3.5" />
                        PTO
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {tone.label}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    PTO Usage
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {item.usingPto ? "Uses PTO" : "No PTO"}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    Location
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {item.location || "No location listed"}
                  </p>
                </div>

                <div className="rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Resident
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-800">
                    {item.residentName}
                  </p>
                </div>
              </div>

              {item.notes ? (
                <div className="mt-4 rounded-xl bg-white/70 px-3 py-3 ring-1 ring-slate-200/70">
                  <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                    <StickyNote className="h-3.5 w-3.5" />
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{item.notes}</p>
                </div>
              ) : null}
            </div>
          );
        })
      )}
    </div>
  );
}