"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  Plus,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";
import CallDayDetailsContent from "@/components/workspace/call/calldaydetailscontent";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type ProgramCallItem = {
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

type ProgramCallsMonthResponse = {
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  calls: ProgramCallItem[];
};

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

function startOfWeekSunday(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - copy.getDay());
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function startOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1);
}

function endOfMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0);
}

function buildCalendarWeeksSunday(year: number, monthIndex: number) {
  const monthStart = startOfMonth(year, monthIndex);
  const monthEnd = endOfMonth(year, monthIndex);

  const gridStart = startOfWeekSunday(monthStart);
  const gridEnd = addDays(startOfWeekSunday(monthEnd), 6);

  const weeks: Date[][] = [];
  let cursor = new Date(gridStart);

  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i += 1) {
      week.push(new Date(cursor));
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function isSameMonth(date: Date, year: number, monthIndex: number) {
  return date.getFullYear() === year && date.getMonth() === monthIndex;
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
    <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {title}
      </p>
      <p className="mt-3 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

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

function CallMonthCalendar({
  year,
  monthIndex,
  calls,
  loading,
  onSelectDate,
}: {
  year: number;
  monthIndex: number;
  calls: ProgramCallItem[];
  loading?: boolean;
  onSelectDate?: (dateKey: string) => void;
}) {
  const weeks = useMemo(
    () => buildCalendarWeeksSunday(year, monthIndex),
    [year, monthIndex]
  );

  const todayKey = toDateKey(new Date());

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

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-xl">
        Loading program call...
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
      <div className="border-b border-slate-200 px-5 py-5 md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-950">
              Program Call Calendar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your call is highlighted first, with the rest of the program visible in the same day.
            </p>
          </div>
        </div>
      </div>

      <div className="px-3 pb-4 pt-3 md:px-4">
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="py-1 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="space-y-1.5">
          {weeks.map((week, weekIndex) => (
            <div
              key={`week-${weekIndex}`}
              className="grid grid-cols-7 gap-1.5"
            >
              {week.map((date) => {
                const key = toDateKey(date);
                const inMonth = isSameMonth(date, year, monthIndex);
                const isToday = key === todayKey;
                const dayCalls = callsByDate.get(key) ?? [];
                const myCalls = dayCalls.filter((call) => call.isMine);
                const otherCalls = dayCalls.filter((call) => !call.isMine);

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => inMonth && onSelectDate?.(key)}
                    className={[
                      "min-h-[180px] rounded-[1.35rem] border p-2.5 text-left transition",
                      inMonth
                        ? "border-slate-200 bg-white hover:border-slate-300"
                        : "border-transparent bg-slate-50/60",
                      isToday && inMonth ? "ring-2 ring-sky-300" : "",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={[
                          "text-xs font-semibold",
                          inMonth ? "text-slate-700" : "text-slate-300",
                        ].join(" ")}
                      >
                        {date.getDate()}
                      </span>

                      {dayCalls.length > 0 && inMonth ? (
                        <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                          <PhoneCall className="h-3 w-3" />
                          {dayCalls.length}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {myCalls.map((call) => {
                        const tone = getCallTone(call);

                        return (
                          <div
                            key={call.id}
                            className={`rounded-xl border px-2.5 py-2 shadow-sm ${tone.card}`}
                            title={`${call.residentName} • ${call.callType ?? "Call"} • ${call.site ?? "No site"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`truncate text-[11px] font-bold ${tone.text}`}>
                                  {call.residentName}
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {call.callType ?? "Call"}
                                </p>
                              </div>

                              <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${tone.chip}`}>
                                Mine
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {otherCalls.slice(0, 4).map((call) => {
                        const tone = getCallTone(call);

                        return (
                          <div
                            key={call.id}
                            className={`rounded-xl border px-2.5 py-2 ${tone.card}`}
                            title={`${call.residentName} • ${call.callType ?? "Call"} • ${call.site ?? "No site"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className={`truncate text-[11px] font-semibold ${tone.text}`}>
                                  {call.residentName}
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {call.callType ?? "Call"}
                                </p>
                              </div>

                              {call.trainingLevel ? (
                                <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-slate-500 ring-1 ring-slate-200">
                                  {call.trainingLevel}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}

                      {otherCalls.length > 4 ? (
                        <div className="px-1 text-[10px] font-semibold text-slate-400">
                          +{otherCalls.length - 4} more
                        </div>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
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

  return (
    <>
      <main className="min-w-0 text-slate-900">
        <section className="relative overflow-hidden px-6 pb-8 pt-10 md:px-10 md:pb-10 md:pt-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(255,255,255,0.08),transparent_16%)]" />

          <div className="relative mx-auto max-w-7xl">
            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[2rem] border border-white/10 bg-white/5 p-6 backdrop-blur md:p-8"
            >
              <div className="flex flex-col gap-6">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-sky-200">
                    <PhoneCall className="h-4 w-4" />
                    SnapOrtho
                  </div>
                  <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
                    Call Hub
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                    A single place to see program-wide call, with your own call emphasized first.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
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

        <section className="px-6 pb-14 md:px-10 md:pb-16">
          <div className="mx-auto max-w-7xl space-y-6">
            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            <motion.div
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl md:p-6"
            >
              <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
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
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      Call Schedule
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                      {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
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
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/work/call/add")}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  <Plus className="h-4 w-4" />
                  Add Call
                </button>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  My call emphasized
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Home call tone
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <UserRound className="h-3.5 w-3.5" />
                  Entire program visible
                </div>
              </div>

              <CallMonthCalendar
                year={visibleMonth.year}
                monthIndex={visibleMonth.monthIndex}
                calls={calls}
                loading={loading}
                onSelectDate={setSelectedDateKey}
              />
            </motion.div>
          </div>
        </section>
      </main>

      <DayDetailsModal
  open={!!selectedDateKey}
  onClose={() => setSelectedDateKey(null)}
  title="Call Day Details"
  subtitle="Full call assignments visible for this selected day."
  dateLabel={formatLongDate(selectedDateKey)}
>
  {() => <CallDayDetailsContent calls={selectedDayCalls} />}
</DayDetailsModal>
    </>
  );
}