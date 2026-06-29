"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import type { StudentWorkspaceProfile } from "@/lib/student-workspace/types";

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => 2026 + index);

export function StudentWorkspaceProfileSettingsPanel({
  profile,
}: {
  profile: StudentWorkspaceProfile;
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [targetSpecialty, setTargetSpecialty] = useState(
    profile.target_specialty ?? ""
  );
  const [medSchoolYear, setMedSchoolYear] = useState(profile.med_school_year ?? "MS4");
  const [graduationYear, setGraduationYear] = useState(
    profile.expected_graduation_year ? String(profile.expected_graduation_year) : "2027"
  );
  const [fourthYearStartDate, setFourthYearStartDate] = useState(
    profile.fourth_year_start_date ?? ""
  );
  const [fourthYearEndDate, setFourthYearEndDate] = useState(
    profile.fourth_year_end_date ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
          target_specialty: targetSpecialty,
          med_school_year: medSchoolYear,
          expected_graduation_year: Number(graduationYear),
          fourth_year_start_date: fourthYearStartDate,
          fourth_year_end_date: fourthYearEndDate,
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update your profile.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update your profile."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
          Profile & timeline
        </p>
        <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
          Keep your setup editable, but off the main dashboard path.
        </h2>
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Display name
          </span>
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Target specialty
          </span>
          <input
            value={targetSpecialty}
            onChange={(event) => setTargetSpecialty(event.target.value)}
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
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Expected graduation year
          </span>
          <select
            value={graduationYear}
            onChange={(event) => setGraduationYear(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          >
            {YEAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
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
        <div className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Timezone
          </span>
          <div className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            {profile.timezone ?? "Auto-detected from your browser"}
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Student Workspace keeps this synced automatically so schedule and
            checklist timing stay anchored to your current location.
          </p>
        </div>

        {error ? (
          <div className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save profile settings
              </>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}
