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
  MapPin,
  ArrowRight,
  CalendarRange,
  Calendar,
  FileText,
  BadgeCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";
import TimeOffDayDetailsContent from "@/components/workspace/time-off/timeoffdaydetailscontent";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

type PlannerViewMode = "month" | "year";
type TimeOffType = "personal" | "conference";
type ApprovalStatus = "requested" | "approved" | "denied";

type TimeOffItem = {
  id: string;
  membershipId: string | null;
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

function yearLabel(year: number) {
  return String(year);
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

function formatDateRange(startDate: string | null, endDate: string | null) {
  if (!startDate) return "—";

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate ?? startDate}T00:00:00`);

  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  const sameDay = sameMonth && start.getDate() === end.getDate();

  if (sameDay) {
    return start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  if (sameMonth) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.getDate()}, ${end.getFullYear()}`;
  }

  if (sameYear) {
    return `${start.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })} – ${end.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })}`;
  }

  return `${start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} – ${end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
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

function getDayCount(startDate: string | null, endDate: string | null) {
  return enumerateDateKeys(startDate, endDate).length;
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

function SegmentToggle({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function getTimeOffTone(item: TimeOffItem) {
  if (item.type === "conference") {
    return {
      card: item.isMine
        ? "border-violet-300 bg-violet-50"
        : "border-violet-200 bg-violet-50/70",
      badge: "bg-violet-600 text-white",
      icon: <BriefcaseMedical className="h-4 w-4 shrink-0" />,
      text: "text-violet-950",
      label: "Conference",
    };
  }

  return {
    card: item.isMine
      ? "border-slate-300 bg-slate-100"
      : "border-slate-200 bg-slate-50",
    badge: "bg-slate-900 text-white",
    icon: <UserRound className="h-4 w-4 shrink-0" />,
    text: "text-slate-950",
    label: "Personal",
  };
}

function getApprovalTone(status: ApprovalStatus | null | undefined) {
  if (status === "approved") {
    return {
      label: "Approved",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
      icon: <CheckCircle2 className="h-4 w-4" />,
    };
  }

  if (status === "denied") {
    return {
      label: "Denied",
      className: "bg-rose-100 text-rose-700 border border-rose-200",
      icon: <XCircle className="h-4 w-4" />,
    };
  }

  return {
    label: "Requested",
    className: "bg-amber-100 text-amber-700 border border-amber-200",
    icon: <Clock3 className="h-4 w-4" />,
  };
}

function sortByStartDate(items: TimeOffItem[]) {
  return [...items].sort((a, b) =>
    (a.startDate ?? "").localeCompare(b.startDate ?? "")
  );
}

function EmptyState({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-5 py-8 text-center">
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  count,
  icon,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-bold tracking-tight text-slate-950">
            {title}
          </h3>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        </div>
      </div>

      <div className="shrink-0 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600">
        {count}
      </div>
    </div>
  );
}

function DetailField({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex items-center gap-2">
        {icon ? <div className="text-slate-500">{icon}</div> : null}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
      </div>
      <div className="mt-2 text-sm font-medium text-slate-900">{value}</div>
    </div>
  );
}

function TimeOffRequestCard({
  item,
  onOpen,
}: {
  item: TimeOffItem;
  onOpen: (item: TimeOffItem) => void;
}) {
  const tone = getTimeOffTone(item);
  const approvalTone = getApprovalTone(item.approvalStatus);
  const duration = getDayCount(item.startDate, item.endDate);

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`w-full rounded-[1.5rem] border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${tone.card}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${tone.badge}`}
            >
              {tone.icon}
              {tone.label}
            </span>

            {item.usingPto ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-sky-700">
                <PlaneTakeoff className="h-3.5 w-3.5" />
                PTO
              </span>
            ) : null}

            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] ${approvalTone.className}`}
            >
              {approvalTone.icon}
              {approvalTone.label}
            </span>
          </div>

          <h4 className={`mt-4 text-xl font-bold tracking-tight ${tone.text}`}>
            {item.title ?? (item.type === "conference" ? "Conference" : "Time off")}
          </h4>

          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
            <span className="font-medium">
              {formatDateRange(item.startDate, item.endDate)}
            </span>
            <span>
              {duration} day{duration === 1 ? "" : "s"}
            </span>
            {item.location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {item.location}
              </span>
            ) : null}
          </div>

          {item.notes ? (
            <p className="mt-3 line-clamp-2 text-sm text-slate-500">
              {item.notes}
            </p>
          ) : null}
        </div>

        <div className="hidden shrink-0 md:flex md:items-center">
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700">
            Open
          </div>
        </div>
      </div>
    </button>
  );
}

