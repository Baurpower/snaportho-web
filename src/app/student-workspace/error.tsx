"use client";

import Link from "next/link";

export default function StudentWorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <section className="rounded-[2rem] border border-rose-200 bg-white p-6 shadow-sm sm:p-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">
          Student Workspace
        </p>
        <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
          Something went wrong
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          We could not load this workspace view. Your account data is still
          safe — try again or return to Prepare.
        </p>
        {error.message ? (
          <p className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {error.message}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Try again
          </button>
          <Link
            href="/student-workspace/prepare"
            className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
          >
            Back to Prepare
          </Link>
        </div>
      </section>
    </div>
  );
}