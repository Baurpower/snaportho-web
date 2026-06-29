"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { BroBotLaunchCard } from "@/components/student-workspace/prepare/BroBotLaunchCard";
import { ResourceList } from "@/components/student-workspace/prepare/ResourceList";
import { WorkflowProgress } from "@/components/student-workspace/prepare/WorkflowProgress";
import type { WorkflowStepDefinition } from "@/components/student-workspace/prepare/types";

export function WorkflowStepper({
  title,
  subtitle,
  steps,
  activeStepIndex,
  completedStepIds,
  onSelectStep,
  onToggleStepComplete,
}: {
  title: string;
  subtitle: string;
  steps: WorkflowStepDefinition[];
  activeStepIndex: number;
  completedStepIds: Set<string>;
  onSelectStep: (index: number) => void;
  onToggleStepComplete: (stepId: string) => void;
}) {
  const activeStep = steps[activeStepIndex] ?? null;
  const completeCount = steps.filter((step) => completedStepIds.has(step.id)).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.68fr_1.32fr]">
      <div className="space-y-6">
        <WorkflowProgress
          title={title}
          subtitle={subtitle}
          currentStep={Math.min(activeStepIndex + 1, Math.max(steps.length, 1))}
          totalSteps={steps.length}
          completeCount={completeCount}
        />

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {steps.map((step, index) => {
              const complete = completedStepIds.has(step.id);
              const active = index === activeStepIndex;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onSelectStep(index)}
                  className={`flex w-full items-start gap-3 rounded-[1.25rem] border px-4 py-4 text-left transition ${
                    active
                      ? "border-slate-950 bg-slate-950 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <div className="pt-0.5">
                    {complete ? (
                      <CheckCircle2 className={active ? "h-5 w-5 text-sky-200" : "h-5 w-5 text-emerald-600"} />
                    ) : (
                      <Circle className={active ? "h-5 w-5 text-sky-200" : "h-5 w-5 text-slate-400"} />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${active ? "text-sky-200" : "text-slate-500"}`}>
                      Step {index + 1}
                    </p>
                    <h4 className="mt-1 text-base font-bold tracking-tight">
                      {step.title}
                    </h4>
                    <p className={`mt-1 text-sm leading-6 ${active ? "text-slate-200" : "text-slate-600"}`}>
                      {step.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {activeStep ? (
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Active Step
          </p>
          <h3 className="mt-2 text-3xl font-black tracking-tight text-slate-950">
            {activeStep.title}
          </h3>
          <p className="mt-3 text-sm leading-7 text-slate-600 sm:text-base">
            {activeStep.description}
          </p>
          <div className="mt-4 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
            Estimated time: {activeStep.estimatedMinutes} min
          </div>

          <div className="mt-6 space-y-4">
            <ResourceList resources={activeStep.resources} />
            <BroBotLaunchCard step={activeStep} />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onToggleStepComplete(activeStep.id)}
              className={`inline-flex rounded-full px-5 py-3 text-sm font-semibold transition ${
                completedStepIds.has(activeStep.id)
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100"
                  : "bg-slate-950 text-white hover:bg-slate-800"
              }`}
            >
              {completedStepIds.has(activeStep.id)
                ? "Mark as Not Done"
                : "Complete Step"}
            </button>
            {activeStepIndex < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => onSelectStep(activeStepIndex + 1)}
                className="inline-flex rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                Next Step
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
