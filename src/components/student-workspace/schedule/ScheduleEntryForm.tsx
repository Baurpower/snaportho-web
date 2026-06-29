"use client";

import { useState } from "react";
import type {
  StudentWorkspaceResolvedScheduleEntry,
  StudentWorkspaceRotation,
  StudentWorkspaceScheduleEntryType,
} from "@/lib/student-workspace/types";
import { STUDENT_WORKSPACE_SCHEDULE_ENTRY_TYPES } from "@/lib/student-workspace/types";

export function ScheduleEntryForm({
  rotations,
  initialEntry,
  defaultSpecificDate,
  saving,
  error,
  onSubmit,
  onCancel,
}: {
  rotations: StudentWorkspaceRotation[];
  initialEntry?: StudentWorkspaceResolvedScheduleEntry | null;
  defaultSpecificDate?: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: {
    title: string;
    entry_type: StudentWorkspaceScheduleEntryType;
    location: string;
    notes: string;
    weekday: string;
    specific_date: string;
    start_time: string;
    end_time: string;
    rotation_id: string;
    is_all_day: boolean;
    color_token: string;
  }) => Promise<void>;
  onCancel: () => void;
}) {
  const [weekdayValue, setWeekdayValue] = useState(
    initialEntry?.weekday !== null && initialEntry?.weekday !== undefined
      ? String(initialEntry.weekday)
      : ""
  );
  const [specificDateValue, setSpecificDateValue] = useState(
    initialEntry?.specific_date ?? defaultSpecificDate ?? ""
  );

  async function handleSubmit(formData: FormData) {
    await onSubmit({
      title: String(formData.get("title") ?? ""),
      entry_type: String(
        formData.get("entry_type") ?? "other"
      ) as StudentWorkspaceScheduleEntryType,
      location: String(formData.get("location") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      weekday: String(formData.get("weekday") ?? ""),
      specific_date: String(formData.get("specific_date") ?? ""),
      start_time: String(formData.get("start_time") ?? ""),
      end_time: String(formData.get("end_time") ?? ""),
      rotation_id: String(formData.get("rotation_id") ?? ""),
      is_all_day: formData.get("is_all_day") === "on",
      color_token: String(formData.get("color_token") ?? ""),
    });
  }

  return (
    <form action={handleSubmit} className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Weekly Schedule
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          {initialEntry ? "Update schedule entry" : "Add schedule entry"}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Title</span>
          <input
            name="title"
            defaultValue={initialEntry?.title ?? ""}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Type</span>
          <select
            name="entry_type"
            defaultValue={initialEntry?.entry_type ?? "other"}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          >
            {STUDENT_WORKSPACE_SCHEDULE_ENTRY_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Rotation link</span>
          <select
            name="rotation_id"
            defaultValue={initialEntry?.rotation_id ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          >
            <option value="">No linked rotation</option>
            {rotations.map((rotation) => (
              <option key={rotation.id} value={rotation.id}>
                {rotation.title}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Weekly weekday</span>
          <select
            name="weekday"
            value={weekdayValue}
            onChange={(event) => {
              const nextWeekdayValue = event.target.value;
              setWeekdayValue(nextWeekdayValue);
              if (nextWeekdayValue) {
                setSpecificDateValue("");
              }
            }}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          >
            <option value="">Use specific date instead</option>
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Specific date</span>
          <input
            type="date"
            name="specific_date"
            value={specificDateValue}
            onChange={(event) => {
              const nextSpecificDateValue = event.target.value;
              setSpecificDateValue(nextSpecificDateValue);
              if (nextSpecificDateValue) {
                setWeekdayValue("");
              }
            }}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Start time</span>
          <input
            type="time"
            name="start_time"
            defaultValue={initialEntry?.start_time?.slice(0, 5) ?? "08:00"}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">End time</span>
          <input
            type="time"
            name="end_time"
            defaultValue={initialEntry?.end_time?.slice(0, 5) ?? "09:00"}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Location</span>
          <input
            name="location"
            defaultValue={initialEntry?.location ?? ""}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Color token</span>
          <input
            name="color_token"
            defaultValue={initialEntry?.color_token ?? ""}
            placeholder="sky, slate, emerald"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700 sm:col-span-2">
          <input
            type="checkbox"
            name="is_all_day"
            defaultChecked={initialEntry?.is_all_day ?? false}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          All-day entry
        </label>

        <label className="block sm:col-span-2">
          <span className="mb-2 block text-sm font-semibold text-slate-700">Notes</span>
          <textarea
            name="notes"
            defaultValue={initialEntry?.notes ?? ""}
            rows={3}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? "Saving..." : initialEntry ? "Update entry" : "Save entry"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
