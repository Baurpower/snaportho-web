"use client";

import { BookOpenCheck } from "lucide-react";
import type { PreparationResource } from "@/components/student-workspace/prepare/types";

export function ResourceList({ resources }: { resources: PreparationResource[] | string[] }) {
  const normalized = resources.map((resource) =>
    typeof resource === "string" ? { label: resource } : resource
  );

  return (
    <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        <BookOpenCheck className="h-3.5 w-3.5" />
        Resources in This Step
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {normalized.map((resource) => (
          <span
            key={resource.label}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700"
          >
            {resource.label}
          </span>
        ))}
      </div>
    </div>
  );
}
