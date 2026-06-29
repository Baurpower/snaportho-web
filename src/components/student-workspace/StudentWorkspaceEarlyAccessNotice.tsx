"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Clock3, Loader2, Sparkles } from "lucide-react";
import { STUDENT_WORKSPACE_EARLY_ACCESS_YEAR } from "@/lib/student-workspace/journey";

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => 2026 + index);

export function StudentWorkspaceEarlyAccessNotice({
  expectedGraduationYear,
}: {
  expectedGraduationYear: number;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [year, setYear] = useState(String(expectedGraduationYear));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveYear() {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expected_graduation_year: Number(year),
        }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to update graduation year.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to update graduation year."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
          <Clock3 className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
            <Sparkles className="h-3.5 w-3.5" />
            Early Access
          </div>
          <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
            Student Workspace is currently exclusive to the Class of {STUDENT_WORKSPACE_EARLY_ACCESS_YEAR}.
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Based on your expected graduation year, your access will open when
            your fourth year approaches. We’re intentionally rolling this out to
            one class first so the experience feels sharp from day one.
          </p>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Come back next spring. We’re excited to have you.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm text-slate-600">
          Your current expected graduation year is{" "}
          <span className="font-semibold text-slate-950">
            {expectedGraduationYear}
          </span>
          .
        </p>
      </div>

      {editing ? (
        <div className="mt-5 grid gap-4 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
          <label className="block">
            <span className="mb-2 block text-sm font-semibold text-slate-700">
              Update graduation year
            </span>
            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              {YEAR_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {error ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void saveYear()}
              disabled={saving}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save graduation year"
              )}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setError(null);
                setYear(String(expectedGraduationYear));
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={() => router.push("/")}
          className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Got it
        </button>
        <button
          type="button"
          onClick={() => setEditing((current) => !current)}
          className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          {editing ? "Hide update form" : "Update graduation year"}
        </button>
      </div>
    </section>
  );
}
