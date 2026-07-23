"use client";

import type { ClarificationEvent } from "@/lib/caseprep-v1-1/stream-schema";

export function ClarificationPrompt({
  clarification,
  onChoose,
}: {
  clarification: ClarificationEvent;
  onChoose: (prompt: string) => void;
}) {
  const options = clarification.options.filter((option) => option.prompt || option.label);
  return (
    <div className="rounded-[1.75rem] border border-sky-200 bg-sky-50/60 p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-sky-700">
        One more detail
      </p>
      <h2 className="mt-1.5 text-xl font-black tracking-tight text-slate-950">
        {clarification.clarification_reason}
      </h2>
      {options.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {options.map((option) => {
            const label = option.label ?? option.prompt ?? "";
            return (
              <button
                key={label}
                type="button"
                onClick={() => onChoose(option.prompt ?? label)}
                className="rounded-full border border-teal-300 bg-white px-4 py-2 text-sm font-semibold text-teal-800 hover:bg-teal-50"
              >
                {label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