function TimeOffListSection({
  title,
  subtitle,
  count,
  icon,
  items,
  emptyTitle,
  emptySubtitle,
  onOpen,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: React.ReactNode;
  items: TimeOffItem[];
  emptyTitle: string;
  emptySubtitle: string;
  onOpen: (item: TimeOffItem) => void;
}) {
  return (
    <section className="space-y-4">
      <SectionHeader
        title={title}
        subtitle={subtitle}
        count={count}
        icon={icon}
      />

      {items.length === 0 ? (
        <EmptyState title={emptyTitle} subtitle={emptySubtitle} />
      ) : (
        <div className="grid gap-4">
          {items.map((item) => (
            <TimeOffRequestCard key={item.id} item={item} onOpen={onOpen} />
          ))}
        </div>
      )}
    </section>
  );
}

function StatusBoard({
  requestedItems,
  approvedItems,
  deniedItems,
  onOpen,
}: {
  requestedItems: TimeOffItem[];
  approvedItems: TimeOffItem[];
  deniedItems: TimeOffItem[];
  onOpen: (item: TimeOffItem) => void;
}) {
  const columns = [
    {
      key: "requested",
      title: "Pending Approval",
      subtitle: "Still waiting on a decision.",
      items: requestedItems,
      emptyTitle: "No pending requests",
      emptySubtitle: "Nothing is currently waiting for approval.",
      shell: "border-amber-200 bg-amber-50/50",
    },
    {
      key: "approved",
      title: "Approved",
      subtitle: "Cleared and ready to plan around.",
      items: approvedItems,
      emptyTitle: "No approved requests",
      emptySubtitle: "No approved time-off entries are visible.",
      shell: "border-emerald-200 bg-emerald-50/50",
    },
    {
      key: "denied",
      title: "Denied",
      subtitle: "Requests that were not approved.",
      items: deniedItems,
      emptyTitle: "No denied requests",
      emptySubtitle: "Nothing has been denied in this view.",
      shell: "border-rose-200 bg-rose-50/50",
    },
  ];

  return (
    <section className="space-y-4">
      <SectionHeader
        title="Status Board"
        subtitle="A quick way to understand where every request stands."
        count={requestedItems.length + approvedItems.length + deniedItems.length}
        icon={<CalendarDays className="h-5 w-5" />}
      />

      <div className="grid gap-4 xl:grid-cols-3">
        {columns.map((column) => (
          <div
            key={column.key}
            className={`rounded-[1.5rem] border p-4 ${column.shell}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 className="text-lg font-bold tracking-tight text-slate-950">
                  {column.title}
                </h4>
                <p className="mt-1 text-sm text-slate-500">{column.subtitle}</p>
              </div>

              <div className="rounded-full border border-white/80 bg-white px-3 py-1 text-sm font-semibold text-slate-700">
                {column.items.length}
              </div>
            </div>

            {column.items.length === 0 ? (
              <EmptyState
                title={column.emptyTitle}
                subtitle={column.emptySubtitle}
              />
            ) : (
              <div className="space-y-3">
                {column.items.map((item) => (
                  <TimeOffRequestCard key={item.id} item={item} onOpen={onOpen} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default function TimeOffHubPage() {
  const now = new Date();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<PlannerViewMode>("month");
  const [visibleDate, setVisibleDate] = useState({
    year: now.getFullYear(),
    monthIndex: now.getMonth(),
  });

  const [data, setData] = useState<TimeOffMonthResponse | null>(null);
  const [goldenWeekendData, setGoldenWeekendData] =
    useState<GoldenWeekendsMonthResponse | null>(null);
  const [selectedItem, setSelectedItem] = useState<TimeOffItem | null>(null);
  const [draftItem, setDraftItem] = useState<TimeOffItem | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { monthStart, monthEnd } = useMemo(
    () => getMonthRange(visibleDate.year, visibleDate.monthIndex),
    [visibleDate.year, visibleDate.monthIndex]
  );

  const monthValue = useMemo(
    () => getMonthValue(visibleDate.year, visibleDate.monthIndex),
    [visibleDate.year, visibleDate.monthIndex]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadPageData() {
      try {
        setLoading(true);
        setError(null);

        if (viewMode === "month") {
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
              `/api/me/calls/golden-weekends?month=${encodeURIComponent(
                monthValue
              )}`,
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

          return;
        }

        const monthIndexes = Array.from({ length: 12 }, (_, index) => index);

        const [timeOffResults, goldenResults] = await Promise.all([
          Promise.all(
            monthIndexes.map(async (monthIndex) => {
              const range = getMonthRange(visibleDate.year, monthIndex);

              const response = await fetch(
                `/api/program/time-off/month?monthStart=${encodeURIComponent(
                  range.monthStart
                )}&monthEnd=${encodeURIComponent(range.monthEnd)}`,
                {
                  credentials: "include",
                  cache: "no-store",
                }
              );

              const rawPayload = await response.json().catch(() => null);

              if (!response.ok) {
                throw new Error(
                  rawPayload &&
                    typeof rawPayload === "object" &&
                    "error" in rawPayload
                    ? String(
                        (rawPayload as { error?: unknown }).error ??
                          "Failed to load yearly time-off"
                      )
                    : "Failed to load yearly time-off"
                );
              }

              return normalizeTimeOffMonthResponse(rawPayload);
            })
          ),
          Promise.all(
            monthIndexes.map(async (monthIndex) => {
              const response = await fetch(
                `/api/me/calls/golden-weekends?month=${encodeURIComponent(
                  getMonthValue(visibleDate.year, monthIndex)
                )}`,
                {
                  credentials: "include",
                  cache: "no-store",
                }
              );

              const rawPayload = await response.json().catch(() => null);

              if (!response.ok) {
                throw new Error(
                  rawPayload &&
                    typeof rawPayload === "object" &&
                    "error" in rawPayload
                    ? String(
                        (rawPayload as { error?: unknown }).error ??
                          "Failed to load yearly golden weekends"
                      )
                    : "Failed to load yearly golden weekends"
                );
              }

              return normalizeGoldenWeekendsResponse(rawPayload);
            })
          ),
        ]);

        const combinedItems = timeOffResults.flatMap((result) => result.items);
        const firstMonth = timeOffResults[0];
        const lastMonth = timeOffResults[timeOffResults.length - 1];

        const mergedGoldenWeekendCount = goldenResults.reduce(
          (sum, item) => sum + item.goldenWeekendCount,
          0
        );
        const mergedGoldenWeekends = goldenResults.flatMap((item) => item.weekends);

        if (!cancelled) {
          setData({
            monthStart: firstMonth?.monthStart ?? "",
            monthEnd: lastMonth?.monthEnd ?? "",
            myMembershipId: firstMonth?.myMembershipId ?? null,
            items: combinedItems,
          });

          setGoldenWeekendData({
            month: String(visibleDate.year),
            membershipId: goldenResults[0]?.membershipId ?? "",
            goldenWeekendCount: mergedGoldenWeekendCount,
            weekends: mergedGoldenWeekends,
          });
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load time-off");
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
  }, [viewMode, visibleDate.year, visibleDate.monthIndex, monthStart, monthEnd, monthValue]);

  useEffect(() => {
    if (!selectedItem) {
      setDraftItem(null);
      return;
    }

    const freshest =
      data?.items.find((item) => item.id === selectedItem.id) ?? selectedItem;

    setDraftItem(freshest);
  }, [selectedItem, data]);

  const items = data?.items ?? [];

  const myItems = useMemo(() => items.filter((item) => item.isMine), [items]);

  const myVisibleItems = useMemo(
    () => myItems.filter((item) => item.approvalStatus !== "denied"),
    [myItems]
  );

  const todayKey = toDateKey(new Date());

  const upcomingItems = useMemo(
    () =>
      sortByStartDate(
        myVisibleItems.filter(
          (item) => (item.endDate ?? item.startDate ?? "") >= todayKey
        )
      ),
    [myVisibleItems, todayKey]
  );

  const requestedItems = useMemo(
    () => sortByStartDate(myItems.filter((item) => item.approvalStatus === "requested")),
    [myItems]
  );

  const approvedItems = useMemo(
    () => sortByStartDate(myItems.filter((item) => item.approvalStatus === "approved")),
    [myItems]
  );

  const deniedItems = useMemo(
    () => sortByStartDate(myItems.filter((item) => item.approvalStatus === "denied")),
    [myItems]
  );

  const nextDayOff = useMemo(() => {
    const nextItem = upcomingItems[0] ?? null;
    return nextItem?.startDate ?? null;
  }, [upcomingItems]);

  const myConferenceDays = myVisibleItems
    .filter((item) => item.type === "conference")
    .reduce(
      (sum, item) => sum + enumerateDateKeys(item.startDate, item.endDate).length,
      0
    );

  const myPersonalDays = myVisibleItems
    .filter((item) => item.type === "personal")
    .reduce(
      (sum, item) => sum + enumerateDateKeys(item.startDate, item.endDate).length,
      0
    );

  const requestedCount = requestedItems.length;
  const approvedCount = approvedItems.length;
  const goldenWeekendsThisPeriod = goldenWeekendData?.goldenWeekendCount ?? 0;

  const selectedDayItems =
    selectedDateKey && !selectedItem
      ? myVisibleItems.filter((item) =>
          enumerateDateKeys(item.startDate, item.endDate).includes(selectedDateKey)
        )
      : selectedItem
      ? [selectedItem]
      : [];

  const selectedDayIsGoldenWeekend = selectedDateKey
    ? (goldenWeekendData?.weekends ?? []).some(
        (weekend) =>
          weekend.isGoldenWeekend &&
          (weekend.friday === selectedDateKey ||
            weekend.saturday === selectedDateKey ||
            weekend.sunday === selectedDateKey)
      )
    : false;

  const modalDateLabel = selectedItem
    ? formatDateRange(selectedItem.startDate, selectedItem.endDate)
    : formatLongDate(selectedDateKey);

  const visibleHeading =
    viewMode === "month"
      ? monthLabel(visibleDate.year, visibleDate.monthIndex)
      : yearLabel(visibleDate.year);

  const visibleSubheading =
    viewMode === "month"
      ? "Easier to scan than a calendar and better for planning."
      : "A full-year planning view for conferences, PTO, and major time away.";

  const topSummaryLabel =
    viewMode === "month"
      ? `${formatShortDate(monthStart)} – ${formatShortDate(monthEnd)}`
      : `Jan 1 – Dec 31, ${visibleDate.year}`;

  function goPrevious() {
    setVisibleDate((prev) => {
      if (viewMode === "month") {
        const nextDate = new Date(prev.year, prev.monthIndex - 1, 1);
        return {
          year: nextDate.getFullYear(),
          monthIndex: nextDate.getMonth(),
        };
      }

      return {
        year: prev.year - 1,
        monthIndex: prev.monthIndex,
      };
    });
  }

  function goNext() {
    setVisibleDate((prev) => {
      if (viewMode === "month") {
        const nextDate = new Date(prev.year, prev.monthIndex + 1, 1);
        return {
          year: nextDate.getFullYear(),
          monthIndex: nextDate.getMonth(),
        };
      }

      return {
        year: prev.year + 1,
        monthIndex: prev.monthIndex,
      };
    });
  }

  function updateDraft<K extends keyof TimeOffItem>(key: K, value: TimeOffItem[K]) {
    setDraftItem((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

 async function handleSaveSelectedItem() {
  if (!draftItem || !data) return;

  try {
    setSaving(true);
    setError(null);

    const response = await fetch(`/api/program/time-off/${draftItem.id}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        eventType: draftItem.type,
        usingPto: draftItem.usingPto,
        startDate: draftItem.startDate,
        endDate: draftItem.endDate,
        title: draftItem.title,
        location: draftItem.location,
        notes: draftItem.notes,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      console.error("PATCH /api/program/time-off/[id] failed", {
        status: response.status,
        payload,
      });
      throw new Error(
        payload?.error ?? `Failed to save time-off request (${response.status})`
      );
    }

    const updatedItem: TimeOffItem =
      payload && typeof payload === "object" && "item" in payload
        ? ((payload as { item: TimeOffItem }).item ?? draftItem)
        : draftItem;

    setData((prev) =>
      prev
        ? {
            ...prev,
            items: prev.items.map((item) =>
              item.id === updatedItem.id ? { ...item, ...updatedItem } : item
            ),
          }
        : prev
    );

    setSelectedItem(updatedItem);
    setDraftItem(updatedItem);
    setSelectedDateKey(updatedItem.startDate);
  } catch (err) {
    setError(
      err instanceof Error ? err.message : "Failed to save time-off request"
    );
  } finally {
    setSaving(false);
  }
}

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
                    A cleaner planning view for your requests, approvals, trips,
                    and conferences.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard
                    title="Next Day Off"
                    value={nextDayOff ? formatShortDate(nextDayOff) : "—"}
                    subtitle={
                      nextDayOff
                        ? "Your next approved or requested day away"
                        : "No upcoming time-off in view"
                    }
                  />
                  <StatCard
                    title={viewMode === "month" ? "Golden Weekends" : "Golden Weekends This Year"}
                    value={String(goldenWeekendsThisPeriod)}
                    subtitle={
                      viewMode === "month"
                        ? "Full Fri–Sun weekends without call"
                        : "Full Fri–Sun weekends without call across the year"
                    }
                  />
                  <StatCard
                    title="Visible Days Away"
                    value={String(myPersonalDays + myConferenceDays)}
                    subtitle={`${myPersonalDays} personal • ${myConferenceDays} conference`}
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
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={goPrevious}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                      My Requests
                    </p>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
                      {visibleHeading}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">{visibleSubheading}</p>
                  </div>

                  <button
                    type="button"
                    onClick={goNext}
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div className="flex items-center gap-2 rounded-full bg-slate-100 p-1.5">
                    <SegmentToggle
                      active={viewMode === "month"}
                      label="Month"
                      icon={<Calendar className="h-4 w-4" />}
                      onClick={() => setViewMode("month")}
                    />
                    <SegmentToggle
                      active={viewMode === "year"}
                      label="Year"
                      icon={<CalendarRange className="h-4 w-4" />}
                      onClick={() => setViewMode("year")}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/work/time-off/add")}
                    className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-950 transition hover:border-sky-300 hover:bg-sky-100"
                  >
                    <Plus className="h-4 w-4" />
                    Add Time-Off
                  </button>
                </div>
              </div>

              <div className="mb-6 grid gap-3 md:grid-cols-4">
                <div className="rounded-[1.25rem] border border-slate-200 bg-slate-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Visible Range
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-900">
                    {viewMode === "month" ? "Month" : "Year"}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">{topSummaryLabel}</p>
                </div>

                <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-amber-700">
                    Requested
                  </p>
                  <p className="mt-2 text-2xl font-black text-amber-900">
                    {requestedCount}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-700">
                    Approved
                  </p>
                  <p className="mt-2 text-2xl font-black text-emerald-900">
                    {approvedCount}
                  </p>
                </div>

                <div className="rounded-[1.25rem] border border-violet-200 bg-violet-50 px-4 py-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-violet-700">
                    Conference Days
                  </p>
                  <p className="mt-2 text-2xl font-black text-violet-900">
                    {myConferenceDays}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
                  Loading time-off planner...
                </div>
              ) : (
                <div className="space-y-8">
                  <TimeOffListSection
                    title="Upcoming"
                    subtitle={
                      viewMode === "month"
                        ? "What you have coming up next in this visible month."
                        : "Your next upcoming requests across the visible year."
                    }
                    count={upcomingItems.length}
                    icon={<ArrowRight className="h-5 w-5" />}
                    items={upcomingItems}
                    emptyTitle="No upcoming requests"
                    emptySubtitle="You do not have any visible upcoming time away in this range."
                    onOpen={(item) => {
                      setSelectedItem(item);
                      setSelectedDateKey(item.startDate);
                    }}
                  />

                  <StatusBoard
                    requestedItems={requestedItems}
                    approvedItems={approvedItems}
                    deniedItems={deniedItems}
                    onOpen={(item) => {
                      setSelectedItem(item);
                      setSelectedDateKey(item.startDate);
                    }}
                  />
                </div>
              )}
            </motion.div>
          </div>
        </section>
      </main>

      <DayDetailsModal
        open={!!selectedDateKey || !!selectedItem}
        onClose={() => {
          setSelectedDateKey(null);
          setSelectedItem(null);
          setDraftItem(null);
        }}
        title="Time-Off Details"
        subtitle={
          draftItem
            ? draftItem.title ?? "Time-off request"
            : "See request details."
        }
        dateLabel={draftItem ? formatDateRange(draftItem.startDate, draftItem.endDate) : modalDateLabel}
        onSave={draftItem?.isMine ? handleSaveSelectedItem : undefined}
      >
        {(isEditing) =>
          draftItem ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    getTimeOffTone(draftItem).badge
                  }`}
                >
                  {getTimeOffTone(draftItem).icon}
                  {getTimeOffTone(draftItem).label}
                </div>

                {draftItem.usingPto ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-sky-700">
                    <PlaneTakeoff className="h-4 w-4" />
                    PTO
                  </div>
                ) : null}

                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                    getApprovalTone(draftItem.approvalStatus).className
                  }`}
                >
                  {getApprovalTone(draftItem.approvalStatus).icon}
                  {getApprovalTone(draftItem.approvalStatus).label}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <DetailField
                  label="Title"
                  icon={<BadgeCheck className="h-4 w-4" />}
                  value={
                    isEditing ? (
                      <input
                        value={draftItem.title ?? ""}
                        onChange={(e) => updateDraft("title", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        placeholder="Enter title"
                      />
                    ) : (
                      draftItem.title ?? "—"
                    )
                  }
                />

                <DetailField
                  label="Type"
                  icon={<BriefcaseMedical className="h-4 w-4" />}
                  value={
                    isEditing ? (
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: "personal" as TimeOffType, label: "Personal" },
                          { value: "conference" as TimeOffType, label: "Conference" },
                        ].map((option) => {
                          const active = draftItem.type === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() => updateDraft("type", option.value)}
                              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                                active
                                  ? "bg-slate-900 text-white"
                                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    ) : draftItem.type === "conference" ? (
                      "Conference"
                    ) : (
                      "Personal"
                    )
                  }
                />

                <DetailField
                  label="Start date"
                  icon={<CalendarDays className="h-4 w-4" />}
                  value={
                    isEditing ? (
                      <input
                        type="date"
                        value={draftItem.startDate ?? ""}
                        onChange={(e) => updateDraft("startDate", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      />
                    ) : (
                      formatLongDate(draftItem.startDate)
                    )
                  }
                />

                <DetailField
                  label="End date"
                  icon={<CalendarRange className="h-4 w-4" />}
                  value={
                    isEditing ? (
                      <input
                        type="date"
                        value={draftItem.endDate ?? ""}
                        onChange={(e) => updateDraft("endDate", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      />
                    ) : (
                      formatLongDate(draftItem.endDate ?? draftItem.startDate)
                    )
                  }
                />

                <DetailField
                  label="Location"
                  icon={<MapPin className="h-4 w-4" />}
                  value={
                    isEditing ? (
                      <input
                        value={draftItem.location ?? ""}
                        onChange={(e) => updateDraft("location", e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                        placeholder="Enter location"
                      />
                    ) : (
                      draftItem.location ?? "—"
                    )
                  }
                />

                <DetailField
                  label="PTO"
                  icon={<PlaneTakeoff className="h-4 w-4" />}
                  value={
                    isEditing ? (
                      <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={draftItem.usingPto}
                          onChange={(e) => updateDraft("usingPto", e.target.checked)}
                          className="h-4 w-4 rounded border-slate-300"
                        />
                        Using PTO
                      </label>
                    ) : draftItem.usingPto ? (
                      "Using PTO"
                    ) : (
                      "Not using PTO"
                    )
                  }
                />

                <div className="md:col-span-2">
                  <DetailField
                    label="Notes"
                    icon={<FileText className="h-4 w-4" />}
                    value={
                      isEditing ? (
                        <textarea
                          value={draftItem.notes ?? ""}
                          onChange={(e) => updateDraft("notes", e.target.value)}
                          rows={4}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                          placeholder="Add notes"
                        />
                      ) : (
                        draftItem.notes ?? "—"
                      )
                    }
                  />
                </div>
              </div>

              {saving ? (
                <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700">
                  Saving changes...
                </div>
              ) : null}
            </div>
          ) : (
            <TimeOffDayDetailsContent
              items={selectedDayItems}
              isGoldenWeekend={selectedDayIsGoldenWeekend}
            />
          )
        }
      </DayDetailsModal>
    </>
  );
}