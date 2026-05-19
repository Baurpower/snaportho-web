"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  MapPin,
  Phone,
  Hammer,
  Stethoscope,
  UserRound,
  Clock3,
  CalendarDays,
} from "lucide-react";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";

export type WeekAcademicEvent = {
  id: string;
  title: string;
  eventTypeName: string | null;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  isRequired: boolean;
};

export type WeekDayCard = {
  date: string;
  dayKey: string;
  primaryLabel: string | null;
  dayCategory: "OR" | "Clinic" | "Custom" | null;
  customTitle: string | null;
  location: string | null;
  attending: string | null;
  rotationPill: string | null;
  rotationColor: string | null;
  hasCall: boolean;
  callLabel: string | null;
  academicEvents?: WeekAcademicEvent[];
};

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function formatLongDate(dateString: string | null | undefined) {
  if (!dateString) return "—";
  const date = new Date(`${dateString}T00:00:00`);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getAcademicEventSummary(event: WeekAcademicEvent | null | undefined) {
  if (!event) {
    return {
      timeLabel: null,
      titleLabel: null,
    };
  }

  return {
    timeLabel: event.startTime ?? null,
    titleLabel: event.title?.trim() || null,
  };
}

function getRotationAbbreviation(rotationPill: string | null | undefined) {
  if (!rotationPill) return null;

  const words = rotationPill
    .split(/[\s/-]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return null;

  const initialism = words
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");

  if (initialism.length >= 2 && initialism.length <= 5) {
    return initialism;
  }

  const shortened = words
    .slice(0, 2)
    .map((word) => word.slice(0, 3))
    .join(" ")
    .toUpperCase();

  return shortened !== rotationPill.toUpperCase() ? shortened : null;
}

function getCategoryTone(category: WeekDayCard["dayCategory"]) {
  if (category === "OR") {
    return {
      card: "border-slate-300 bg-slate-200 text-slate-900",
      badge: "bg-slate-800 text-white",
      icon: <Hammer className="h-4 w-4 shrink-0" />,
    };
  }

  if (category === "Clinic") {
    return {
      card: "border-sky-200 bg-sky-50 text-sky-950",
      badge: "bg-sky-600 text-white",
      icon: <Stethoscope className="h-4 w-4 shrink-0" />,
    };
  }

  if (category === "Custom") {
    return {
      card: "border-violet-200 bg-violet-50 text-violet-950",
      badge: "bg-violet-600 text-white",
      icon: <Clock3 className="h-4 w-4 shrink-0" />,
    };
  }

  return {
    card: "border-slate-200 bg-white text-slate-900",
    badge: "bg-slate-200 text-slate-700",
    icon: <Clock3 className="h-4 w-4 shrink-0" />,
  };
}

function getDisplayTitle(day: WeekDayCard) {
  if (day.dayCategory === "Custom") {
    return day.customTitle ?? day.primaryLabel ?? "Custom";
  }

  return day.primaryLabel ?? "Plan week";
}

function getSecondaryLabel(day: WeekDayCard) {
  if (day.dayCategory === "Custom") {
    return "Custom";
  }

  return day.dayCategory ?? "Unplanned";
}

function getRotationPillClasses(rotationColor: string | null) {
  if (!rotationColor) {
    return "bg-black/10 text-slate-800";
  }

  const normalized = rotationColor.toLowerCase();

  if (
    normalized.includes("sky") ||
    normalized.includes("blue") ||
    normalized.startsWith("#")
  ) {
    return "bg-sky-100 text-sky-900";
  }

  if (normalized.includes("emerald") || normalized.includes("green")) {
    return "bg-emerald-100 text-emerald-950";
  }

  if (normalized.includes("violet") || normalized.includes("purple")) {
    return "bg-violet-100 text-violet-950";
  }

  if (normalized.includes("amber") || normalized.includes("yellow")) {
    return "bg-amber-100 text-amber-950";
  }

  if (normalized.includes("rose") || normalized.includes("red")) {
    return "bg-rose-100 text-rose-950";
  }

  return "bg-black/10 text-slate-800";
}

function getSundayFirstIndex(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);
  return date.getDay();
}

function findMatchingDay(days: WeekDayCard[], target: WeekDayCard | null) {
  if (!target) return null;

  return (
    days.find(
      (day) => day.date === target.date && day.dayKey === target.dayKey
    ) ?? null
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

export function WeekScheduleView({
  days,
  loading,
  onSaveDay,
}: {
  days: WeekDayCard[];
  loading?: boolean;
  onSaveDay?: (updatedDay: WeekDayCard) => void | Promise<void>;
}) {
  const [selectedDay, setSelectedDay] = useState<WeekDayCard | null>(null);
  const [draftDay, setDraftDay] = useState<WeekDayCard | null>(null);
  const [localDays, setLocalDays] = useState<WeekDayCard[]>(days);

  useEffect(() => {
    setLocalDays(days);
  }, [days]);

  useEffect(() => {
    if (!selectedDay) {
      setDraftDay(null);
      return;
    }

    const freshest = findMatchingDay(localDays, selectedDay) ?? selectedDay;
    setDraftDay(freshest);
  }, [selectedDay, localDays]);

  const orderedDays = useMemo(() => {
    return [...localDays].sort((a, b) => {
      return getSundayFirstIndex(a.date) - getSundayFirstIndex(b.date);
    });
  }, [localDays]);

  function updateDraft<K extends keyof WeekDayCard>(key: K, value: WeekDayCard[K]) {
    setDraftDay((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setCategory(nextCategory: WeekDayCard["dayCategory"]) {
    setDraftDay((prev) => {
      if (!prev) return prev;

      const next: WeekDayCard = {
        ...prev,
        dayCategory: nextCategory,
      };

      if (nextCategory === "Custom") {
        next.customTitle = prev.customTitle ?? prev.primaryLabel ?? "";
      }

      if (nextCategory !== "Custom") {
        next.customTitle = prev.customTitle;
      }

      return next;
    });
  }

  async function handleSaveDay() {
    if (!draftDay) return;

    setLocalDays((prev) =>
      prev.map((item) =>
        item.date === draftDay.date && item.dayKey === draftDay.dayKey
          ? draftDay
          : item
      )
    );

    if (onSaveDay) {
      await onSaveDay(draftDay);
    }

    setSelectedDay(draftDay);
  }

  if (loading) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        Loading current week...
      </div>
    );
  }

  if (orderedDays.length === 0) {
    return (
      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        No week data found for this range.
      </div>
    );
  }

  const todayKey = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="mt-6">
  <div className="grid grid-cols-7 gap-2 lg:gap-3 xl:gap-4">
          {orderedDays.map((day) => {
            const tone = getCategoryTone(day.dayCategory);
            const isToday = day.date === todayKey;
            const title = getDisplayTitle(day);
            const secondaryLabel = getSecondaryLabel(day);
            const primaryAcademicEvent = day.academicEvents?.[0] ?? null;
            const academicSummary = getAcademicEventSummary(primaryAcademicEvent);
            const academicCount = day.academicEvents?.length ?? 0;
            const rotationAbbreviation = getRotationAbbreviation(day.rotationPill);

            return (
              <button
  key={`${day.dayKey}-${day.date}`}
  type="button"
  onClick={() => setSelectedDay(day)}
  className={`relative min-h-[220px] min-w-0 rounded-[1.25rem] border p-2.5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md lg:p-3 xl:min-h-[250px] xl:p-4 ${tone.card} ${
    isToday ? "ring-2 ring-slate-900/10" : ""
  }`}
>
                <div className="flex h-full flex-col">
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] opacity-70">
      {day.dayKey}
    </p>
    <p className="mt-1 text-lg font-bold leading-tight">
      {formatShortDate(day.date)}
    </p>
  </div>

  {day.hasCall ? (
  <div className="mt-3 flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-xl bg-rose-100 px-2 py-1.5 text-[11px] font-semibold text-rose-700 xl:text-xs">
    <Phone className="h-3.5 w-3.5 shrink-0" />
    <span className="min-w-0 truncate">{day.callLabel ?? "Call"}</span>
  </div>
) : (
  <div className="mt-3 h-[30px]" />
)}

<div className="mt-4 min-h-[48px] xl:mt-5 xl:min-h-[56px]">
  <p className="line-clamp-2 text-base font-bold tracking-tight xl:text-lg">
    {title}
  </p>

  {day.dayCategory ? (
    <div
      className={`mt-2 flex w-fit min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-xl px-2 py-1 text-[11px] font-semibold xl:text-xs ${tone.badge}`}
      title={secondaryLabel}
    >
      {tone.icon}
    </div>
  ) : null}
</div>

<div className="mt-5 space-y-1.5 text-[11px] xl:text-xs">

    {academicCount > 0 ? (
      <div className="flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-xl bg-indigo-100 px-2 py-1.5 font-semibold text-indigo-900">
        <GraduationCap className="h-3.5 w-3.5 shrink-0" />

        {academicSummary.timeLabel ? (
          <span className="shrink-0 font-bold">
            {academicSummary.timeLabel}
          </span>
        ) : null}

        {academicSummary.titleLabel ? (
          <span className="hidden min-w-0 truncate 2xl:inline">
            {academicSummary.titleLabel}
          </span>
        ) : null}

        {academicCount > 1 ? (
          <span className="ml-auto shrink-0 text-[10px] font-bold text-indigo-700">
            +{academicCount - 1}
          </span>
        ) : null}
      </div>
    ) : null}

    {day.location ? (
      <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-black/10 px-2 py-1.5 font-semibold">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{day.location}</span>
      </div>
    ) : null}

    {day.attending ? (
      <div className="flex min-w-0 items-center gap-1.5 rounded-xl bg-black/10 px-2 py-1.5 font-semibold">
        <UserRound className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{day.attending}</span>
      </div>
    ) : null}
  </div>

  <div className="mt-auto pt-3">
    {day.rotationPill ? (
      <div
        className={`flex min-w-0 max-w-full items-center gap-1.5 overflow-hidden rounded-xl px-2 py-1.5 text-[11px] font-semibold xl:text-xs ${getRotationPillClasses(
          day.rotationColor
        )}`}
      >
        <span className="min-w-0 flex-1 truncate">{day.rotationPill}</span>
        {rotationAbbreviation && rotationAbbreviation !== day.rotationPill ? (
          <span className="hidden shrink-0 text-[10px] font-bold uppercase opacity-75 2xl:inline">
            {rotationAbbreviation}
          </span>
        ) : null}
      </div>
    ) : null}
  </div>
</div>
              </button>
            );
          })}
        </div>
      </div>

      <DayDetailsModal
  open={!!selectedDay && !!draftDay}
  onClose={() => setSelectedDay(null)}
  title="Day details"
  subtitle={draftDay ? getSecondaryLabel(draftDay) : undefined}
  dateLabel={draftDay ? formatLongDate(draftDay.date) : "—"}
  onSave={handleSaveDay}
>
  {(isEditing) =>
    draftDay ? (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {draftDay.dayCategory ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
                getCategoryTone(draftDay.dayCategory).badge
              }`}
            >
              {getCategoryTone(draftDay.dayCategory).icon}
              {getSecondaryLabel(draftDay)}
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-slate-700">
              <CalendarDays className="h-4 w-4" />
              Unplanned
            </div>
          )}

          {draftDay.hasCall ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-rose-100 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-rose-700">
              <Phone className="h-4 w-4" />
              {draftDay.callLabel ?? "Call"}
            </div>
          ) : null}

          {draftDay.rotationPill ? (
            <div
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold ${getRotationPillClasses(
                draftDay.rotationColor
              )}`}
            >
              {draftDay.rotationPill}
            </div>
          ) : null}
        </div>

        {draftDay.academicEvents?.length ? (
          <div className="rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-700" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700">
                Academic events
              </p>
            </div>

            <div className="mt-3 space-y-2">
              {draftDay.academicEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-xl border border-indigo-100 bg-white px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-950">
                        {event.title}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {[event.eventTypeName, event.startTime, event.location]
                          .filter(Boolean)
                          .join(" · ") || "Academic event"}
                      </p>
                    </div>

                    {event.isRequired ? (
                      <span className="shrink-0 rounded-full bg-indigo-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700">
                        Required
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <DetailField
            label="Title"
            icon={<Stethoscope className="h-4 w-4" />}
            value={
              isEditing ? (
                <input
                  value={draftDay.primaryLabel ?? ""}
                  onChange={(e) => updateDraft("primaryLabel", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter title"
                />
              ) : (
                draftDay.primaryLabel ?? "—"
              )
            }
          />

          <DetailField
            label="Category"
            icon={<Clock3 className="h-4 w-4" />}
            value={
              isEditing ? (
                <div className="flex flex-wrap gap-2">
                  {[
                    { value: null, label: "Unplanned" },
                    { value: "OR", label: "OR" },
                    { value: "Clinic", label: "Clinic" },
                    { value: "Custom", label: "Custom" },
                  ].map((option) => {
                    const active = draftDay.dayCategory === option.value;

                    return (
                      <button
                        key={option.label}
                        type="button"
                        onClick={() =>
                          setCategory(option.value as WeekDayCard["dayCategory"])
                        }
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
              ) : (
                getSecondaryLabel(draftDay)
              )
            }
          />

          {draftDay.dayCategory === "Custom" ? (
            <DetailField
              label="Custom title"
              icon={<Clock3 className="h-4 w-4" />}
              value={
                isEditing ? (
                  <input
                    value={draftDay.customTitle ?? ""}
                    onChange={(e) => updateDraft("customTitle", e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    placeholder="Enter custom title"
                  />
                ) : (
                  draftDay.customTitle ?? "—"
                )
              }
            />
          ) : null}

          <DetailField
            label="Location"
            icon={<MapPin className="h-4 w-4" />}
            value={
              isEditing ? (
                <input
                  value={draftDay.location ?? ""}
                  onChange={(e) => updateDraft("location", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter location"
                />
              ) : (
                draftDay.location ?? "—"
              )
            }
          />

          <DetailField
            label="Attending"
            icon={<UserRound className="h-4 w-4" />}
            value={
              isEditing ? (
                <input
                  value={draftDay.attending ?? ""}
                  onChange={(e) => updateDraft("attending", e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                  placeholder="Enter attending"
                />
              ) : (
                draftDay.attending ?? "—"
              )
            }
          />

          <DetailField
            label="Call status"
            icon={<Phone className="h-4 w-4" />}
            value={
              isEditing ? (
                <div className="space-y-3">
                  <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={draftDay.hasCall}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        updateDraft("hasCall", checked);
                        if (!checked) {
                          updateDraft("callLabel", null);
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    On call
                  </label>

                  {draftDay.hasCall ? (
                    <input
                      value={draftDay.callLabel ?? ""}
                      onChange={(e) => updateDraft("callLabel", e.target.value)}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                      placeholder="Primary Call"
                    />
                  ) : null}
                </div>
              ) : draftDay.hasCall ? (
                draftDay.callLabel ?? "Call"
              ) : (
                "Not on call"
              )
            }
          />

          <DetailField
            label="Rotation"
            icon={<Clock3 className="h-4 w-4" />}
            value={draftDay.rotationPill ?? "—"}
          />
        </div>
      </div>
    ) : null
  }
</DayDetailsModal>
    </>
  );
}
