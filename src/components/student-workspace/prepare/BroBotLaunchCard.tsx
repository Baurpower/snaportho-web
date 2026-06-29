"use client";

import { MessageSquareQuote } from "lucide-react";
import { BroBotLaunchButton } from "@/components/student-workspace/prepare/BroBotLaunchButton";
import type { GuidedWorkflowStep, WorkflowStepDefinition } from "@/components/student-workspace/prepare/types";

export function BroBotLaunchCard({
  step,
}: {
  step: WorkflowStepDefinition | GuidedWorkflowStep;
}) {
  return (
    <div className="rounded-[1.5rem] border border-sky-200 bg-sky-50 p-4">
      <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600">
        <MessageSquareQuote className="h-3.5 w-3.5" />
        BroBot Launches
      </div>
      <p className="mt-3 text-sm leading-6 text-slate-700">
        Each action carries context so the student does not start from an empty chat.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {step.brobotActions.map((action) => (
          <BroBotLaunchButton
            key={action.label}
            label={action.label}
            prompt={action.prompt}
            mode={action.mode}
            depth={action.depth}
          />
        ))}
      </div>
    </div>
  );
}
