"use client";

import type { StudentWorkspaceRotationFormValues } from "@/lib/student-workspace/types";

type RotationFormProps = {
  initialValues: StudentWorkspaceRotationFormValues;
  submitLabel: string;
  saving: boolean;
  error: string | null;
  onSubmit: (values: StudentWorkspaceRotationFormValues) => Promise<void>;
  onCancel?: () => void;
  cancelLabel?: string;
};

export function RotationForm({
  initialValues,
  submitLabel,
  saving,
  error,
  onSubmit,
  onCancel,
  cancelLabel = "Cancel",
}: RotationFormProps) {
  async function handleSubmit(formData: FormData) {
    await onSubmit({
      title: String(formData.get("title") ?? ""),
      institution: String(formData.get("institution") ?? ""),
      service: String(formData.get("service") ?? ""),
      location: String(formData.get("location") ?? ""),
      start_date: String(formData.get("start_date") ?? ""),
      end_date: String(formData.get("end_date") ?? ""),
      notes: String(formData.get("notes") ?? ""),
      is_away_rotation: formData.get("is_away_rotation") === "on",
    });
  }

  return (
    <form
      action={handleSubmit}
      className="grid gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Rotation Details
        </p>
        <h3 className="mt-2 text-xl font-bold tracking-tight text-slate-950">
          Add or update a fourth-year block
        </h3>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Title
        </span>
        <input
          name="title"
          defaultValue={initialValues.title}
          placeholder="e.g. Home Ortho Sub-I"
          required
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Institution
          </span>
          <input
            name="institution"
            defaultValue={initialValues.institution}
            placeholder="Medical school or program"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Service
          </span>
          <input
            name="service"
            defaultValue={initialValues.service}
            placeholder="e.g. Trauma"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Location
          </span>
          <input
            name="location"
            defaultValue={initialValues.location}
            placeholder="Clinic, hospital, city"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <input
            type="checkbox"
            name="is_away_rotation"
            defaultChecked={initialValues.is_away_rotation}
            className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          Away rotation
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Start date
          </span>
          <input
            type="date"
            name="start_date"
            defaultValue={initialValues.start_date}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            End date
          </span>
          <input
            type="date"
            name="end_date"
            defaultValue={initialValues.end_date}
            required
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">
          Notes
        </span>
        <textarea
          name="notes"
          defaultValue={initialValues.notes}
          rows={4}
          placeholder="Goals, reminders, or key contacts for this block"
          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
        />
      </label>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Saving..." : submitLabel}
        </button>

        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
          >
            {cancelLabel}
          </button>
        ) : null}
      </div>
    </form>
  );
}
