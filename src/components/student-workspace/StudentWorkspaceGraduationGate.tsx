"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, GraduationCap, Loader2 } from "lucide-react";

const YEAR_OPTIONS = Array.from({ length: 8 }, (_, index) => 2026 + index);

export function StudentWorkspaceGraduationGate({
  initialYear,
}: {
  initialYear: number | null;
}) {
  const router = useRouter();
  const [year, setYear] = useState(
    initialYear ? String(initialYear) : String(2027)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const helperCopy = useMemo(
    () =>
      year === "2027"
        ? "Perfect. Student Workspace is currently opening for your class first."
        : "We’ll use this to decide when your fourth-year access opens.",
    [year]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
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
        throw new Error(payload?.error ?? "Unable to save your graduation year.");
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your graduation year."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
        <GraduationCap className="h-5 w-5" />
      </div>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Early Access
      </p>
      <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
        When do you graduate medical school?
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Student Workspace is rolling out class by class. We only need your
        expected graduation year right now so we can route you into the right
        experience.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">
            Expected graduation year
          </span>
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
          >
            {YEAR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {helperCopy}
        </div>

        {error ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              Continue
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </section>
  );
}
