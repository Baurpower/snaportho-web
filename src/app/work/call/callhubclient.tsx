"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  PencilLine,
  PhoneCall,
  Plus,
  UserRound,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";
import CallDayDetailsContent from "@/components/workspace/call/calldaydetailscontent";
import CallMonthCalendar, {
  type ProgramCallItem,
} from "@/components/workspace/call/callmonthcalendar";
import EditCallMonthCalendar from "@/components/workspace/call/editcallmonthcalendar";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type ProgramCallsMonthResponse = {
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  calls: ProgramCallItem[];
};

type ResidentOption = {
  membershipId: string;
  residentName: string;
  trainingLevel: string | null;
};

type SuccessModalState = {
  title: string;
  message: string;
} | null;

function monthLabel(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange(year: number, monthIndex: number) {
  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));

  return {
    monthStart: start.toISOString().slice(0, 10),
    monthEnd: end.toISOString().slice(0, 10),
  };
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function isEditableQuickCall(call: ProgramCallItem) {
  return !call.startDatetime && !call.endDatetime && !!call.callDate;
}

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[1.25rem] border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-xl font-black tracking-tight text-slate-950 md:text-2xl">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-slate-600 md:text-sm">{subtitle}</p>
    </div>
  );
}

export default function CallHubPage() {
  const now = new Date();

  const [visibleMonth, setVisibleMonth] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  const [data, setData] = useState<ProgramCallsMonthResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingCalendar, setEditingCalendar] = useState(false);
  const [successModal, setSuccessModal] = useState<SuccessModalState>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { monthStart, monthEnd } = useMemo(
    () => getMonthRange(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadCalls() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(
          `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(payload?.error ?? "Failed to load program call");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load program call");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCalls();

    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd]);

  const calls = data?.calls ?? [];

  const callsByDate = useMemo(() => {
    const map = new Map<string, ProgramCallItem[]>();

    for (const call of calls) {
      if (!call.callDate) continue;
      const existing = map.get(call.callDate) ?? [];
      existing.push(call);
      map.set(call.callDate, existing);
    }

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => {
        if (a.isMine !== b.isMine) return a.isMine ? -1 : 1;
        return a.residentName.localeCompare(b.residentName);
      });
      map.set(key, value);
    }

    return map;
  }, [calls]);

  const callsById = useMemo(() => {
    return new Map(calls.map((call) => [call.id, call]));
  }, [calls]);

  const selectedDayCalls = selectedDateKey
    ? callsByDate.get(selectedDateKey) ?? []
    : [];

  const myCalls = calls.filter((call) => call.isMine);
  const nextMyCall =
    myCalls
      .filter((call) => call.callDate && call.callDate >= toDateKey(new Date()))
      .sort((a, b) => (a.callDate ?? "").localeCompare(b.callDate ?? ""))[0] ??
    null;

  const totalCallDays = calls.length;
  const myCallDays = myCalls.length;

  const residentOptions = useMemo(() => {
    const map = new Map<string, ResidentOption>();

    for (const call of calls) {
      if (!call.membershipId) continue;
      if (map.has(call.membershipId)) continue;

      map.set(call.membershipId, {
        membershipId: call.membershipId,
        residentName: call.residentName,
        trainingLevel: call.trainingLevel,
      });
    }

    return Array.from(map.values()).sort((a, b) =>
      a.residentName.localeCompare(b.residentName)
    );
  }, [calls]);

  async function refreshMonth() {
    const response = await fetch(
      `/api/program/calls/month?monthStart=${monthStart}&monthEnd=${monthEnd}`,
      {
        credentials: "include",
        cache: "no-store",
      }
    );

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to refresh program call");
    }

    setData(payload);
  }

  async function patchCall(
    callId: string,
    body: {
      programMembershipId?: string;
      callType?: string;
      callDate?: string | null;
      startDatetime?: string | null;
      endDatetime?: string | null;
      site?: string | null;
      isHomeCall?: boolean;
      notes?: string | null;
    }
  ) {
    const response = await fetch(`/api/program/calls/${callId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to update call");
    }

    return payload;
  }

  async function deleteCall(callId: string) {
    const response = await fetch(`/api/program/calls/${callId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to delete call");
    }

    return payload;
  }

  async function swapCalls(firstCallId: string, secondCallId: string) {
    const response = await fetch("/api/program/calls/swap", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firstCallId,
        secondCallId,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error ?? "Failed to swap calls");
    }

    return payload;
  }

  function finishSuccessfulEdit(title: string, message: string) {
    setEditingCalendar(false);
    setSuccessModal({ title, message });
  }

  async function handleSwitch(payload: {
    callId: string;
    fromMembershipId: string | null;
    toMembershipId: string;
  }) {
    try {
      setActionError(null);

      const selectedCall = callsById.get(payload.callId);
      if (!selectedCall) {
        throw new Error("Selected call could not be found.");
      }

      if (!isEditableQuickCall(selectedCall)) {
        throw new Error("This call cannot be quick-edited from this view.");
      }

      const targetResident = residentOptions.find(
        (resident) => resident.membershipId === payload.toMembershipId
      );

      if (!targetResident) {
        throw new Error("Target resident could not be found.");
      }

      await patchCall(payload.callId, {
        programMembershipId: payload.toMembershipId,
      });

      await refreshMonth();

      finishSuccessfulEdit(
        "Call switched",
        `${selectedCall.callType ?? "Call"} on ${formatShortDate(
          selectedCall.callDate
        )} was reassigned from ${selectedCall.residentName} to ${targetResident.residentName}.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to switch call.");
      throw err;
    }
  }

  async function handleSwap(payload: {
    firstCallId: string;
    secondCallId: string;
  }) {
    try {
      setActionError(null);

      const firstCall = callsById.get(payload.firstCallId);
      const secondCall = callsById.get(payload.secondCallId);

      if (!firstCall || !secondCall) {
        throw new Error("One or both selected calls could not be found.");
      }

      if (!isEditableQuickCall(firstCall) || !isEditableQuickCall(secondCall)) {
        throw new Error("One or both calls cannot be quick-edited from this view.");
      }

      await swapCalls(payload.firstCallId, payload.secondCallId);
      await refreshMonth();

      finishSuccessfulEdit(
        "Calls swapped",
        `${firstCall.residentName} and ${secondCall.residentName} were swapped successfully.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to swap calls.");
      throw err;
    }
  }

  async function handleDelete(payload: { callId: string }) {
    try {
      setActionError(null);

      const selectedCall = callsById.get(payload.callId);
      if (!selectedCall) {
        throw new Error("Selected call could not be found.");
      }

      if (!isEditableQuickCall(selectedCall)) {
        throw new Error("This call cannot be quick-deleted from this view.");
      }

      await deleteCall(payload.callId);
      await refreshMonth();

      finishSuccessfulEdit(
        "Call deleted",
        `${selectedCall.callType ?? "Call"} for ${selectedCall.residentName} on ${formatShortDate(
          selectedCall.callDate
        )} was removed.`
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete call.");
      throw err;
    }
  }

  return (
    <>
      <main className="min-w-0 text-slate-900">
        <section className="relative overflow-hidden px-5 pb-5 pt-6 md:px-8 md:pb-6 md:pt-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_16%)]" />

          <div className="relative mx-auto max-w-[1600px]">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.75rem] border border-white/10 bg-white/5 p-5 backdrop-blur md:p-6"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-sky-200">
                    <PhoneCall className="h-3.5 w-3.5" />
                    SnapOrtho
                  </div>
                  <h1 className="mt-3 text-3xl font-black tracking-tight text-white md:text-5xl">
                    Call Hub
                  </h1>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
                    A single place to see program-wide call, with your own call emphasized first.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  <StatCard
                    title="Visible Month"
                    value={monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    subtitle={`${formatShortDate(monthStart)} – ${formatShortDate(monthEnd)}`}
                  />
                  <StatCard
                    title="My Call Days"
                    value={String(myCallDays)}
                    subtitle={
                      nextMyCall
                        ? `Next: ${formatShortDate(nextMyCall.callDate)}`
                        : "No upcoming call in view"
                    }
                  />
                  <StatCard
                    title="Program Call Assignments"
                    value={String(totalCallDays)}
                    subtitle="All visible resident call assignments this month"
                  />
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        <section className="px-5 pb-8 md:px-8 md:pb-10">
          <div className="mx-auto max-w-[1600px] space-y-4">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {actionError ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {actionError}
              </div>
            ) : null}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-xl md:p-5"
            >
              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth((prev) => {
                        const nextDate = new Date(prev.year, prev.monthIndex - 1, 1);
                        return {
                          year: nextDate.getFullYear(),
                          monthIndex: nextDate.getMonth(),
                        };
                      })
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Call Schedule
                    </p>
                    <h2 className="mt-1.5 text-xl font-bold tracking-tight text-slate-950 md:text-2xl">
                      {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    </h2>
                    <p className="mt-0.5 text-xs text-slate-500 md:text-sm">
                      Program-wide monthly call view
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setVisibleMonth((prev) => {
                        const nextDate = new Date(prev.year, prev.monthIndex + 1, 1);
                        return {
                          year: nextDate.getFullYear(),
                          monthIndex: nextDate.getMonth(),
                        };
                      })
                    }
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCalendar((prev) => !prev);
                      setActionError(null);
                    }}
                    className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${
                      editingCalendar
                        ? "border border-amber-300 bg-amber-100 text-amber-900 hover:bg-amber-200"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <PencilLine className="h-4 w-4" />
                    {editingCalendar ? "Exit Edit" : "Edit"}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/work/call/add")}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add Call
                  </button>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5">
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  My call emphasized
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Home call tone
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-slate-600">
                  <UserRound className="h-3.5 w-3.5" />
                  Entire program visible
                </div>
                {editingCalendar ? (
                  <>
                    <div className="h-4 w-px bg-slate-200" />
                    <div className="inline-flex items-center gap-2 text-[11px] font-semibold text-amber-700">
                      <PencilLine className="h-3.5 w-3.5" />
                      Quick edit mode active
                    </div>
                  </>
                ) : null}
              </div>

              {editingCalendar ? (
                <EditCallMonthCalendar
                  year={visibleMonth.year}
                  monthIndex={visibleMonth.monthIndex}
                  calls={calls}
                  loading={loading}
                  residents={residentOptions}
                  onCancel={() => setEditingCalendar(false)}
                  onSwitch={handleSwitch}
                  onSwap={handleSwap}
                  onDelete={handleDelete}
                />
              ) : (
                <CallMonthCalendar
                  year={visibleMonth.year}
                  monthIndex={visibleMonth.monthIndex}
                  calls={calls}
                  loading={loading}
                  onSelectDate={setSelectedDateKey}
                />
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <DayDetailsModal
        open={!!selectedDateKey && !editingCalendar}
        onClose={() => setSelectedDateKey(null)}
        title="Call Day Details"
        subtitle="Full call assignments visible for this selected day."
        dateLabel={formatLongDate(selectedDateKey)}
      >
        {() => <CallDayDetailsContent calls={selectedDayCalls} />}
      </DayDetailsModal>

      {successModal ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 p-4">
          <div className="w-full max-w-md rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Update complete
                  </p>
                  <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
                    {successModal.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {successModal.message}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setSuccessModal(null)}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to calendar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}