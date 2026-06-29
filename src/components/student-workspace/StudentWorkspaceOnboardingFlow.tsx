"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import type {
  StudentWorkspaceOnboardingStep,
} from "@/lib/student-workspace/journey";
import type { StudentWorkspaceProfile } from "@/lib/student-workspace/types";

const ONBOARDING_STEPS: Array<{
  id: Exclude<StudentWorkspaceOnboardingStep, "graduation_year" | "dashboard">;
  label: string;
}> = [
  { id: "profile", label: "Profile basics" },
  { id: "timeline", label: "Fourth-year dates" },
  { id: "first_rotation", label: "First rotation" },
];

export function StudentWorkspaceOnboardingFlow({
  profile,
  step,
}: {
  profile: StudentWorkspaceProfile;
  step: Exclude<StudentWorkspaceOnboardingStep, "graduation_year" | "dashboard">;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const progressIndex = useMemo(
    () => ONBOARDING_STEPS.findIndex((item) => item.id === step),
    [step]
  );

  async function saveProfileBasics(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: String(form.get("display_name") ?? ""),
          target_specialty: String(form.get("target_specialty") ?? ""),
          med_school_year: "MS4",
          onboarding_step: "timeline",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save profile basics.");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save profile basics."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveTimeline(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/student-workspace/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fourth_year_start_date: String(form.get("fourth_year_start_date") ?? ""),
          fourth_year_end_date: String(form.get("fourth_year_end_date") ?? ""),
          onboarding_step: "first_rotation",
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to save fourth-year dates.");
      }
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save fourth-year dates."
      );
    } finally {
      setSaving(false);
    }
  }

  async function saveFirstRotation(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);

    try {
      const rotationResponse = await fetch("/api/student-workspace/rotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: String(form.get("title") ?? ""),
          institution: String(form.get("institution") ?? ""),
          location: String(form.get("location") ?? ""),
          start_date: String(form.get("start_date") ?? ""),
          end_date: String(form.get("end_date") ?? ""),
          is_away_rotation: form.get("is_away_rotation") === "on",
          service: null,
          notes: null,
        }),
      });
      const rotationPayload = await rotationResponse.json();
      if (!rotationResponse.ok) {
        throw new Error(rotationPayload?.error ?? "Unable to save your first rotation.");
      }

      const onboardingResponse = await fetch("/api/student-workspace/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          onboarding_completed: true,
          onboarding_step: "dashboard",
        }),
      });
      const onboardingPayload = await onboardingResponse.json();
      if (!onboardingResponse.ok) {
        throw new Error(
          onboardingPayload?.error ?? "Unable to finish Student Workspace setup."
        );
      }

      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to finish Student Workspace setup."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto grid max-w-3xl gap-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-800">
              <Sparkles className="h-3.5 w-3.5" />
              Guided setup
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">
              Let&apos;s set up your fourth-year home base.
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              One step at a time. We&apos;ll get your profile, year timeline, and first
              rotation in place before you drop into the dashboard.
            </p>
          </div>
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">
            Step {progressIndex + 1} of {ONBOARDING_STEPS.length}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {ONBOARDING_STEPS.map((item, index) => {
            const isActive = item.id === step;
            const isComplete = index < progressIndex;
            return (
              <div
                key={item.id}
                className={`rounded-[1.5rem] border px-4 py-4 ${
                  isActive
                    ? "border-sky-200 bg-sky-50"
                    : isComplete
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-slate-200 bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div
                      className={`h-2.5 w-2.5 rounded-full ${
                        isActive ? "bg-sky-500" : "bg-slate-300"
                      }`}
                    />
                  )}
                  <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        {step === "profile" ? (
          <form onSubmit={saveProfileBasics} className="grid gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Profile basics
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Make the workspace feel like yours.
              </h2>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Display name
              </span>
              <input
                name="display_name"
                defaultValue={profile.display_name ?? ""}
                placeholder="What should we call you?"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Target specialty
              </span>
              <input
                name="target_specialty"
                defaultValue={profile.target_specialty ?? ""}
                placeholder="e.g. Orthopaedic Surgery"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
              />
            </label>
            {error ? (
              <ErrorBanner message={error} />
            ) : null}
            <SubmitButton saving={saving} label="Continue to year timeline" />
          </form>
        ) : null}

        {step === "timeline" ? (
          <form onSubmit={saveTimeline} className="grid gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Fourth-year dates
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Anchor your fourth-year window.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                These dates drive your year progress and keep rotation planning
                grounded in the right season.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Fourth-year start date
                </span>
                <input
                  type="date"
                  name="fourth_year_start_date"
                  defaultValue={profile.fourth_year_start_date ?? ""}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Fourth-year end date
                </span>
                <input
                  type="date"
                  name="fourth_year_end_date"
                  defaultValue={profile.fourth_year_end_date ?? ""}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>
            {error ? (
              <ErrorBanner message={error} />
            ) : null}
            <SubmitButton saving={saving} label="Continue to first rotation" />
          </form>
        ) : null}

        {step === "first_rotation" ? (
          <form onSubmit={saveFirstRotation} className="grid gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                First rotation
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                Add the first block on your calendar.
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Keep this light. You can refine the details later from the
                dashboard.
              </p>
            </div>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Rotation title
              </span>
              <input
                name="title"
                placeholder="e.g. Home Ortho Sub-I"
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
                  placeholder="Program or school"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  Location
                </span>
                <input
                  name="location"
                  placeholder="City or hospital"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
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
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100"
                />
              </label>
            </div>
            <label className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_away_rotation"
                className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              This is an away rotation
            </label>
            {error ? (
              <ErrorBanner message={error} />
            ) : null}
            <SubmitButton saving={saving} label="Enter Student Workspace" />
          </form>
        ) : null}
      </div>
    </section>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
      {message}
    </div>
  );
}

function SubmitButton({ saving, label }: { saving: boolean; label: string }) {
  return (
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
          {label}
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
