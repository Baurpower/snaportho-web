"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Settings2, Sparkles } from "lucide-react";
import type { StudentWorkspaceProfile } from "@/lib/student-workspace/types";

type StudentWorkspaceEmptyStateProps = {
  profile: StudentWorkspaceProfile;
};

export function StudentWorkspaceEmptyState({
  profile,
}: StudentWorkspaceEmptyStateProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [medSchoolYear, setMedSchoolYear] = useState(
    profile.med_school_year ?? ""
  );
  const [targetSpecialty, setTargetSpecialty] = useState(
    profile.target_specialty ?? ""
  );
  const [fourthYearStartDate, setFourthYearStartDate] = useState(
    profile.fourth_year_start_date ?? ""
  );
  const [fourthYearEndDate, setFourthYearEndDate] = useState(
    profile.fourth_year_end_date ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editing, setEditing] = useState(!profile.onboarding_completed);
  const [error, setError] = useState<string | null>(null);
  const hasConfiguredDates = !!fourthYearStartDate && !!fourthYearEndDate;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: displayName,
          med_school_year: medSchoolYear,
          target_specialty: targetSpecialty,
          fourth_year_start_date: fourthYearStartDate,
          fourth_year_end_date: fourthYearEndDate,
          onboarding_completed: true,
          onboarding_step: "phase_2_rotations_ready",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Failed to save your workspace");
      }

      setSaved(true);
      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save your workspace"
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-8 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
          {profile.onboarding_completed ? (
            <Settings2 className="h-5 w-5" />
          ) : (
            <Sparkles className="h-5 w-5" />
          )}
        </div>

        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Student Profile
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">
            Keep your workspace grounded in your year
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Add the personal details and fourth-year dates that power your
            progress view. This stays user-owned and separate from the resident
            Workspace data model.
          </p>
        </div>
      </div>

      {saved ? (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Your Student Workspace profile has been updated.</p>
        </div>
      ) : null}

      <div className="mt-5 flex flex-col items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 text-sm leading-6 text-slate-600">
          {hasConfiguredDates
            ? "Fourth-year timeline is configured."
            : "Add your fourth-year start and end dates to unlock year progress."}
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing((current) => !current);
            setSaved(false);
            setError(null);
          }}
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100 sm:min-h-0 sm:w-auto"
        >
          <Settings2 className="h-4 w-4" />
          {editing ? "Hide profile form" : "Edit profile"}
        </button>
      </div>

      {editing ? (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Display name
            </span>
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="What should we call you?"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Med school year
            </span>
            <input
              value={medSchoolYear}
              onChange={(event) => setMedSchoolYear(event.target.value)}
              placeholder="e.g. MS4"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block sm:col-span-2">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Target specialty
            </span>
            <input
              value={targetSpecialty}
              onChange={(event) => setTargetSpecialty(event.target.value)}
              placeholder="e.g. Orthopaedic Surgery"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Fourth-year start date
            </span>
            <input
              type="date"
              value={fourthYearStartDate}
              onChange={(event) => setFourthYearStartDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Fourth-year end date
            </span>
            <input
              type="date"
              value={fourthYearEndDate}
              onChange={(event) => setFourthYearEndDate(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
            />
          </label>

          {error ? (
            <div className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save profile"
              )}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}
