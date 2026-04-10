"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  MapPin,
  Phone,
  Stethoscope,
  UserRound,
  Clock3,
  CalendarDays,
} from "lucide-react";
import DayDetailsModal from "@/components/workspace/shared/daydetailsmodal";

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

function getCategoryTone(category: WeekDayCard["dayCategory"]) {
  if (category === "OR") {
    return {
      card: "border-slate-300 bg-slate-200 text-slate-900",
      badge: "bg-slate-800 text-white",
      icon: <Stethoscope className="h-4 w-4 shrink-0" />,
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
      <div className="mt-6 overflow-x-auto pb-2">
        <div className="flex min-w-[980px] gap-4">
          {orderedDays.map((day) => {
            const tone = getCategoryTone(day.dayCategory);
            const isToday = day.date === todayKey;
            const title = getDisplayTitle(day);
            const secondaryLabel = getSecondaryLabel(day);

            return (
              <button
                key={`${day.dayKey}-${day.date}`}
                type="button"
                onClick={() => setSelectedDay(day)}
                className={`relative min-h-[250px] flex-1 rounded-[1.5rem] border p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${tone.card} ${
                  isToday ? "ring-2 ring-slate-900/10" : ""
                }`}
              >
                <div className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">
                        {day.dayKey}
                      </p>
                      <p className="mt-1 text-lg font-bold">
                        {formatShortDate(day.date)}
                      </p>
                    </div>

                    <div className="flex min-h-[56px] flex-col items-end gap-2">
                      {day.hasCall ? (
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-rose-600 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] text-white shadow-sm">
                          <Phone className="h-3.5 w-3.5" />
                          {day.callLabel ?? "Call"}
                        </div>
                      ) : (
                        <div className="h-[34px]" />
                      )}

                      {day.dayCategory ? (
                        <div
                          className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] ${tone.badge}`}
                        >
                          {tone.icon}
                          {secondaryLabel}
                        </div>
                      ) : (
                        <div className="h-[34px]" />
                      )}
                    </div>
                  </div>

                  <div className="mt-8 min-h-[72px]">
                    <p className="line-clamp-2 text-xl font-bold tracking-tight">
                      {title}
                    </p>
                  </div>

                  <div className="mt-4 min-h-[56px] space-y-2">
                    {day.location ? (
                      <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/10 px-3 py-1.5 text-xs font-semibold">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{day.location}</span>
                      </div>
                    ) : null}

                    {day.attending ? (
                      <div className="inline-flex max-w-full items-center gap-2 rounded-full bg-black/10 px-3 py-1.5 text-xs font-semibold">
                        <UserRound className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{day.attending}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-auto pt-5">
                    {day.rotationPill ? (
                      <div
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${getRotationPillClasses(
                          day.rotationColor
                        )}`}
                      >
                        <Clock3 className="h-3.5 w-3.5" />
                        {day.rotationPill}
                      </div>
                    ) : (
                      <div className="h-[34px]" />
                    )}
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
                    <Clock3 className="h-4 w-4" />
                    {draftDay.rotationPill}
                  </div>
                ) : null}
              </div>

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
                                setCategory(
                                  option.value as WeekDayCard["dayCategory"]
                                )
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