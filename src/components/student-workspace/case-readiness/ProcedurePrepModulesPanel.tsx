"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { ProcedurePrepModule } from "@/lib/student-curriculum/procedure-prep-modules";

export function ProcedurePrepModulesPanel({
  modules,
}: {
  modules: ProcedurePrepModule[];
}) {
  const [expandedIds, setExpandedIds] = useState<string[]>(
    modules[0] ? [modules[0].id] : []
  );

  if (modules.length === 0) {
    return null;
  }

  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        Procedure Preparation
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
        Comprehensive case preparation modules
      </h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">
        Expand only the sections you need tonight. Each module is scoped for
        operative preparation without overwhelming the page.
      </p>

      <div className="mt-5 grid gap-3">
        {modules.map((module) => {
          const expanded = expandedIds.includes(module.id);
          return (
            <div
              key={module.id}
              className="rounded-[1.25rem] border border-slate-200 bg-slate-50"
            >
              <button
                type="button"
                onClick={() =>
                  setExpandedIds((current) =>
                    current.includes(module.id)
                      ? current.filter((id) => id !== module.id)
                      : [...current, module.id]
                  )
                }
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
              >
                <div>
                  <h3 className="text-base font-black tracking-tight text-slate-950">
                    {module.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">{module.summary}</p>
                </div>
                <ChevronDown
                  className={`h-5 w-5 shrink-0 text-slate-500 transition ${
                    expanded ? "rotate-180" : ""
                  }`}
                />
              </button>

              {expanded ? (
                <div className="border-t border-slate-200 px-4 py-4">
                  <ul className="space-y-2">
                    {module.bullets.map((bullet) => (
                      <li
                        key={bullet}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm leading-6 text-slate-700"
                      >
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}