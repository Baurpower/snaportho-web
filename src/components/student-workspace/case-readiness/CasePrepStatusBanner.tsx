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
      : context.status === "preview"
        ? "border-violet-200 bg-violet-50 text-violet-900"
      : context.status === "fallback"
        ? "border-sky-200 bg-sky-50 text-sky-900"
        : context.status === "clarification"
          ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-slate-200 bg-slate-50 text-slate-700";

  return (
    <section className={`rounded-[1.25rem] border px-4 py-3 ${tone}`}>
      <p className="text-sm font-semibold">
        {context.status === "certified"
          ? "Curated Case Prep"
          : context.status === "preview"
            ? "CasePrep v1.1 Preview"
          : context.status === "fallback"
            ? "AI-assisted fallback"
            : context.status === "clarification"
              ? "Choose an approach"
              : "Case not yet available"}
      </p>
      <p className="mt-1 text-sm leading-6">{context.message}</p>
    </section>
  );
}
