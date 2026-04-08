"use client";

import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Plus,
  PlaneTakeoff,
  BriefcaseMedical,
  UserRound,
  CheckCircle2,
  Clock3,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";
import TimeOffDayDetailsContent from "@/components/workspace/time-off/timeoffdaydetailscontent";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type TimeOffType = "personal" | "conference";
type ApprovalStatus = "requested" | "approved" | "denied";

type TimeOffItem = {
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

type TimeOffMonthResponse = {
  monthStart: string;
  monthEnd: string;
  myMembershipId: string | null;
  items: TimeOffItem[];
};

type GoldenWeekendSummary = {
  friday: string;
  saturday: string;
  sunday: string;
  hasFridayCall: boolean;
  hasSaturdayCall: boolean;
  hasSundayCall: boolean;
  isGoldenWeekend: boolean;
};

type GoldenWeekendsMonthResponse = {
  month: string;
  membershipId: string;
  goldenWeekendCount: number;
  weekends: GoldenWeekendSummary[];
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

function getMonthValue(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
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

function enumerateDateKeys(startDate: string | null, endDate: string | null) {
  if (!startDate) return [];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate ?? startDate}T00:00:00`);

  const dates: string[] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    dates.push(toDateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return dates;
}

function isApprovalStatus(value: unknown): value is ApprovalStatus {
  return value === "requested" || value === "approved" || value === "denied";
}

function isTimeOffType(value: unknown): value is TimeOffType {
  return value === "personal" || value === "conference";
}

function normalizeTimeOffMonthResponse(payload: unknown): TimeOffMonthResponse {
  const safePayload =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const rawItems = Array.isArray(safePayload.items) ? safePayload.items : [];

  const items: TimeOffItem[] = rawItems.map((raw, index) => {
    const item =
      raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};

    return {
      id: typeof item.id === "string" ? item.id : `fallback-${index}`,
      membershipId:
        typeof item.membershipId === "string" ? item.membershipId : null,
      residentName:
        typeof item.residentName === "string"
          ? item.residentName
          : "Unknown Resident",
      trainingLevel:
        typeof item.trainingLevel === "string" ? item.trainingLevel : null,
      classYear: typeof item.classYear === "number" ? item.classYear : null,
      userId: typeof item.userId === "string" ? item.userId : null,
      type: isTimeOffType(item.type) ? item.type : "personal",
      usingPto: Boolean(item.usingPto),
      startDate: typeof item.startDate === "string" ? item.startDate : null,
      endDate: typeof item.endDate === "string" ? item.endDate : null,
      title: typeof item.title === "string" ? item.title : null,
      location: typeof item.location === "string" ? item.location : null,
      notes: typeof item.notes === "string" ? item.notes : null,
      approvalStatus: isApprovalStatus(item.approvalStatus)
        ? item.approvalStatus
        : null,
      approved: typeof item.approved === "boolean" ? item.approved : null,
      isMine: Boolean(item.isMine),
    };
  });

  return {
    monthStart:
      typeof safePayload.monthStart === "string" ? safePayload.monthStart : "",
    monthEnd:
      typeof safePayload.monthEnd === "string" ? safePayload.monthEnd : "",
    myMembershipId:
      typeof safePayload.myMembershipId === "string"
        ? safePayload.myMembershipId
        : null,
    items,
  };
}

function normalizeGoldenWeekendsResponse(
  payload: unknown
): GoldenWeekendsMonthResponse {
  const safePayload =
    payload && typeof payload === "object"
      ? (payload as Record<string, unknown>)
      : {};

  const rawWeekends = Array.isArray(safePayload.weekends)
    ? safePayload.weekends
    : [];

  return {
    month: typeof safePayload.month === "string" ? safePayload.month : "",
    membershipId:
      typeof safePayload.membershipId === "string"
        ? safePayload.membershipId
        : "",
    goldenWeekendCount:
      typeof safePayload.goldenWeekendCount === "number"
        ? safePayload.goldenWeekendCount
        : 0,
    weekends: rawWeekends.map((raw) => {
      const item =
        raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
      return {
        friday: typeof item.friday === "string" ? item.friday : "",
        saturday: typeof item.saturday === "string" ? item.saturday : "",
        sunday: typeof item.sunday === "string" ? item.sunday : "",
        hasFridayCall: Boolean(item.hasFridayCall),
        hasSaturdayCall: Boolean(item.hasSaturdayCall),
        hasSundayCall: Boolean(item.hasSundayCall),
        isGoldenWeekend: Boolean(item.isGoldenWeekend),
      };
    }),
  };
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

function TimeOffMonthCalendar({
  year,
  monthIndex,
  items,
  goldenDates,
  loading,
  onSelectDate,
}: {
  year: number;
  monthIndex: number;
  items: TimeOffItem[];
  goldenDates: Set<string>;
  loading?: boolean;
  onSelectDate?: (dateKey: string) => void;
}) {
  const weeks = useMemo(
    () => buildCalendarWeeksSunday(year, monthIndex),
    [year, monthIndex]
  );

  const todayKey = toDateKey(new Date());

  const myVisibleItems = useMemo(
    () => items.filter((item) => item.isMine && item.approvalStatus !== "denied"),
    [items]
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, TimeOffItem[]>();

    for (const item of myVisibleItems) {
      const keys = enumerateDateKeys(item.startDate, item.endDate);

      for (const key of keys) {
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
      }
    }

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => {
        const typeOrder = {
          conference: 0,
          personal: 1,
        } as const;

        return typeOrder[a.type] - typeOrder[b.type];
      });
      map.set(key, value);
    }

    return map;
  }, [myVisibleItems]);

  if (loading) {
    return (
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 text-sm text-slate-500 shadow-xl">
        Loading time-off calendar...
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
              My Time-Off Calendar
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Requested and approved conference and personal time away for the
              month, plus golden weekends from your call schedule.
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
            <div key={`week-${weekIndex}`} className="grid grid-cols-7 gap-1.5">
              {week.map((date) => {
                const key = toDateKey(date);
                const inMonth = isSameMonth(date, year, monthIndex);
                const isToday = key === todayKey;
                const dayItems = itemsByDate.get(key) ?? [];
                const isGoldenDate = goldenDates.has(key);

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
                      isGoldenDate && inMonth ? "border-amber-200 bg-amber-50/70" : "",
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

                      <div className="flex items-center gap-1">
                        {isGoldenDate && inMonth ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                            ✨ GW
                          </div>
                        ) : null}

                        {dayItems.length > 0 && inMonth ? (
                          <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 px-2 py-1 text-[10px] font-bold text-white shadow-sm">
                            <CalendarDays className="h-3 w-3" />
                            {dayItems.length}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="mt-3 space-y-1.5">
                      {dayItems.slice(0, 4).map((item) => {
                        const tone = getTimeOffTone(item);
                        const Icon = tone.icon;
                        const approvalTone = getApprovalTone(item.approvalStatus);
                        const ApprovalIcon = approvalTone.icon;

                        return (
                          <div
                            key={`${item.id}-${key}`}
                            className={`rounded-xl border px-2.5 py-2 shadow-sm ${tone.card}`}
                            title={`${tone.label} • ${item.title ?? "No title"}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p
                                  className={`truncate text-[11px] font-bold ${tone.text}`}
                                >
                                  {item.title ?? tone.label}
                                </p>
                                <p className="truncate text-[10px] text-slate-500">
                                  {tone.label}
                                  {item.usingPto ? " • PTO" : ""}
                                  {item.location ? ` • ${item.location}` : ""}
                                </p>

                                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${tone.chip}`}
                                  >
                                    <Icon className="h-3 w-3" />
                                    Mine
                                  </span>

                                  {item.usingPto ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-sky-700">
                                      <PlaneTakeoff className="h-3 w-3" />
                                      PTO
                                    </span>
                                  ) : null}

                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] ${approvalTone.className}`}
                                  >
                                    <ApprovalIcon className="h-3 w-3" />
                                    {approvalTone.label}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {dayItems.length > 4 ? (
                        <div className="px-1 text-[10px] font-semibold text-slate-400">
                          +{dayItems.length - 4} more
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

export default function TimeOffHubPage() {
  const now = new Date();

  const [visibleMonth, setVisibleMonth] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  const [data, setData] = useState<TimeOffMonthResponse | null>(null);
  const [goldenWeekendData, setGoldenWeekendData] =
    useState<GoldenWeekendsMonthResponse | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { monthStart, monthEnd } = useMemo(
    () => getMonthRange(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  const monthValue = useMemo(
    () => getMonthValue(visibleMonth.year, visibleMonth.monthIndex),
    [visibleMonth.year, visibleMonth.monthIndex]
  );

  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      try {
        setLoading(true);
        setError(null);

        const [timeOffResponse, goldenWeekendsResponse] = await Promise.all([
          fetch(
            `/api/program/time-off/month?monthStart=${encodeURIComponent(
              monthStart
            )}&monthEnd=${encodeURIComponent(monthEnd)}`,
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
          fetch(
            `/api/me/calls/golden-weekends?month=${encodeURIComponent(monthValue)}`,
            {
              credentials: "include",
              cache: "no-store",
            }
          ),
        ]);

        const rawTimeOffPayload = await timeOffResponse.json().catch(() => null);
        const rawGoldenPayload = await goldenWeekendsResponse
          .json()
          .catch(() => null);

        if (!timeOffResponse.ok) {
          throw new Error(
            rawTimeOffPayload &&
              typeof rawTimeOffPayload === "object" &&
              "error" in rawTimeOffPayload
              ? String(
                  (rawTimeOffPayload as { error?: unknown }).error ??
                    "Failed to load time-off"
                )
              : "Failed to load time-off"
          );
        }

        if (!goldenWeekendsResponse.ok) {
          throw new Error(
            rawGoldenPayload &&
              typeof rawGoldenPayload === "object" &&
              "error" in rawGoldenPayload
              ? String(
                  (rawGoldenPayload as { error?: unknown }).error ??
                    "Failed to load golden weekends"
                )
              : "Failed to load golden weekends"
          );
        }

        const timeOffPayload = normalizeTimeOffMonthResponse(rawTimeOffPayload);
        const goldenPayload = normalizeGoldenWeekendsResponse(rawGoldenPayload);

        if (!cancelled) {
          setData(timeOffPayload);
          setGoldenWeekendData(goldenPayload);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load time-off"
          );
          setData(null);
          setGoldenWeekendData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      cancelled = true;
    };
  }, [monthStart, monthEnd, monthValue]);

  const items = data?.items ?? [];

  const myActiveItems = useMemo(
    () => items.filter((item) => item.isMine && item.approvalStatus !== "denied"),
    [items]
  );

  const itemsByDate = useMemo(() => {
    const map = new Map<string, TimeOffItem[]>();

    for (const item of myActiveItems) {
      const keys = enumerateDateKeys(item.startDate, item.endDate);

      for (const key of keys) {
        const existing = map.get(key) ?? [];
        existing.push(item);
        map.set(key, existing);
      }
    }

    for (const [key, value] of map.entries()) {
      value.sort((a, b) => {
        const typeOrder = {
          conference: 0,
          personal: 1,
        } as const;

        return typeOrder[a.type] - typeOrder[b.type];
      });
      map.set(key, value);
    }

    return map;
  }, [myActiveItems]);

  const todayKey = toDateKey(new Date());

  const upcomingMyDays = myActiveItems
    .flatMap((item) => enumerateDateKeys(item.startDate, item.endDate))
    .filter((dateKey) => dateKey >= todayKey)
    .sort();

  const nextDayOff = upcomingMyDays[0] ?? null;

  const goldenWeekendsThisMonth = goldenWeekendData?.goldenWeekendCount ?? 0;

  const goldenDates = useMemo(() => {
    const set = new Set<string>();

    for (const weekend of goldenWeekendData?.weekends ?? []) {
      if (weekend.isGoldenWeekend) {
        set.add(weekend.friday);
        set.add(weekend.saturday);
        set.add(weekend.sunday);
      }
    }

    return set;
  }, [goldenWeekendData]);

  const selectedDayItems = selectedDateKey
    ? itemsByDate.get(selectedDateKey) ?? []
    : [];

  const selectedDayIsGoldenWeekend = selectedDateKey
    ? goldenDates.has(selectedDateKey)
    : false;

  const myConferenceDays = myActiveItems
    .filter((item) => item.type === "conference")
    .reduce(
      (sum, item) => sum + enumerateDateKeys(item.startDate, item.endDate).length,
      0
    );

  const requestedCount = myActiveItems.filter(
    (item) => item.approvalStatus === "requested"
  ).length;

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
                    <CalendarDays className="h-4 w-4" />
                    SnapOrtho
                  </div>
                  <h1 className="mt-5 text-4xl font-black tracking-tight text-white md:text-6xl">
                    Time-Off Planner
                  </h1>
                  <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 md:text-lg">
                    Keep your own time away organized with a clean monthly view
                    for conference and personal requests, PTO usage, and golden
                    weekends from your call schedule.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <StatCard
                    title="Visible Month"
                    value={monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    subtitle={`${formatShortDate(monthStart)} – ${formatShortDate(monthEnd)}`}
                  />
                  <StatCard
                    title="Next Day Off"
                    value={nextDayOff ? formatShortDate(nextDayOff) : "—"}
                    subtitle={
                      nextDayOff
                        ? "Your next requested or approved day away"
                        : "No upcoming day off in view"
                    }
                  />
                  <StatCard
                    title="Golden Weekends"
                    value={String(goldenWeekendsThisMonth)}
                    subtitle="Based on having no Fri, Sat, or Sun call"
                  />
                  <StatCard
                    title="Requested"
                    value={String(requestedCount)}
                    subtitle={
                      myConferenceDays > 0
                        ? `${myConferenceDays} conference day${
                            myConferenceDays === 1 ? "" : "s"
                          } visible this month`
                        : "No conference days visible this month"
                    }
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
                      My Time-Off Calendar
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                      {monthLabel(visibleMonth.year, visibleMonth.monthIndex)}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Personal planning view for your time away
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
                  onClick={() => router.push("/work/time-off/add")}
                  className="inline-flex items-center gap-2 self-start rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
                >
                  <Plus className="h-4 w-4" />
                  Add Time-Off
                </button>
              </div>

              <div className="mb-5 flex flex-wrap items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-3">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-slate-900" />
                  Personal
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  Conference
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                  PTO
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  Golden weekend
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  Requested
                </div>
                <div className="h-4 w-px bg-slate-200" />
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  Approved
                </div>
              </div>

              <TimeOffMonthCalendar
                year={visibleMonth.year}
                monthIndex={visibleMonth.monthIndex}
                items={items}
                goldenDates={goldenDates}
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
  title="Time-Off Day Details"
  subtitle="See all time-off entries and golden weekend context for this day."
  dateLabel={formatLongDate(selectedDateKey)}
>
  {() => (
    <TimeOffDayDetailsContent
      items={selectedDayItems}
      isGoldenWeekend={selectedDayIsGoldenWeekend}
    />
  )}
</DayDetailsModal>
    </>
  );
}