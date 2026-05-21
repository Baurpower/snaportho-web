"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  FileText,
  Loader2,
  PlaneTakeoff,
  ShieldPlus,
  UserRound,
} from "lucide-react";

type TimeOffType = "vacation" | "conference" | "sick" | "personal" | "other";

type Props = {
  defaultStartDate: string;
  onSaved?: () => void | Promise<void>;
};

const EVENT_TYPE_OPTIONS: Array<{
  value: TimeOffType;
  label: string;
}> = [
  { value: "vacation", label: "Vacation" },
  { value: "conference", label: "Conference" },
  { value: "sick", label: "Sick" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

function formatDateLabel(dateString: string) {
  return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getDayCount(startDate: string, endDate: string) {
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / msPerDay) + 1;
}

function getTypeTone(eventType: TimeOffType) {
  if (eventType === "conference") {
    return {
      chip: "bg-violet-600 text-white",
      preview: "border-violet-200 bg-violet-50",
    };
  }

  if (eventType === "vacation") {
    return {
      chip: "bg-sky-600 text-white",
      preview: "border-sky-200 bg-sky-50",
    };
  }

  if (eventType === "sick") {
    return {
      chip: "bg-rose-600 text-white",
      preview: "border-rose-200 bg-rose-50",
    };
  }

  if (eventType === "other") {
    return {
      chip: "bg-amber-500 text-white",
      preview: "border-amber-200 bg-amber-50",
    };
  }

  return {
    chip: "bg-slate-950 text-white",
    preview: "border-slate-200 bg-slate-50",
  };
}

export default function AddIndividualTimeOffView({
  defaultStartDate,
  onSaved,
}: Props) {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(defaultStartDate);
  const [eventType, setEventType] = useState<TimeOffType>("personal");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  const hasValidRange = Boolean(startDate && endDate && endDate >= startDate);
  const totalDays = hasValidRange ? getDayCount(startDate, endDate) : 0;
  const tone = getTypeTone(eventType);
  const canSave = hasValidRange && !saving;

  const previewLabel = useMemo(
    () => EVENT_TYPE_OPTIONS.find((option) => option.value === eventType)?.label ?? "Personal",
    [eventType]
  );

  async function handleSave() {
    if (!canSave) return;

    try {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      const response = await fetch("/api/program/time-off", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startDate,
          endDate,
          eventType,
          title: title.trim() || null,
          notes: notes.trim() || null,
          approvalStatus: "requested",
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error ?? "Failed to save time off")
            : "Failed to save time off"
        );
      }

      setSuccessMessage(
        `Saved ${previewLabel.toLowerCase()} request for ${formatDateLabel(startDate)}${
          startDate === endDate ? "" : ` to ${formatDateLabel(endDate)}`
        }.`
      );
      setStartDate(defaultStartDate);
      setEndDate(defaultStartDate);
      setEventType("personal");
      setTitle("");
      setNotes("");

      await onSaved?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save time off");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[1.8rem] border border-slate-200 bg-white p-5 shadow-xl md:p-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
              Individual Add
            </p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
              Add your own time off
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Create a single request with a clean date range, request type, and
              optional details. Personal entries stay request-based by default.
            </p>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700">
            <UserRound className="h-3.5 w-3.5" />
            Requested by default
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarDays className="h-4 w-4" />
                  Start date
                </span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>

              <label className="space-y-2">
                <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <CalendarRange className="h-4 w-4" />
                  End date
                </span>
                <input
                  type="date"
                  min={startDate}
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-slate-700">Type</p>
              <div className="flex flex-wrap gap-2">
                {EVENT_TYPE_OPTIONS.map((option) => {
                  const active = eventType === option.value;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setEventType(option.value)}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        active
                          ? tone.chip
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <PlaneTakeoff className="h-4 w-4" />
                Title
              </span>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Optional short title"
                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>

            <label className="space-y-2">
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700">
                <FileText className="h-4 w-4" />
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                placeholder="Optional notes"
                className="w-full rounded-[1rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </label>
          </div>

          <div className="space-y-4">
            <div className={`rounded-[1.5rem] border p-4 ${tone.preview}`}>
              <p className="text-sm font-semibold text-slate-900">Preview</p>

              <div className="mt-4 grid gap-3 text-sm text-slate-700">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Type
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">{previewLabel}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Range
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">
                    {hasValidRange
                      ? `${formatDateLabel(startDate)}${
                          startDate === endDate ? "" : ` - ${formatDateLabel(endDate)}`
                        }`
                      : "Choose a valid date range"}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Total days
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">{totalDays}</p>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
                    Status
                  </p>
                  <p className="mt-1 font-semibold text-slate-950">Requested</p>
                </div>
              </div>
            </div>

            {!hasValidRange ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                End date must be the same day or later than the start date.
              </div>
            ) : null}

            {error ? (
              <div className="rounded-[1rem] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}

            {successMessage ? (
              <div className="rounded-[1rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                <span className="inline-flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  {successMessage}
                </span>
              </div>
            ) : null}

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave}
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ShieldPlus className="h-4 w-4" />
              )}
              {saving ? "Saving..." : "Submit time-off request"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
