"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, Save } from "lucide-react";
import type { StudentWorkspaceProfile } from "@/lib/student-workspace/types";

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => 2026 + index);

/**
 * Phone version of the profile & timeline form.
 *
 * Two differences that matter on a real device: every control is a single
 * full-width row (the desktop two-column grid halves each field to ~160px), and
 * inputs are 16px so iOS Safari does not zoom the viewport on focus.
 */
export function MobileProfileSettings({
  profile,
}: {
  profile: StudentWorkspaceProfile;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");
  const [targetSpecialty, setTargetSpecialty] = useState(
    profile.target_specialty ?? ""
  );
  const [medSchoolYear, setMedSchoolYear] = useState(
    profile.med_school_year ?? "MS4"
  );
  const [graduationYear, setGraduationYear] = useState(
    profile.expected_graduation_year
      ? String(profile.expected_graduation_year)
      : "2027"
  );
  const [fourthYearStartDate, setFourthYearStartDate] = useState(
    profile.fourth_year_start_date ?? ""
  );
  const [fourthYearEndDate, setFourthYearEndDate] = useState(
    profile.fourth_year_end_date ?? ""
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSaved(false);
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

      setSaved(true);
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
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex min-h-14 w-full items-center justify-between gap-3 px-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Profile &amp; timeline
          </span>
          <span className="block truncate text-[15px] font-bold tracking-tight text-slate-950">
            Edit your setup
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open ? (
        <form
          onSubmit={handleSubmit}
          className="grid gap-3 border-t border-slate-200 px-4 py-4"
        >
          <MobileField label="Display name" htmlFor="mobile-display-name">
            <input
              id="mobile-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              autoComplete="name"
              className={MOBILE_INPUT_CLASS}
            />
          </MobileField>

          <MobileField label="Target specialty" htmlFor="mobile-target-specialty">
            <input
              id="mobile-target-specialty"
              value={targetSpecialty}
              onChange={(event) => setTargetSpecialty(event.target.value)}
              className={MOBILE_INPUT_CLASS}
            />
          </MobileField>

          <MobileField label="Med school year" htmlFor="mobile-med-school-year">
            <input
              id="mobile-med-school-year"
              value={medSchoolYear}
              onChange={(event) => setMedSchoolYear(event.target.value)}
              className={MOBILE_INPUT_CLASS}
            />
          </MobileField>

          <MobileField
            label="Expected graduation year"
            htmlFor="mobile-graduation-year"
          >
            <select
              id="mobile-graduation-year"
              value={graduationYear}
              onChange={(event) => setGraduationYear(event.target.value)}
              className={MOBILE_INPUT_CLASS}
            >
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </MobileField>

          <MobileField label="Fourth-year start" htmlFor="mobile-fourth-year-start">
            <input
              id="mobile-fourth-year-start"
              type="date"
              value={fourthYearStartDate}
              onChange={(event) => setFourthYearStartDate(event.target.value)}
              className={MOBILE_INPUT_CLASS}
            />
          </MobileField>

          <MobileField label="Fourth-year end" htmlFor="mobile-fourth-year-end">
            <input
              id="mobile-fourth-year-end"
              type="date"
              value={fourthYearEndDate}
              onChange={(event) => setFourthYearEndDate(event.target.value)}
              className={MOBILE_INPUT_CLASS}
            />
          </MobileField>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-slate-700">
              Timezone
            </p>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-3 text-[15px] text-slate-700">
              {profile.timezone ?? "Auto-detected from your browser"}
            </div>
            <p className="mt-1.5 text-[12px] leading-5 text-slate-500">
              Kept in sync automatically so schedule and checklist timing follow
              your current location.
            </p>
          </div>

          {error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] text-rose-700">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={saving}
            className="mt-1 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-[15px] font-semibold text-white transition active:bg-slate-800 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <Check className="h-4 w-4" />
                Saved
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save profile settings
              </>
            )}
          </button>
        </form>
      ) : null}
    </section>
  );
}

export const MOBILE_INPUT_CLASS =
  "h-12 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-[16px] text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100";

export function MobileField({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-[13px] font-semibold text-slate-700"
      >
        {label}
      </label>
      {children}
    </div>
  );
}
