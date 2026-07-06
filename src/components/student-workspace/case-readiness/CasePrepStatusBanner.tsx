"use client";

import type { StudentCasePrepContext } from "@/lib/student-curriculum/student-caseprep-context";

export function CasePrepStatusBanner({
  context,
}: {
  context: StudentCasePrepContext;
}) {
  const tone =
    context.status === "certified"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : context.status === "available"
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className={`rounded-[1.25rem] border px-4 py-3 ${tone}`}>
      <p className="text-sm font-semibold">
        {context.status === "certified"
          ? "Certified CasePrep content loaded"
          : context.status === "available"
            ? "CasePrep registry content available"
            : "Curriculum-based preparation"}
      </p>
      <p className="mt-1 text-sm leading-6">{context.message}</p>
    </section>
  );
}