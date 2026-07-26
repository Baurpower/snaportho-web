"use client";

import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Filter,
  LayoutGrid,
  List,
  Users,
  PlaneTakeoff,
  Clock3,
  UserRound,
} from "lucide-react";
import type {
  TimeOffItem,
  TimeOffType,
  ApprovalStatus,
} from "@/lib/workspace/call/time-off-shared";
import { getTimeOffTypeLabel } from "@/lib/workspace/call/time-off-shared";
import {
  buildMonthCells,
  buildProgramKpis,
  createDefaultProgramFilters,
  filterProgramTimeOffItems,
  findOverlappingPairs,
  formatDateRange,
  formatShortDate,
  getApprovalTone,
  getDayCount,
  getTimeOffTone,
  groupItemsByResident,
  itemsForDate,
  sortByStartDate,
  toDateKey,
  type ProgramTimeOffFilters,
  type ProgramTimeOffViewMode,
} from "./time-off-display";

const TYPE_OPTIONS: TimeOffType[] = [
  "vacation",
  "conference",
  "personal",
  "sick",
  "other",
];

const STATUS_OPTIONS: ApprovalStatus[] = ["requested", "approved", "denied"];

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
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {title}
      </p>
      <p className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
    </div>
  );
}

function ViewToggle({
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
      className={`inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-white text-slate-700 hover:bg-slate-50 border border-slate-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function toggleInSet<T>(set: Set<T> | null, value: T, allValues: T[]): Set<T> | null {
  const current = set ? new Set(set) : new Set(allValues);
  if (current.has(value)) current.delete(value);
  else current.add(value);
  if (current.size === 0 || current.size === allValues.length) return null;
  return current;
}

export default function ProgramTimeOffDashboard({
  items,
  year,
  monthIndex,
  viewMode,
  loading,
  onOpenItem,
}: {
  items: TimeOffItem[];
  year: number;
  monthIndex: number;
  viewMode: "month" | "year";
  loading: boolean;
  onOpenItem: (item: TimeOffItem) => void;
}) {
  const [panelView, setPanelView] = useState<ProgramTimeOffViewMode>("list");
  const [filters, setFilters] = useState<ProgramTimeOffFilters>(
    createDefaultProgramFilters
  );
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);
  const [expandedResidents, setExpandedResidents] = useState<Set<string>>(
    () => new Set()
  );

  const todayKey = toDateKey(new Date());

  const filtered = useMemo(
    () => filterProgramTimeOffItems(items, filters),
    [items, filters]
  );

  const kpis = useMemo(
    () => buildProgramKpis(filtered, todayKey),
    [filtered, todayKey]
  );

  const byResident = useMemo(
    () => groupItemsByResident(filtered),
    [filtered]
  );

  const overlaps = useMemo(
    () => findOverlappingPairs(filtered).slice(0, 8),
    [filtered]
  );

  const monthCells = useMemo(
    () => (viewMode === "month" ? buildMonthCells(year, monthIndex) : []),
    [viewMode, year, monthIndex]
  );

  const dayItems = selectedDateKey
    ? itemsForDate(filtered, selectedDateKey)
    : [];

  const sortedList = useMemo(() => sortByStartDate(filtered), [filtered]);

  function toggleResident(key: string) {
    setExpandedResidents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          title="Events"
          value={loading ? "…" : String(kpis.eventCount)}
          subtitle="In visible range"
        />
        <StatCard
          title="Pending"
          value={loading ? "…" : String(kpis.pending)}
          subtitle="Awaiting approval"
        />
        <StatCard
          title="Out today"
          value={loading ? "…" : String(kpis.outToday)}
          subtitle="Residents with time off today"
        />
        <StatCard
          title="PTO days"
          value={loading ? "…" : String(kpis.ptoDays)}
          subtitle="Calendar days using PTO"
        />
        <StatCard
          title="Conference days"
          value={loading ? "…" : String(kpis.conferenceDays)}
          subtitle="Conference calendar days"
        />
      </div>

      <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <Filter className="h-4 w-4 text-slate-500" />
            Filters
          </div>
          <button
            type="button"
            className="text-sm font-semibold text-sky-700 hover:text-sky-900"
            onClick={() => setFilters(createDefaultProgramFilters())}
          >
            Reset
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Resident / title search
            </span>
            <input
              value={filters.residentQuery}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  residentQuery: e.target.value,
                }))
              }
              placeholder="Search name, title, notes…"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-sky-200 focus:bg-white focus:ring-2"
            />
          </label>

          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Using PTO
            </span>
            <select
              value={filters.usingPto}
              onChange={(e) =>
                setFilters((prev) => ({
                  ...prev,
                  usingPto: e.target.value as ProgramTimeOffFilters["usingPto"],
                }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 outline-none ring-sky-200 focus:bg-white focus:ring-2"
            >
              <option value="all">All</option>
              <option value="yes">Uses PTO</option>
              <option value="no">No PTO</option>
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {TYPE_OPTIONS.map((type) => {
            const active =
              !filters.types || filters.types.has(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    types: toggleInSet(prev.types, type, TYPE_OPTIONS),
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {getTimeOffTypeLabel(type)}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => {
            const active =
              !filters.statuses || filters.statuses.has(status);
            return (
              <button
                key={status}
                type="button"
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    statuses: toggleInSet(prev.statuses, status, STATUS_OPTIONS),
                  }))
                }
                className={`rounded-full px-3 py-1.5 text-xs font-bold uppercase tracking-[0.1em] transition ${
                  active
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <ViewToggle
          active={panelView === "list"}
          label="List"
          icon={<List className="h-4 w-4" />}
          onClick={() => setPanelView("list")}
        />
        <ViewToggle
          active={panelView === "calendar"}
          label="Calendar"
          icon={<LayoutGrid className="h-4 w-4" />}
          onClick={() => setPanelView("calendar")}
        />
        <ViewToggle
          active={panelView === "resident"}
          label="By resident"
          icon={<Users className="h-4 w-4" />}
          onClick={() => setPanelView("resident")}
        />
        <span className="ml-auto text-sm text-slate-500">
          {filtered.length} of {items.length} events
        </span>
      </div>

      {overlaps.length > 0 ? (
        <div className="rounded-[1.25rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <p className="font-semibold">
            {overlaps.length} overlapping pair{overlaps.length === 1 ? "" : "s"} for the same resident (review only)
          </p>
          <ul className="mt-2 space-y-1 text-amber-900/90">
            {overlaps.slice(0, 4).map(({ a, b }) => (
              <li key={`${a.id}-${b.id}`}>
                <span className="font-medium">{a.residentName}</span>:{" "}
                {a.title ?? getTimeOffTypeLabel(a.type)} (
                {formatShortDate(a.startDate)}) ↔{" "}
                {b.title ?? getTimeOffTypeLabel(b.type)} (
                {formatShortDate(b.startDate)})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {panelView === "list" ? (
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-4 py-3">Resident</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Dates</th>
                  <th className="px-4 py-3">Days</th>
                  <th className="px-4 py-3">PTO</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Title</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      Loading program time off…
                    </td>
                  </tr>
                ) : sortedList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                      {items.length === 0
                        ? "No program time-off events in this range."
                        : "No events match the current filters."}
                    </td>
                  </tr>
                ) : (
                  sortedList.map((item) => {
                    const tone = getTimeOffTone(item);
                    const approval = getApprovalTone(item.approvalStatus);
                    return (
                      <tr
                        key={item.id}
                        className="cursor-pointer border-t border-slate-100 hover:bg-slate-50/80"
                        onClick={() => onOpenItem(item)}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {item.residentName}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${tone.badge}`}
                          >
                            {tone.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {formatDateRange(item.startDate, item.endDate)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {getDayCount(item.startDate, item.endDate)}
                        </td>
                        <td className="px-4 py-3">
                          {item.usingPto ? (
                            <span className="inline-flex items-center gap-1 text-sky-700">
                              <PlaneTakeoff className="h-3.5 w-3.5" />
                              Yes
                            </span>
                          ) : (
                            <span className="text-slate-400">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${approval.className}`}
                          >
                            {approval.label}
                          </span>
                        </td>
                        <td className="max-w-[16rem] truncate px-4 py-3 text-slate-600">
                          {item.title ?? "—"}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {panelView === "calendar" ? (
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            {viewMode !== "month" ? (
              <p className="text-sm text-slate-600">
                Switch to <span className="font-semibold">Month</span> view for
                the density calendar. Year mode is best with List or By resident.
              </p>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                    <div key={d} className="py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {monthCells.map((cell, idx) => {
                    if (!cell.dateKey) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          className="min-h-[4.5rem] rounded-xl bg-slate-50/50"
                        />
                      );
                    }
                    const dayList = itemsForDate(filtered, cell.dateKey);
                    const isToday = cell.dateKey === todayKey;
                    const isSelected = cell.dateKey === selectedDateKey;
                    return (
                      <button
                        key={cell.dateKey}
                        type="button"
                        onClick={() => setSelectedDateKey(cell.dateKey)}
                        className={`min-h-[4.5rem] rounded-xl border p-1.5 text-left transition ${
                          isSelected
                            ? "border-sky-400 bg-sky-50 ring-2 ring-sky-200"
                            : isToday
                              ? "border-slate-300 bg-white"
                              : "border-slate-100 bg-white hover:border-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-bold ${
                              isToday ? "text-sky-700" : "text-slate-700"
                            }`}
                          >
                            {cell.day}
                          </span>
                          {dayList.length > 0 ? (
                            <span className="rounded-full bg-slate-900 px-1.5 py-0.5 text-[10px] font-bold text-white">
                              {dayList.length}
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-0.5">
                          {dayList.slice(0, 4).map((item) => {
                            const tone = getTimeOffTone(item);
                            return (
                              <span
                                key={item.id}
                                title={item.residentName}
                                className={`h-1.5 w-1.5 rounded-full ${tone.dot}`}
                              />
                            );
                          })}
                        </div>
                        {dayList[0] ? (
                          <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-slate-500">
                            {dayList[0].residentName.split(" ").slice(-1)[0]}
                            {dayList.length > 1
                              ? ` +${dayList.length - 1}`
                              : ""}
                          </p>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-4 shadow-sm md:p-5">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-slate-500" />
              <h3 className="text-lg font-bold text-slate-950">
                {selectedDateKey
                  ? formatShortDate(selectedDateKey)
                  : "Select a day"}
              </h3>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Residents out on this date across the program.
            </p>

            <div className="mt-4 space-y-2">
              {!selectedDateKey ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  Click a day on the calendar to see who is out.
                </p>
              ) : dayItems.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
                  Nobody is out on this day (with current filters).
                </p>
              ) : (
                dayItems.map((item) => {
                  const tone = getTimeOffTone(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onOpenItem(item)}
                      className={`w-full rounded-xl border p-3 text-left transition hover:shadow-sm ${tone.card}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-slate-950">
                            {item.residentName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-600">
                            {formatDateRange(item.startDate, item.endDate)} ·{" "}
                            {tone.label}
                          </p>
                          {item.title ? (
                            <p className="mt-1 line-clamp-1 text-sm text-slate-700">
                              {item.title}
                            </p>
                          ) : null}
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      ) : null}

      {panelView === "resident" ? (
        <div className="space-y-3">
          {loading ? (
            <p className="rounded-[1.5rem] border border-slate-200 bg-white px-4 py-10 text-center text-sm text-slate-500">
              Loading…
            </p>
          ) : byResident.length === 0 ? (
            <p className="rounded-[1.5rem] border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              {items.length === 0
                ? "No program time-off events in this range."
                : "No residents match the current filters."}
            </p>
          ) : (
            byResident.map((group) => {
              const open = expandedResidents.has(group.key);
              return (
                <div
                  key={group.key}
                  className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleResident(group.key)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                      <UserRound className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-950">
                        {group.residentName}
                      </p>
                      <p className="text-sm text-slate-500">
                        {group.items.length} event
                        {group.items.length === 1 ? "" : "s"} · {group.totalDays}{" "}
                        days · {group.ptoDays} PTO · {group.conferenceDays} conf
                      </p>
                    </div>
                    {open ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                  {open ? (
                    <div className="space-y-2 border-t border-slate-100 px-4 py-3">
                      {group.items.map((item) => {
                        const tone = getTimeOffTone(item);
                        const approval = getApprovalTone(item.approvalStatus);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => onOpenItem(item)}
                            className={`flex w-full items-start justify-between gap-3 rounded-xl border p-3 text-left ${tone.card}`}
                          >
                            <div>
                              <div className="flex flex-wrap gap-1.5">
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${tone.badge}`}
                                >
                                  {tone.label}
                                </span>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${approval.className}`}
                                >
                                  {approval.label}
                                </span>
                                {item.usingPto ? (
                                  <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-sky-700">
                                    <PlaneTakeoff className="h-3 w-3" />
                                    PTO
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 font-semibold text-slate-900">
                                {item.title ?? tone.label}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {formatDateRange(item.startDate, item.endDate)} ·{" "}
                                {getDayCount(item.startDate, item.endDate)} day
                                {getDayCount(item.startDate, item.endDate) === 1
                                  ? ""
                                  : "s"}
                              </p>
                            </div>
                            <Clock3 className="h-4 w-4 shrink-0 text-slate-400" />
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
