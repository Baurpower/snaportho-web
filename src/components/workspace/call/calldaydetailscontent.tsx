"use client";

import React from "react";
import { Home, MapPin, PhoneCall, StickyNote, UserRound } from "lucide-react";

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

function getCallTone(call: ProgramCallItem) {
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

type Props = {
  calls: ProgramCallItem[];
};

export default function CallDayDetailsContent({ calls }: Props) {
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
                  {call.callType ?? "Call"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
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
          </div>
        );
      })}
    </div>
  );
}